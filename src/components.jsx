import { House, CalendarDays, ScanLine, TrendingUp, User, X } from "lucide-react";
import { pctOf } from "./lib";

export function Ring({ value, goal, size = 230, stroke = 30, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(pctOf(value, goal) / 100, 1);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F8D3B8" />
            <stop offset="100%" stopColor="#EC9466" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F7E9DE" strokeWidth={stroke} />
        <circle
          className="ring-fg"
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

export function MiniRing({ pct, size = 52, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(pct, 100));
  return (
    <div className="mini-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EFE7E0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#EC9466" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span>{Math.round(pct)}%</span>
    </div>
  );
}

export function MealCard({ meal, goal, onDelete }) {
  const time = new Date(meal.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <div className="meal-card">
      {meal.thumb ? <img src={meal.thumb} alt="" className="meal-thumb" /> : <div className="meal-thumb" />}
      <div className="grow">
        <div className="meal-label">{meal.label} · {time}</div>
        <div className="meal-kcal">{Math.round(meal.totals.calories)} kcal</div>
        <div className="meal-foods">{meal.foods.join(", ")}</div>
      </div>
      <MiniRing pct={pctOf(meal.totals.calories, goal)} size={48} />
      {onDelete && (
        <button className="meal-del" onClick={() => onDelete(meal.id)} aria-label="Delete meal">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

const TABS = [
  { id: "home", icon: House, label: "Home" },
  { id: "history", icon: CalendarDays, label: "History" },
  { id: "scan", icon: ScanLine, label: "Scan", center: true },
  { id: "insights", icon: TrendingUp, label: "Insights" },
  { id: "profile", icon: User, label: "Profile" },
];

export function NavBar({ tab, setTab }) {
  return (
    <nav className="navbar">
      {TABS.map(({ id, icon: Icon, label, center }) => (
        <button
          key={id}
          className={`nav-btn ${center ? "nav-center" : ""} ${tab === id ? "active" : ""}`}
          onClick={() => setTab(id)}
          aria-label={label}
        >
          <Icon size={center ? 28 : 22} />
        </button>
      ))}
    </nav>
  );
}