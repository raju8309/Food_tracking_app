import os
import tempfile
import traceback

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vision import ask_food, parse_json
from nutrition import calculate_meal

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

app = FastAPI(title="Food Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
def analyze(image: UploadFile = File(...)):
    if not (image.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file")

    contents = image.file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB)")

    suffix = os.path.splitext(image.filename or "")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        path = tmp.name

    try:
        raw = ask_food(path)
        data = parse_json(raw)
        if data is None:
            raise HTTPException(status_code=502, detail="Model returned invalid output")

        items, totals = calculate_meal(data)
        for item, original in zip(items, data["items"]):
            item["alternatives"] = original.get("alternatives", [])

        return {
            "items": items,
            "totals": totals,
            "cooked_with_oil": data.get("cooked_with_oil"),
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")
    finally:
        os.remove(path)


class FoodItem(BaseModel):
    food: str
    grams: float


class NutritionRequest(BaseModel):
    items: list[FoodItem]


@app.post("/nutrition")
def nutrition(req: NutritionRequest):
    data = {"items": [i.model_dump() for i in req.items], "cooked_with_oil": False}
    items, totals = calculate_meal(data)
    return {"items": items, "totals": totals}
