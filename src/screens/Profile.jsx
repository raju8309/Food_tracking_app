import { useState } from "react";
import { LogOut, Trash2, Plus, X } from "lucide-react";
import { dayStreak } from "../lib";

const GOAL_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

const EMPTY_FOOD = {
  name: "", serving: "1 slice", serving_grams: "",
  calories: "", protein_g: "", carbs_g: "", fat_g: "",
};

export default function Profile({
  profile, setProfile, meals, email, myFoods, onAddFood, onDeleteFood, onReset, onLogout,
}) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const daysTracked = new Set(meals.map((m) => new Date(m.ts).toDateString())).size;

  const setGoal = (key, value) =>
    setProfile((p) => ({ ...p, goals: { ...p.goals, [key]: Math.max(0, Number(value) || 0) } }));

  async function saveFood(e) {
    e.preventDefault();
    setSaving(true);
    const num = (v) => (v === "" ? 0 : Number(v));
    const ok = await onAddFood({
      name: form.name.trim(),
      serving: form.serving.trim() || "1 serving",
      serving_grams: form.serving_grams === "" ? null : Number(form.serving_grams),
      calories: num(form.calories),
      protein_g: num(form.protein_g),
      carbs_g: num(form.carbs_g),
      fat_g: num(form.fat_g),
    });
    setSaving(false);
    if (ok) setForm(null);
  }

  const field = (key, label, type = "number") => (
    <label className="food-field">
      <span>{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step="any"
        value={form[key]}
        required={key === "name" || key === "calories"}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="square-btn ghost" />
        <h1 className="title">Profile</h1>
        <div className="square-btn ghost" />
      </header>

      <section className="card profile-card">
        <div className="profile-top">
          <div className="avatar lg">{profile.name ? profile.name[0].toUpperCase() : "��"}</div>
          <div className="grow">
            <input
              className="name-edit"
              value={profile.name}
              placeholder="Your name"
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
            <span className="muted small">{email}</span>
          </div>
        </div>
        <div className="stats">
          <div><b>{meals.length}</b><span>Meals logged</span></div>
          <div><b>{daysTracked}</b><span>Days tracked</span></div>
          <div><b>{dayStreak(meals)}</b><span>Day streak</span></div>
        </div>
      </section>

      <div className="section-head"><h2>Daily goals</h2></div>
      <section className="card">
        {GOAL_FIELDS.map((f) => (
          <div key={f.key} className="goal-row">
            <span>{f.label}</span>
            <div className="goal-input">
              <input
                type="number"
                inputMode="numeric"
                value={profile.goals[f.key]}
                onChange={(e) => setGoal(f.key, e.target.value)}
              />
              <small>{f.unit}</small>
            </div>
          </div>
        ))}
      </section>

      <div className="section-head">
        <h2>My foods</h2>
        {!form && (
          <button className="add-link" onClick={() => setForm(EMPTY_FOOD)}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>
      <p className="muted small food-hint">
        Save foods you eat often, from their label. Scans will use your exact values.
      </p>

      {form && (
        <form className="card food-form" onSubmit={saveFood}>
          {field("name", "Name (e.g. bread (my brand))", "text")}
          <div className="food-grid">
            {field("serving", "Serving", "text")}
            {field("serving_grams", "Serving grams (optional)")}
            {field("calories", "Calories")}
            {field("protein_g", "Protein (g)")}
            {field("carbs_g", "Carbs (g)")}
            {field("fat_g", "Fat (g)")}
          </div>
          <div className="food-actions">
            <button type="button" className="text-btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save food"}</button>
          </div>
        </form>
      )}

      {myFoods.length === 0 && !form ? (
        <div className="card empty-small muted small">No saved foods yet</div>
      ) : (
        myFoods.map((f) => (
          <div key={f.id} className="card food-row">
            <div className="grow">
              <b>{f.name}</b>
              <span className="muted small">
                {f.serving}{f.serving_grams ? ` (${f.serving_grams} g)` : ""} · {Math.round(f.calories)} kcal
                {" "}· P {f.protein_g}g · C {f.carbs_g}g · F {f.fat_g}g
              </span>
            </div>
            <button className="square-btn small-btn" onClick={() => onDeleteFood(f.id)} aria-label="Delete food">
              <X size={16} />
            </button>
          </div>
        ))
      )}

      <button className="logout-btn" onClick={onLogout}>
        <LogOut size={18} /> Log out
      </button>

      <button
        className="danger-btn"
        onClick={() => {
          if (window.confirm("Delete all logged meals? This cannot be undone.")) onReset();
        }}
      >
        <Trash2 size={18} /> Clear meal history
      </button>
    </div>
  );
}
