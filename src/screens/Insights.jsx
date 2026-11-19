import { Flame, Drumstick, Trophy, CalendarCheck } from "lucide-react";
import { addTotals, isSameDay, dayStreak } from "../lib";

export default function Insights({ meals, goals }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayMeals = meals.filter((m) => isSameDay(m.ts, d));
    return { d, totals: addTotals(dayMeals), logged: dayMeals.length > 0 };
  });

  const max = Math.max(goals.calories, ...days.map((x) => x.totals.calories), 1);
  const logged = days.filter((x) => x.logged);
  const avg = (key) =>
    logged.length ? logged.reduce((s, x) => s + x.totals[key], 0) / logged.length : 0;

  return (
    <div className="page">
      <header className="topbar">
        <div className="square-btn ghost" />
        <h1 className="title">Insights</h1>
        <div className="square-btn ghost" />
      </header>

      <section className="card">
        <div className="cal-head">
          <div className="icon-bubble"><Flame size={20} /></div>
          <div>
            <div className="h3">This week</div>
            <div className="muted small">Calories per day</div>
          </div>
        </div>

        <div className="chart">
          <div className="goal-line" style={{ bottom: `${(goals.calories / max) * 100}%` }}>
            <span>Goal</span>
          </div>
          {days.map((x, i) => (
            <div key={i} className="chart-col">
              <div
                className={`chart-bar ${i === 6 ? "today" : ""}`}
                style={{ height: `${x.logged ? Math.max((x.totals.calories / max) * 100, 3) : 0}%` }}
              />
            </div>
          ))}
        </div>
        <div className="chart-labels">
          {days.map((x, i) => (
            <span key={i} className={i === 6 ? "peach" : ""}>
              {x.d.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          ))}
        </div>
      </section>

      <div className="stat-grid">
        <div className="card stat"><Flame size={18} className="peach" /><b>{Math.round(avg("calories"))}</b><span>avg kcal / day</span></div>
        <div className="card stat"><Drumstick size={18} className="peach" /><b>{Math.round(avg("protein_g"))}g</b><span>avg protein / day</span></div>
        <div className="card stat"><Trophy size={18} className="peach" /><b>{dayStreak(meals)}</b><span>day streak</span></div>
        <div className="card stat"><CalendarCheck size={18} className="peach" /><b>{logged.length}/7</b><span>days logged</span></div>
      </div>
    </div>
  );
}