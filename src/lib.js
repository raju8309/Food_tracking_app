export const USE_MOCK = false;
export const API_URL = "https://raju8309--food-tracker-web.us-east.modal.run";

export const DEFAULT_GOALS = { calories: 2000, protein_g: 120, carbs_g: 250, fat_g: 65 };
export const NUTRIENTS = ["calories", "protein_g", "fat_g", "carbs_g"];

export const MACROS = [
  { key: "protein_g", label: "Protein", color: "#EC9466" },
  { key: "carbs_g", label: "Carbs", color: "#F4C27A" },
  { key: "fat_g", label: "Fat", color: "#A9C3B0" },
];

export const OIL_OPTIONS = [
  { label: "None", calories: 0, fat_g: 0 },
  { label: "Less", calories: 60, fat_g: 7 },
  { label: "Normal", calories: 120, fat_g: 14 },
  { label: "More", calories: 240, fat_g: 28 },
];

const MOCK_RESULT = {
  items: [
    { food: "egg curry", matched: "Egg curry", alternatives: ["egg masala", "aloo curry"], grams: 200, calories: 290, protein_g: 17, fat_g: 9, carbs_g: 38 },
    { food: "white rice", matched: "Rice, white, cooked", alternatives: ["jeera rice", "pulao"], grams: 250, calories: 325, protein_g: 6.7, fat_g: 0.7, carbs_g: 70 },
  ],
  cooked_with_oil: true,
};

export const pctOf = (value, goal) => (goal ? (value / goal) * 100 : 0);

export function emptyTotals() {
  return { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 };
}

export function toEditable(item) {
  const per_g = {};
  for (const k of NUTRIENTS) {
    per_g[k] = item.grams && !item.error ? (item[k] || 0) / item.grams : 0;
  }
  return {
    food: item.food,
    grams: item.grams || 100,
    per_g,
    unknown: !!item.error,
    alternatives: item.alternatives || [],
    matched: item.matched || "",
  };
}

export function itemNutrients(item) {
  const out = {};
  for (const k of NUTRIENTS) out[k] = item.per_g[k] * item.grams;
  return out;
}

export function sumMeal(items, oilIdx) {
  const t = emptyTotals();
  for (const it of items) {
    const n = itemNutrients(it);
    for (const k of NUTRIENTS) t[k] += n[k];
  }
  t.calories += OIL_OPTIONS[oilIdx].calories;
  t.fat_g += OIL_OPTIONS[oilIdx].fat_g;
  return t;
}

export function addTotals(meals) {
  const t = emptyTotals();
  for (const m of meals) for (const k of NUTRIENTS) t[k] += m.totals[k];
  return t;
}

export function mealLabel(date) {
  const h = date.getHours();
  if (h < 11) return "Breakfast";
  if (h < 16) return "Lunch";
  if (h < 19) return "Snack";
  return "Dinner";
}

export const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
export const isToday = (ts) => isSameDay(ts, Date.now());

export function dayStreak(meals) {
  const days = new Set(meals.map((m) => new Date(m.ts).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
}

export async function resizeImage(file, maxSide) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export const canvasToBlob = (canvas) =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));

// Read the server's error message (e.g. "Model error: ...") instead of a generic one
async function readError(res) {
  let detail = `Server error ${res.status}`;
  try {
    detail = (await res.json()).detail || detail;
  } catch {
    /* response was not JSON */
  }
  return new Error(detail);
}

export async function analyzePhoto(blob) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1500));
    return MOCK_RESULT;
  }
  const form = new FormData();
  form.append("image", blob, "meal.jpg");
  const res = await fetch(`${API_URL}/analyze`, { method: "POST", body: form });
  if (!res.ok) throw await readError(res);
  return res.json();
}

export async function lookupFood(food, grams) {
  if (USE_MOCK) return null;
  const res = await fetch(`${API_URL}/nutrition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ food, grams }] }),
  });
  if (!res.ok) throw await readError(res);
  const data = await res.json();
  return data.items[0];
}