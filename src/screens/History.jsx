import { MealCard } from "../components";
import { addTotals } from "../lib";

function dayName(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

export default function History({ meals, goal, onDelete }) {
  const groups = [];
  for (const m of meals) {
    const key = new Date(m.ts).toDateString();
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, ts: m.ts, meals: [] };
      groups.push(g);
    }
    g.meals.push(m);
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="square-btn ghost" />
        <h1 className="title">History</h1>
        <div className="square-btn ghost" />
      </header>

      {groups.length === 0 && (
        <div className="card empty">
          <div className="empty-emoji">📅</div>
          <p><b>Nothing logged yet</b></p>
          <p className="muted small">Your meals will show up here</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key}>
          <div className="day-head">
            <span>{dayName(g.ts)}</span>
            <span className="peach">{Math.round(addTotals(g.meals).calories).toLocaleString()} kcal</span>
          </div>
          {g.meals.map((m) => <MealCard key={m.id} meal={m} goal={goal} onDelete={onDelete} />)}
        </section>
      ))}
    </div>
  );
}