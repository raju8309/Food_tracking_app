import os
import re
from functools import lru_cache

import requests

USDA_KEY = os.environ.get("USDA_KEY", "DEMO_KEY")
SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

NUTRIENT_IDS = {
    1008: "calories", 2047: "calories", 2048: "calories",
    1003: "protein_g", 1004: "fat_g", 1005: "carbs_g",
}

LOCAL_FOODS = {
    "coffee":       {"calories": 1, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 0.0},
    "black coffee": {"calories": 1, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 0.0},
    "tea":          {"calories": 1, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.2},
}


def words(text):
    return set(re.findall(r"[a-z]+", text.lower()))


def stems(text):
    return {w.rstrip("s") for w in words(text)}


def head_word(text):
    ws = re.findall(r"[a-z]+", text.lower())
    return ws[-1].rstrip("s") if ws else ""


def is_branded(description):
    return any(w.isupper() and len(w) > 2 for w in re.findall(r"[A-Za-z]+", description))


def score(query, description):
    q, d = stems(query), stems(description)
    overlap = len(q & d) / len(q)
    head_bonus = 0.5 if head_word(query) in d else 0.0
    return overlap + head_bonus - 0.02 * len(words(description))


@lru_cache(maxsize=1000)
def search_usda(food_name):
    body = {
        "query": food_name,
        "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        "pageSize": 15,
    }
    resp = requests.post(SEARCH_URL, params={"api_key": USDA_KEY}, json=body, timeout=10)
    resp.raise_for_status()
    return resp.json().get("foods", [])


def lookup_nutrition(food_name, min_overlap=0.5):
    key = food_name.lower().strip()
    if not key:
        return None
    if key in LOCAL_FOODS:
        return {"matched": f"local: {key}", "per_100g": LOCAL_FOODS[key]}

    try:
        foods = search_usda(key)
    except requests.RequestException as e:
        print(f"USDA lookup failed for '{key}': {e}")
        return None

    foods = [f for f in foods if not is_branded(f["description"])]
    if not foods:
        return None

    best = max(foods, key=lambda f: score(key, f["description"]))
    d = stems(best["description"])
    if head_word(key) not in d:
        return None
    if len(stems(key) & d) / len(stems(key)) < min_overlap:
        return None

    per_100g = {"calories": 0.0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0}
    for n in best.get("foodNutrients", []):
        name = NUTRIENT_IDS.get(n.get("nutrientId"))
        if name and per_100g[name] == 0.0:
            per_100g[name] = n.get("value", 0.0)
    return {"matched": best["description"], "per_100g": per_100g}


OIL_WORDS = {"fried", "sauteed", "stir", "oil", "roasted"}


def calculate_meal(data):
    totals = {"calories": 0.0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0}
    results = []
    oil_already_counted = False

    for item in data["items"]:
        info = lookup_nutrition(item["food"])
        if info is None:
            results.append({"food": item["food"], "grams": item["grams"],
                            "error": "no good match - ask user"})
            continue
        if words(info["matched"]) & OIL_WORDS:
            oil_already_counted = True

        scale = item["grams"] / 100
        nutrients = {k: round(v * scale, 1) for k, v in info["per_100g"].items()}
        for k in totals:
            totals[k] += nutrients[k]
        results.append({"food": item["food"], "matched": info["matched"],
                        "grams": item["grams"], **nutrients})

    if data.get("cooked_with_oil") and not oil_already_counted:
        totals["calories"] += 120
        totals["fat_g"] += 14
        results.append({"food": "cooking oil (1 tbsp estimate)", "calories": 120, "fat_g": 14})

    return results, {k: round(v, 1) for k, v in totals.items()}
