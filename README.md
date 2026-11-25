# 🍽️ Food Tracker — Snap a photo, get calories & macros

Take a photo of your meal → the app identifies each food, estimates portions, and shows calories, protein, carbs and fat. Daily logs are saved per user.

**Live demo:** [[your-vercel-link-here](https://foodtrackingapp-psi.vercel.app/)]

---

## ✨ Features

- 📸 **Photo → nutrition** — open-source vision model identifies foods and estimates grams
- 🥗 **Per-item breakdown** — calories + P·C·F for every item, with "Maybe" alternatives to correct mistakes
- 🍞 **My Foods** — save your own products from the nutrition label (e.g. 1 slice bread = 60 kcal, 3 g protein); they override the AI estimate
- 🛢️ **Oil adjustment** — add cooking oil manually instead of guessing
- 🔐 **Login + cloud storage** — email/password auth; meals, goals and My Foods are stored per user
- 📊 **Dashboard, history & insights** — daily rings, macro goals, streaks
- 💸 **Low cost** — serverless GPU scales to zero, so you only pay while a photo is being analyzed

---

## 🏗️ Architecture

```
React (Vite) app ──photo──▶ FastAPI on Modal (serverless GPU)
      │                         │
      │                         ├─ Qwen2.5-VL-7B-Instruct → foods + grams (JSON)
      │                         └─ USDA FoodData Central → nutrients per 100 g
      │
      └──▶ Supabase (Postgres + Auth, Row Level Security)
```

| Layer | Tech |
|---|---|
| Vision model | Qwen2.5-VL-7B-Instruct (bf16, Hugging Face Transformers) |
| Backend | Python, FastAPI |
| GPU hosting | Modal (L4 / A10G / L40S fallback, scale-to-zero, cached weights on a Volume) |
| Nutrition data | USDA FoodData Central API (Foundation, SR Legacy, FNDDS) |
| Frontend | React + Vite, lucide-react |
| Auth & DB | Supabase (Postgres, RLS) |
| Frontend hosting | Vercel (auto-deploy from GitHub) |

---

## 📏 Accuracy (evaluated, not guessed)

Measured on the **Nutrition5k** test split (30 plates) with `eval_baseline.py`. Every change is re-run against this eval before it ships.

| Version | Change | Calorie MAE | Mass MAE |
|---|---|---|---|
| v1 | Baseline | 133 kcal | 51 g |
| v2 | Unbiased prompt + stricter food matching | 92 kcal | 23 g |
| v3 | Removed auto-oil, reject oil/dressing mismatches | 44 kcal | 23 g |
| v4 | Piece-counting prompt (**regression — reverted**) | 90 kcal | 109 g |
| v5 | Counting only for breads/rotis/eggs | **45 kcal** | **36 g** |

**Known limits:** restaurant food tends to be underestimated (hidden oil/butter). Use My Foods for exact values.

---

## 📁 Project structure

```
food-tracker-web/
├── src/
│   ├── App.jsx          # auth session, data loading, handlers
│   ├── lib.js           # API calls, nutrient math, image resize
│   ├── db.js            # Supabase queries
│   ├── components.jsx   # Ring, MealCard, NavBar
│   ├── screens/         # Onboarding, Login, Dashboard, Scanner, History, Insights, Profile
│   └── App.css
└── food-tracker-api/
    ├── modal_app.py     # Modal deployment (GPU, volume, secrets)
    ├── server.py        # FastAPI: /health, /analyze, /nutrition
    ├── vision.py        # Qwen2.5-VL loading + prompt
    ├── nutrition.py     # USDA lookup, matching, meal totals
    └── eval_baseline.py # Nutrition5k evaluation
```

---

## 🚀 Run it yourself

### 1. Backend (Modal)

```bash
cd food-tracker-api
python -m venv .venv && source .venv/bin/activate
pip install modal
modal setup

# USDA API key (free: https://fdc.nal.usda.gov/api-key-signup)
modal secret create usda USDA_KEY=<your-key>

# download model weights once into the volume
modal run modal_app.py::download_model

# deploy
modal deploy modal_app.py
```

### 2. Database (Supabase)

Create a project, then create the `meals`, `profiles` and `my_foods` tables with RLS policies so each user only sees their own rows.

### 3. Frontend

```bash
npm install
```

Create `.env.local` (never commit this):

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Set `API_URL` in `src/lib.js` to your Modal URL, then:

```bash
npm run dev
```

### 4. Evaluate

```bash
cd food-tracker-api
python eval_baseline.py 30
```

---

## 🔒 Security notes

- API keys live in Modal Secrets / env vars — never in code
- Only the Supabase **anon** key is used in the frontend; RLS protects every table
- `.env.local` is gitignored

---

## 🛣️ Roadmap

- [ ] Indian-food test set (curries, rice dishes)
- [ ] Fine-tune the vision model on portion data
- [ ] Restaurant mode (+20–30% buffer for hidden fats)
- [ ] PWA / Android build

---

Built by **Raju (Yuvaraj M C)** · [rajukotturi.com](https://rajukotturi.com) · [GitHub](https://github.com/raju8309)