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
NUTRIENT_KEYS = ["calories", "protein_g", "fat_g", "carbs_g"]

LOCAL_FOODS = {
    "coffee":       {"calories": 1, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 0.0},
    "black coffee": {"calories": 1, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 0.0},
    "tea":          {"calories": 1, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.2},
}

STOP_WORDS = {"with", "and", "of", "in", "on", "the", "a", "an", "style"}
# Words that change calories a lot. Penalize them unless the user's food name has them.
PREP_WORDS = {"fried", "creamed", "breaded", "battered", "tapenade", "dressing", "sauce",
              "sweetened", "canned", "stuffed", "glazed", "candied", "dried", "pickled",
              "luncheon", "meatless"}
# Pure fats: never match these unless the food name itself says so
REJECT_WORDS = {"oil", "dressing", "shortening", "lard", "margarine"}
COOK_WORDS = {"cooked", "boiled", "steamed", "roasted", "grilled", "fried", "sauteed",
              "baked", "scrambled", "stir", "curry", "masala"}


def words(text):
    return set(re.findall(r"[a-z]+", text.lower()))


def stems(text):
    return {w.rstrip("s") for w in words(text) if w not in STOP_WORDS}


def is_branded(description):
    return any(w.isupper() and len(w) > 2 for w in re.findall(r"[A-Za-z]+", description))


def score(query, description):
    q, d = stems(query), stems(description)
    s = len(q & d) / len(q)
    s -= 0.3 * len(({w.rstrip("s") for w in PREP_WORDS} & d) - q)   # surprise prep words
    if not (q & {w.rstrip("s") for w in COOK_WORDS}) and "raw" in d:
        s += 0.2                                                     # plain food -> prefer raw
    s -= 0.02 * len(words(description))                              # prefer simple names
    return s


@lru_cache(maxsize=1000)
def search_usda(food_name):
    body = {
        "query": food_name,
        "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        "pageSize": 25,
    }
    resp = requests.post(SEARCH_URL, params={"api_key": USDA_KEY}, json=body, timeout=10)
    resp.raise_for_status()
    return resp.json().get("foods", [])


def lookup_nutrition(food_name):
    key = food_name.lower().strip()
    if not key or not stems(key):
        return None
    if key in LOCAL_FOODS:
        return {"matched": f"local: {key}", "per_100g": LOCAL_FOODS[key]}

    try:
        foods = search_usda(key)
    except requests.RequestException as e:
        print(f"USDA lookup failed for '{key}': {e}")
        return None

    # Every word of the food name must appear (no more "strawberry salad" -> "Beef salad")
    q = stems(key)
    candidates = [f for f in foods
                  if not is_branded(f["description"]) and q <= stems(f["description"])
                  and not ((words(f["description"]) & REJECT_WORDS) - words(key))]
    if not candidates:
        return None

    best = max(candidates, key=lambda f: score(key, f["description"]))
    per_100g = {k: 0.0 for k in NUTRIENT_KEYS}
    for n in best.get("foodNutrients", []):
        name = NUTRIENT_IDS.get(n.get("nutrientId"))
        if name and per_100g[name] == 0.0:
            per_100g[name] = n.get("value", 0.0)
    return {"matched": best["description"], "per_100g": per_100g}


def from_ingredients(ingredients):
    sums = {k: 0.0 for k in NUTRIENT_KEYS}
    matched_grams = 0.0
    used = []
    for ing in ingredients or []:
        grams = float(ing.get("grams") or 0)
        if grams <= 0:
            continue
        info = lookup_nutrition(ing.get("name", ""))
        if info is None:
            continue
        for k in NUTRIENT_KEYS:
            sums[k] += info["per_100g"][k] * grams / 100
        matched_grams += grams
        used.append(ing["name"])
    if matched_grams == 0:
        return None
    per_100g = {k: v * 100 / matched_grams for k, v in sums.items()}
    return {"matched": "from ingredients: " + ", ".join(used), "per_100g": per_100g}


def lookup_item(item):
    """Dish name -> its ingredients -> alternative names."""
    info = lookup_nutrition(item.get("food", ""))
    if info:
        return info
    info = from_ingredients(item.get("ingredients"))
    if info:
        return info
    for alt in item.get("alternatives") or []:
        info = lookup_nutrition(alt)
        if info:
            return info
    return None


def calculate_meal(data):
    totals = {k: 0.0 for k in NUTRIENT_KEYS}
    results = []
    seen = set()

    for item in data["items"]:
        name = item.get("food", "").lower().strip()
        if name in seen:            # same food listed twice -> skip the copy
            continue
        seen.add(name)

        info = lookup_item(item)
        if info is None:
            results.append({"food": item["food"], "grams": item["grams"],
                            "error": "no good match - ask user"})
            continue

        scale = item["grams"] / 100
        nutrients = {k: round(v * scale, 1) for k, v in info["per_100g"].items()}
        for k in totals:
            totals[k] += nutrients[k]
        results.append({"food": item["food"], "matched": info["matched"],
                        "grams": item["grams"], **nutrients})

    # No automatic oil: cooked USDA dishes already include fat, and the app has oil buttons.
    return results, {k: round(v, 1) for k, v in totals.items()}
