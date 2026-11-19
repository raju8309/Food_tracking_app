import os
os.environ.setdefault("HF_HOME", "/workspace/hf_cache")

import json
import threading
import torch
from transformers import AutoModelForImageTextToText, AutoProcessor
from qwen_vl_utils import process_vision_info

MODEL_ID = "Qwen/Qwen2.5-VL-7B-Instruct"

FOOD_PROMPT = """You are an expert in Indian and international food. Look at this food image.

Return ONLY valid JSON, no other text, in exactly this format:
{
  "items": [
    {
      "food": "<most likely specific dish name>",
      "alternatives": ["<2nd most likely dish>", "<3rd most likely dish>"],
      "grams": <estimated weight as integer>,
      "confidence": "<high|medium|low>"
    }
  ],
  "cooked_with_oil": <true or false>
}

How to identify curries and gravies:
- First look for visible pieces: egg, chicken, paneer, potato, chickpeas, fish, mutton.
- Then look at the gravy: yellow and runny = dal; thick dark brown/red = masala curry;
  orange and creamy = butter/makhani style; green = palak/spinach based.
- Name the dish by its main piece + style, e.g. "egg curry", "chicken curry", "dal tadka".

Rules:
- One entry per distinct food or drink item. Ignore plates, pans, utensils, and packaging.
- Include drinks (juice, smoothie, coffee, tea, soda) as items too.
- Be specific: "white rice" not "rice", "chicken sandwich" not "sandwich".
- alternatives must be 2 OTHER dishes that look similar, most likely first.
- Estimate grams for the portion visible. For drinks, estimate ml as grams.
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
