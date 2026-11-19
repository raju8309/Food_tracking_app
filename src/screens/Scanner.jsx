import { useEffect, useState } from "react";
import {
  ChevronLeft, Bookmark, Camera, Image as ImageIcon, ScanLine,
  RotateCcw, Flame, Minus, Plus, X,
} from "lucide-react";
import { MiniRing } from "../components";
import {
  OIL_OPTIONS, MACROS, toEditable, itemNutrients, sumMeal, mealLabel,
  resizeImage, canvasToBlob, analyzePhoto, lookupFood, pctOf, API_URL, USE_MOCK,
} from "../lib";

export default function Scanner({ goals, onBack, onSave }) {
  const [preview, setPreview] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [items, setItems] = useState(null);
  const [oil, setOil] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState(null);

  // Wake up the GPU as soon as the scanner opens (while the user takes the photo)
  useEffect(() => {
    if (!USE_MOCK) fetch(`${API_URL}/health`).catch(() => {});
  }, []);

  async function handlePhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    setItems(null);
    setError(null);
    setLoading(true);
    const slowTimer = setTimeout(() => setSlow(true), 8000);
    try {
      const big = await resizeImage(file, 1280);
      const small = await resizeImage(file, 200);
      setPreview(big.toDataURL("image/jpeg", 0.85));
      setThumb(small.toDataURL("image/jpeg", 0.7));

      const data = await analyzePhoto(await canvasToBlob(big));
      const foods = data.items.filter((i) => !i.food.startsWith("cooking oil"));
      setItems(foods.map(toEditable));
      setOil(foods.length !== data.items.length ? 2 : 0);
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setLoading(false);
    }
  }

  function reset() {
    setPreview(null);
    setItems(null);
    setError(null);
  }

  function changeGrams(index, delta) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, grams: Math.max(10, it.grams + delta) } : it))
    );
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function renameItem(index, newName) {
    const name = newName.trim();
    if (!name || name === items[index].food) return;
    try {
      const fresh = await lookupFood(name, items[index].grams);
      setItems((prev) =>
        prev.map((it, i) => {
          if (i !== index) return it;
          const alternatives = it.alternatives.filter((a) => a !== name);
          return fresh
            ? { ...toEditable(fresh), alternatives }
            : { ...it, food: name, alternatives };
        })
      );
    } catch (err) {
      setError(err.message);
    }
  }

  function save() {
    if (!items || items.length === 0) return;
    const now = Date.now();
    onSave({
      id: now,
      ts: now,
      label: mealLabel(new Date()),
      thumb,
      foods: items.map((it) => it.food),
      totals: sumMeal(items, oil),
    });
  }

  const total = items ? sumMeal(items, oil) : null;

  return (
    <div className="page">
      <header className="topbar">
        <button className="square-btn" onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>
        <h1 className="title">Scanner</h1>
        <button className="square-btn" onClick={save} disabled={!items} aria-label="Save meal">
          <Bookmark size={20} />
        </button>
      </header>

      <div className="scan-frame">
        <span className="corner tl" /><span className="corner tr" />
        <span className="corner bl" /><span className="corner br" />

        {preview ? (
          <img src={preview} alt="your meal" className="scan-photo" />
        ) : (
          <div className="scan-empty">
            <Camera size={42} strokeWidth={1.5} />
            <p>Point your camera at your plate</p>
          </div>
        )}

        {loading && <div className="scan-line" />}

        {items && (
          <div className="tags">
            {items.slice(0, 3).map((it, i) => (
              <span key={i} className={`tag t${i}`}>
                <i />{it.food} · {it.unknown ? "?" : Math.round(itemNutrients(it).calories)}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <p className="center muted">
          {slow ? "Waking up the AI… the first scan can take up to a minute ☕" : "Analyzing your meal…"}
        </p>
      )}
      {error && <div className="card error-card">⚠️ {error}</div>}

      {!items && !loading && (
        <div className="scan-actions">
          <label className="round-btn" aria-label="Choose from gallery">
            <ImageIcon size={24} />
            <input type="file" accept="image/*" onChange={handlePhoto} hidden />
          </label>
          <label className="round-btn big" aria-label="Take photo">
            <ScanLine size={30} />
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} hidden />
          </label>
          <button className="round-btn" onClick={reset} aria-label="Start over">
            <RotateCcw size={22} />
          </button>
        </div>
      )}

      {items && (
        <>
          <h2 className="dish-title">{items[0] ? items[0].food : "Your meal"}</h2>

          <div className="card total-row">
            <div className="icon-bubble"><Flame size={20} /></div>
            <div className="grow">
              <b>{Math.round(total.calories)} kcal</b>
              <span className="muted small">Total calories · this meal</span>
            </div>
            <MiniRing pct={pctOf(total.calories, goals.calories)} />
          </div>

          <div className="macro-row">
            {MACROS.map((m) => (
              <div key={m.key} className="macro">
                <div className="macro-label">{m.label}</div>
                <div className="macro-val">{Math.round(total[m.key])}g</div>
                <div className="bar">
                  <div style={{ width: `${Math.min(pctOf(total[m.key], goals[m.key]), 100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>

          <p className="hint">Tap a name to fix it · − / + for portions</p>

          {items.map((it, i) => (
            <div key={i} className={`card edit-item ${it.unknown ? "unknown" : ""}`}>
              <div className="item-top">
                <input
                  key={it.food}
                  className="item-name"
                  defaultValue={it.food}
                  onBlur={(e) => renameItem(i, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                />
                <span className="item-cal">
                  {it.unknown ? "❓ fix name" : `${Math.round(itemNutrients(it).calories)} kcal`}
                </span>
              </div>

              {it.matched && <div className="matched">≈ {it.matched}</div>}

              {it.alternatives.length > 0 && (
                <div className="alts">
                  <span className="muted small">Maybe:</span>
                  {it.alternatives.map((alt) => (
                    <button key={alt} onClick={() => renameItem(i, alt)}>{alt}</button>
                  ))}
                </div>
              )}

              <div className="item-controls">
                <div className="stepper">
                  <button onClick={() => changeGrams(i, -25)} aria-label="Less"><Minus size={18} /></button>
                  <span>{it.grams} g</span>
                  <button onClick={() => changeGrams(i, 25)} aria-label="More"><Plus size={18} /></button>
                </div>
                <button className="square-btn small-btn" onClick={() => removeItem(i)} aria-label="Remove">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}

          <div className="card">
            <p className="oil-label">Cooking oil?</p>
            <div className="segmented">
              {OIL_OPTIONS.map((o, idx) => (
                <button key={o.label} className={idx === oil ? "active" : ""} onClick={() => setOil(idx)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <button className="primary-btn" onClick={save} disabled={items.length === 0}>
            Add to today
          </button>
          <button className="text-btn" onClick={reset}>Scan another meal</button>
        </>
      )}
    </div>
  );
}
