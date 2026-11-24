import os
os.environ.setdefault("HF_HOME", "/workspace/hf_cache")

import json
import threading
import torch
from transformers import AutoModelForImageTextToText, AutoProcessor
from qwen_vl_utils import process_vision_info

MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"

FOOD_PROMPT = """You are a food recognition expert. Look at this food image.

Return ONLY valid JSON, no other text, in exactly this format:
{
  "items": [
    {
      "food": "<name of what you see>",
      "alternatives": ["<2nd most likely>", "<3rd most likely>"],
      "grams": <estimated weight of this item as integer>,
      "ingredients": [
        {"name": "<simple raw ingredient>", "grams": <integer>}
      ],
      "confidence": "<high|medium|low>"
    }
  ],
  "cooked_with_oil": <true or false>
}

How to name food:
- Name exactly what you see, in plain words: "olives", "steamed broccoli",
  "scrambled eggs", "grilled chicken breast", "white rice", "avocado".
- Use a named dish (e.g. "paneer butter masala", "dal tadka", "biryani", "dosa")
  ONLY if you clearly see that dish. Never guess a dish name for plain food.
- If the plate has separate foods, list each one separately.
  Write "celery" and "olives", not "olives with celery".
- List each food only once.

Grams:
- Estimate carefully. A dinner plate is about 26 cm wide, a bowl about 15 cm.
- Give your best exact guess (e.g. 35, 140). Do not round to 50 or 100.

Ingredients:
- Main raw ingredients of each item with grams, plain names USDA knows:
  "onion", "potato", "white rice", "egg", "chicken breast", "vegetable oil", "ghee".
- Include cooking fat (oil, ghee, butter) only if the food is clearly cooked in it.

Rules:
- Ignore plates, bowls, utensils, packaging. Include drinks.
- Skip tiny garnishes and whole spices.
"""

print("Loading model...")
model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID, dtype=torch.bfloat16, device_map="auto"
)
processor = AutoProcessor.from_pretrained(MODEL_ID)
print("Model loaded!")

gpu_lock = threading.Lock()


def ask_food(image_path, prompt=FOOD_PROMPT, max_pixels=1024 * 28 * 28):
    messages = [{
        "role": "user",
        "content": [
            {"type": "image", "image": image_path, "max_pixels": max_pixels},
            {"type": "text", "text": prompt},
        ],
    }]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(text=[text], images=image_inputs, videos=video_inputs,
                       padding=True, return_tensors="pt").to(model.device)
    with gpu_lock:
        output = model.generate(**inputs, max_new_tokens=512, do_sample=False)
    answer_ids = output[:, inputs.input_ids.shape[1]:]
    return processor.batch_decode(answer_ids, skip_special_tokens=True)[0]


def parse_json(raw_text):
    start, end = raw_text.find("{"), raw_text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(raw_text[start:end + 1])
    except json.JSONDecodeError:
        return None
