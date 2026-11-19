import { LogOut, Trash2 } from "lucide-react";
import { dayStreak } from "../lib";

const GOAL_FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein_g", label: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", unit: "g" },
];

export default function Profile({ profile, setProfile, meals, email, onReset, onLogout }) {
  const daysTracked = new Set(meals.map((m) => new Date(m.ts).toDateString())).size;

  const setGoal = (key, value) =>
    setProfile((p) => ({ ...p, goals: { ...p.goals, [key]: Math.max(0, Number(value) || 0) } }));

  return (
    <div className="page">
      <header className="topbar">
        <div className="square-btn ghost" />
        <h1 className="title">Profile</h1>
        <div className="square-btn ghost" />
      </header>

      <section className="card profile-card">
        <div className="profile-top">
          <div className="avatar lg">{profile.name ? profile.name[0].toUpperCase() : "🙂"}</div>
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
