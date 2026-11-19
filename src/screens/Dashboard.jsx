import { ArrowUpRight, Flame } from "lucide-react";
import { Ring, MealCard } from "../components";
import { MACROS, addTotals, isToday, pctOf } from "../lib";

export default function Dashboard({ meals, profile, onScan, onDelete }) {
  const { goals, name } = profile;
  const todayMeals = meals.filter((m) => isToday(m.ts));
  const t = addTotals(todayMeals);
  const now = new Date();

  return (
    <div className="page">
      <header className="topbar">
        <div className="avatar">{name ? name[0].toUpperCase() : "🙂"}</div>
        <h1 className="title">Dashboard</h1>
        <div className="square-btn date-chip">
          <span>{now.toLocaleDateString(undefined, { weekday: "short" })}</span>
          <b>{now.getDate()}</b>
        </div>
      </header>

      <button className="ai-card" onClick={onScan}>
        <div className="orb" />
        <div className="ai-text">
          <b>AI Food Tracker</b>
          <span>Hi {name || "there"}, snap a meal to log it</span>
        </div>
        <div className="ai-arrow"><ArrowUpRight size={18} /></div>
      </button>

      <section className="card">
        <div className="cal-head">
          <div className="icon-bubble"><Flame size={20} /></div>
          <div>
            <div className="h3">Calories</div>
            <div className="muted small">Today</div>
          </div>
          <div className="pct">
            {Math.round(pctOf(t.calories, goals.calories))}%<span>Goal</span>
          </div>
        </div>

        <div className="ring-wrap">
          <Ring value={t.calories} goal={goals.calories}>
            <div className="ring-num">{Math.round(t.calories).toLocaleString()}</div>
            <div className="muted">Goal {goals.calories.toLocaleString()} kcal</div>
          </Ring>
        </div>

        <div className="macro-row">
          {MACROS.map((m) => (
            <div key={m.key} className="macro">
              <div className="macro-label">{m.label}</div>
              <div className="macro-val">
                {Math.round(t[m.key])}<small>/{goals[m.key]}g</small>
              </div>
              <div className="bar">
                <div style={{ width: `${Math.min(pctOf(t[m.key], goals[m.key]), 100)}%`, background: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-head">
        <h2>Today's Meals</h2>
        <span className="muted small">{todayMeals.length} logged</span>
      </div>

      {todayMeals.length === 0 ? (
        <div className="card empty">
          <div className="empty-emoji">🍛</div>
          <p><b>No meals yet</b></p>
          <p className="muted small">Tap the scan button to log your first meal</p>
        </div>
      ) : (
        todayMeals.map((m) => <MealCard key={m.id} meal={m} goal={goals.calories} onDelete={onDelete} />)
      )}
    </div>
  );
}