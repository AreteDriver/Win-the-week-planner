import { useState, useRef, useEffect } from "react";
import { DAYS, SHORT_DAYS, MEAL_TYPES, MEAL_ICONS, PALETTE, TIME_OPTIONS, DURATION_OPTIONS } from "../constants";
import { uid } from "../utils";

const V = (name) => `var(--wtw-${name})`;

const TileEditor = ({ tile, onSave, onDelete, onCancel, onDuplicate, editingDay }) => {
  const [label, setLabel] = useState(tile?.label || "");
  const [color, setColor] = useState(tile?.color || PALETTE[0]);
  const [startTime, setStartTime] = useState(tile?.startTime || "No time");
  const [duration, setDuration] = useState(tile?.duration || "No duration");
  const [type, setType] = useState(tile?.type || "task");
  const [mealType, setMealType] = useState(tile?.mealType || "Lunch");
  const [ingredients, setIngredients] = useState(tile?.ingredients || "");
  const [calories, setCalories] = useState(tile?.calories || "");
  const [protein, setProtein] = useState(tile?.protein || "");
  const [carbs, setCarbs] = useState(tile?.carbs || "");
  const [fat, setFat] = useState(tile?.fat || "");
  const [notes, setNotes] = useState(tile?.notes || "");
  const [recurring, setRecurring] = useState(tile?.recurring || false);
  const [showDupDays, setShowDupDays] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const buildTile = () => {
    const base = { ...tile, label, color, startTime, duration, type, recurring };
    // Assign a stable recurringId when recurring is toggled ON and none exists
    if (recurring && !base.recurringId) {
      base.recurringId = `rec-${uid()}`;
    }
    // Clear recurringId if recurring is toggled OFF
    if (!recurring) {
      delete base.recurringId;
    }
    if (type === "meal") {
      return { ...base, mealType, ingredients, calories, protein, carbs, fat, notes };
    }
    return base;
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
    background: V("bg-input"), border: `1px solid ${V("border")}`, borderRadius: 8, color: V("text"), outline: "none",
  };

  const labelStyle = { fontSize: 11, color: V("text-muted"), fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };

  const navBtnStyle = {
    padding: "7px 14px", borderRadius: 8, border: `1px solid ${V("border")}`,
    background: "transparent", color: V("text-secondary"), cursor: "pointer",
    fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    textTransform: "uppercase", letterSpacing: 1,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: V("overlay"), backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: V("bg-surface"), borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw",
        boxShadow: `0 25px 60px ${V("shadow")}`, border: `1px solid ${V("border")}`,
        fontFamily: "'DM Sans', sans-serif", maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: V("text-secondary"), textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
          {tile?.id ? "Edit Block" : "New Block"}
        </div>

        {/* Type toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {["task", "meal"].map((t) => (
            <button key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
              textTransform: "uppercase", letterSpacing: 1, borderRadius: 8, cursor: "pointer",
              border: type === t ? `1px solid ${V("accent")}` : `1px solid ${V("border")}`,
              background: type === t ? V("accent-dim") : "transparent",
              color: type === t ? V("accent-text") : V("text-muted"),
            }}>{t === "meal" ? "\ud83c\udf7d\ufe0f Meal" : "\u2611 Task"}</button>
          ))}
        </div>

        <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder={type === "meal" ? "Meal name..." : "What needs doing?"}
          onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) onSave(buildTile()); }}
          style={{ ...inputStyle, padding: "12px 14px", fontSize: 15, borderRadius: 10, marginBottom: 18 }}
        />

        {/* Time row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Start</div>
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Duration</div>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={inputStyle}>
              {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Meal-specific fields */}
        {type === "meal" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Meal Type</div>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={inputStyle}>
                {MEAL_TYPES.map((m) => <option key={m} value={m}>{MEAL_ICONS[m]} {m}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Ingredients</div>
              <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)}
                placeholder="chicken, rice, broccoli..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Macros (optional)</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "calories", label: "Cal", value: calories, setter: setCalories },
                  { key: "protein", label: "P(g)", value: protein, setter: setProtein },
                  { key: "carbs", label: "C(g)", value: carbs, setter: setCarbs },
                  { key: "fat", label: "F(g)", value: fat, setter: setFat },
                ].map(({ key, label: lbl, value, setter }) => (
                  <div key={key} style={{ flex: 1 }}>
                    <input type="number" placeholder={lbl} value={value} onChange={(e) => setter(e.target.value)}
                      style={{ ...inputStyle, textAlign: "center", fontSize: 12 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={labelStyle}>Notes</div>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Recipe link or notes..."
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* Recurring toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button onClick={() => setRecurring(!recurring)} style={{
            width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
            background: recurring ? V("accent") : V("border"),
            position: "relative", transition: "background 0.2s",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: 8, background: "#fff",
              position: "absolute", top: 2,
              left: recurring ? 18 : 2, transition: "left 0.2s",
            }} />
          </button>
          <span style={{ fontSize: 12, color: V("text-secondary"), fontWeight: 600 }}>
            Repeat weekly
          </span>
        </div>

        {/* Color picker */}
        <div style={labelStyle}>Color</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {PALETTE.map((p) => (
            <button key={p.name} onClick={() => setColor(p)}
              title={p.name}
              style={{
                width: 32, height: 32, borderRadius: 8, border: color.name === p.name ? `2px solid ${p.border}` : "2px solid transparent",
                background: p.bg, cursor: "pointer", transition: "transform 0.15s",
                transform: color.name === p.name ? "scale(1.15)" : "scale(1)",
                boxShadow: color.name === p.name ? `0 0 0 2px ${p.border}40` : "none",
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {tile?.id && (
            <button onClick={() => onDelete(tile.id)} style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              background: "transparent", border: `1px solid ${V("delete-border")}`, borderRadius: 8, color: V("delete-text"),
              cursor: "pointer", marginRight: "auto",
            }}>Delete</button>
          )}
          {tile?.id && (
            <button onClick={() => setShowDupDays(!showDupDays)} style={navBtnStyle}>Duplicate</button>
          )}
          <button onClick={onCancel} style={navBtnStyle}>Cancel</button>
          <button disabled={!label.trim()} onClick={() => onSave(buildTile())} style={{
            padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            background: label.trim() ? V("accent") : V("accent-dim"), border: "none", borderRadius: 8,
            color: label.trim() ? "#fff" : V("text-muted"), cursor: label.trim() ? "pointer" : "not-allowed",
          }}>Save</button>
        </div>

        {/* Duplicate day picker */}
        {showDupDays && (
          <div style={{ display: "flex", gap: 4, marginTop: 12, justifyContent: "center" }}>
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => onDuplicate(buildTile(), d)}
                style={{
                  ...navBtnStyle, padding: "6px 8px", fontSize: 10,
                  background: d === editingDay ? V("accent-dim") : "transparent",
                  color: d === editingDay ? V("accent-text") : V("text-secondary"),
                }}
              >{SHORT_DAYS[i]}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TileEditor;
