"""Send Nutrition5k plates to our live API and measure how far off we are."""
import io
import json
import sys

import requests
from datasets import load_dataset

API = "https://raju8309--food-tracker-web.us-east.modal.run"
N = int(sys.argv[1]) if len(sys.argv) > 1 else 30

# "test" = photos the model has never seen (fair exam)
ds = load_dataset("mmathys/food-nutrients", revision="refs/convert/parquet", split="test", streaming=True)

cal_errors, mass_errors, rows = [], [], []
for i, ex in enumerate(ds):
    if i >= N:
        break

    # Turn the dataset image into a JPEG file in memory
    buf = io.BytesIO()
    ex["image"].convert("RGB").save(buf, "JPEG")
    buf.seek(0)

    # Send it to our live app, same as a user scan
    try:
        r = requests.post(f"{API}/analyze",
                          files={"image": ("meal.jpg", buf, "image/jpeg")}, timeout=300)
    except requests.RequestException as e:
        print(f"{i}: request failed: {e}")
        continue
    if r.status_code != 200:
        print(f"{i}: error {r.status_code}: {r.text[:100]}")
        continue
    data = r.json()

    # Compare app answer vs real answer
    pred_cal = data["totals"]["calories"]
    pred_mass = sum(it.get("grams", 0) for it in data["items"] if "grams" in it)
    true_cal = ex["total_calories"]
    true_mass = ex["total_mass"]

    cal_errors.append(abs(pred_cal - true_cal))
    mass_errors.append(abs(pred_mass - true_mass))
    rows.append({
        "id": ex["id"],
        "true_cal": round(true_cal), "pred_cal": round(pred_cal),
        "true_mass": round(true_mass), "pred_mass": round(pred_mass),
        "true_foods": [ing["name"] for ing in ex["ingredients"]],
        "pred_foods": [it["food"] for it in data["items"]],
        "matched": [it.get("matched", it.get("error", "")) for it in data["items"]],
    })
    print(f"{i}: calories true {true_cal:.0f} vs pred {pred_cal:.0f} | "
          f"grams true {true_mass:.0f} vs pred {pred_mass:.0f}")

# Save every plate so we can see WHERE it went wrong
with open("baseline_results.jsonl", "w") as f:
    for row in rows:
        f.write(json.dumps(row) + "\n")

n = len(cal_errors)
if n == 0:
    print("No successful results. Check the API URL and that Modal is deployed.")
    sys.exit(1)

avg_true = sum(r["true_cal"] for r in rows) / n
print(f"\n=== BASELINE ({n} plates) ===")
print(f"Calories: off by {sum(cal_errors)/n:.0f} kcal on average "
      f"({100*sum(cal_errors)/n/avg_true:.0f}% of a typical plate)")
print(f"Grams:    off by {sum(mass_errors)/n:.0f} g on average")
print("Details saved to baseline_results.jsonl")
