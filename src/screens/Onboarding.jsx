import { ChevronsRight, Check } from "lucide-react";

export default function Onboarding({ onDone }) {
  return (
    <div className="onboard">
      <div className="hero-art">
        <div className="hero-plate">🥗</div>
        <span className="bubble b1">290 kcal</span>
        <span className="bubble b2">120 kcal</span>
        <span className="bubble b3">85 kcal</span>
        <span className="float f1">🍎</span>
        <span className="float f2">🥑</span>
        <span className="float f3">🍳</span>
      </div>

      <h1 className="onboard-title">
        Snap your meal,<br />know your <em>calories</em>
      </h1>
      <p className="onboard-sub">
        Point your camera at any plate. AI finds the food and counts the calories for you.
      </p>

      <div className="dots"><span /><span className="on" /><span /></div>

      <button className="start-btn" onClick={onDone}>
        <span>Get Started</span>
        <ChevronsRight size={20} />
        <span className="start-check"><Check size={20} /></span>
      </button>
    </div>
  );
}
