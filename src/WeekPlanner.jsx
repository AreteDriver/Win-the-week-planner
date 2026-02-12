import { useState, useRef, useCallback, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const MEAL_ICONS = { Breakfast: "\u2615", Lunch: "\ud83c\udf5c", Dinner: "\ud83c\udf7d\ufe0f", Snack: "\ud83c\udf4e" };

const PALETTE = [
  { name: "Slate", bg: "#e2e8f0", border: "#94a3b8", text: "#1e293b" },
  { name: "Amber", bg: "#fef3c7", border: "#f59e0b", text: "#78350f" },
  { name: "Emerald", bg: "#d1fae5", border: "#10b981", text: "#064e3b" },
  { name: "Sky", bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
  { name: "Rose", bg: "#ffe4e6", border: "#f43f5e", text: "#881337" },
  { name: "Violet", bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  { name: "Orange", bg: "#ffedd5", border: "#f97316", text: "#7c2d12" },
  { name: "Teal", bg: "#ccfbf1", border: "#14b8a6", text: "#134e4a" },
];

const TIME_OPTIONS = [
  "No time", "5:00 AM", "5:30 AM", "6:00 AM", "6:30 AM",
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM",
  "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
];

const DURATION_OPTIONS = [
  "No duration", "15 min", "30 min", "45 min", "1 hr", "1.5 hr", "2 hr", "2.5 hr", "3 hr", "4 hr", "5 hr", "6 hr", "8 hr",
];

let idCounter = 1;
const uid = () => `tile-${idCounter++}`;

const getWeekDates = (offset) => {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const getWeekKey = (offset) => {
  const dates = getWeekDates(offset);
  const mon = dates[0];
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
};

const formatWeekRange = (dates) => {
  const m1 = dates[0].toLocaleString("default", { month: "short" });
  const m2 = dates[6].toLocaleString("default", { month: "short" });
  const y = dates[0].getFullYear();
  if (m1 === m2) return `${m1} ${dates[0].getDate()} \u2013 ${dates[6].getDate()}, ${y}`;
  return `${m1} ${dates[0].getDate()} \u2013 ${m2} ${dates[6].getDate()}, ${y}`;
};

const initialTiles = () => {
  const tiles = {};
  DAYS.forEach((d) => (tiles[d] = []));
  return tiles;
};

// localStorage persistence
const STORAGE_KEY = "wtw-planner";
const RECURRING_KEY = "wtw-recurring";

const loadWeek = (weekKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return data[weekKey] || null;
  } catch {
    return null;
  }
};

const saveWeek = (weekKey, tiles) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    data[weekKey] = tiles;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const loadRecurring = () => {
  try {
    return JSON.parse(localStorage.getItem(RECURRING_KEY) || "null") || initialTiles();
  } catch {
    return initialTiles();
  }
};

const saveRecurring = (templates) => {
  try {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(templates));
  } catch {}
};

const syncIdCounter = (tiles) => {
  for (const day of DAYS) {
    for (const t of tiles[day] || []) {
      const num = parseInt(t.id?.replace("tile-", ""), 10);
      if (!isNaN(num) && num >= idCounter) idCounter = num + 1;
    }
  }
};

const loadOrPopulateWeek = (weekKey) => {
  const saved = loadWeek(weekKey);
  if (saved) {
    syncIdCounter(saved);
    return saved;
  }
  const recurring = loadRecurring();
  const populated = initialTiles();
  for (const day of DAYS) {
    if (recurring[day]?.length) {
      populated[day] = recurring[day].map((t) => ({ ...t, id: uid() }));
    }
  }
  return populated;
};

// ICS export helpers
const parseTime12to24 = (timeStr) => {
  const [time, period] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

const parseDurationMinutes = (durStr) => {
  if (!durStr || durStr === "No duration") return 60;
  if (durStr.includes("min")) return parseInt(durStr);
  return parseFloat(durStr) * 60;
};

const formatICSDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

const formatICSDateTime = (date, hours, minutes) =>
  `${formatICSDate(date)}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`;

const generateICS = (tiles, dates) => {
  const events = [];
  DAYS.forEach((day, i) => {
    const date = dates[i];
    for (const tile of tiles[day]) {
      const hasTime = tile.startTime && tile.startTime !== "No time";
      const eventUid = `${tile.id}-${formatICSDate(date)}@wtw-planner`;
      let desc = "";
      if (tile.type === "meal") {
        const parts = [tile.mealType];
        if (tile.ingredients) parts.push(tile.ingredients);
        if (tile.calories) parts.push(`${tile.calories} cal`);
        if (tile.notes) parts.push(tile.notes);
        desc = `\r\nDESCRIPTION:${parts.join(" | ")}`;
      }
      if (hasTime) {
        const { hours, minutes } = parseTime12to24(tile.startTime);
        const durMin = parseDurationMinutes(tile.duration);
        const endTotalMin = hours * 60 + minutes + durMin;
        const endH = Math.floor(endTotalMin / 60);
        const endM = endTotalMin % 60;
        events.push(
          `BEGIN:VEVENT\r\nUID:${eventUid}\r\nDTSTART:${formatICSDateTime(date, hours, minutes)}\r\nDTEND:${formatICSDateTime(date, endH, endM)}\r\nSUMMARY:${tile.label}${desc}\r\nEND:VEVENT`
        );
      } else {
        const nextDay = new Date(date.getTime() + 86400000);
        events.push(
          `BEGIN:VEVENT\r\nUID:${eventUid}\r\nDTSTART;VALUE=DATE:${formatICSDate(date)}\r\nDTEND;VALUE=DATE:${formatICSDate(nextDay)}\r\nSUMMARY:${tile.label}${desc}\r\nEND:VEVENT`
        );
      }
    }
  });
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Win the Week//Planner//EN\r\n${events.join("\r\n")}\r\nEND:VCALENDAR`;
};

const downloadICS = (content, filename) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// Responsive hook
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
};

// Shared inline style helpers (reference CSS variables)
const V = (name) => `var(--wtw-${name})`;

// Tile editor modal
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

// Individual tile
const Tile = ({ tile, dayName, onEdit, onDragStart }) => {
  const hasTime = tile.startTime && tile.startTime !== "No time";
  const hasDuration = tile.duration && tile.duration !== "No duration";

  return (
    <div
      data-tile
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ ...tile, sourceDay: dayName }));
        onDragStart(tile);
      }}
      onClick={() => onEdit(tile)}
      style={{
        background: tile.color.bg,
        border: `2px solid ${tile.color.border}`,
        borderLeft: `4px solid ${tile.color.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "grab",
        userSelect: "none",
        transition: "box-shadow 0.2s, transform 0.15s",
        marginBottom: 6,
        position: "relative",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 16px ${tile.color.border}30`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {tile.recurring && (
        <div style={{ position: "absolute", top: 4, right: 6, fontSize: 10, opacity: 0.5 }} title="Repeats weekly">{"\ud83d\udd01"}</div>
      )}
      {tile.type === "meal" && (
        <div style={{ fontSize: 10, fontWeight: 800, color: tile.color.text, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>
          {MEAL_ICONS[tile.mealType]} {tile.mealType}
        </div>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: tile.color.text, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
        {tile.label}
      </div>
      {(hasTime || hasDuration) && (
        <div style={{ fontSize: 11, color: tile.color.text, opacity: 0.7, marginTop: 4, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
          {hasTime ? tile.startTime : ""}{hasTime && hasDuration ? " \u00b7 " : ""}{hasDuration ? tile.duration : ""}
        </div>
      )}
      {tile.type === "meal" && (tile.ingredients || tile.calories) && (
        <div style={{ fontSize: 10, color: tile.color.text, opacity: 0.6, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
          {tile.ingredients ? `${tile.ingredients.split(",").filter((s) => s.trim()).length} ingredients` : ""}
          {tile.ingredients && tile.calories ? " \u00b7 " : ""}
          {tile.calories ? `${tile.calories} cal` : ""}
        </div>
      )}
    </div>
  );
};

// Day column with drop index tracking for reordering
const DayColumn = ({ dayName, date, tiles, onDrop, onEdit, onDragStart, onAdd, isToday }) => {
  const [over, setOver] = useState(false);
  const [dropIndex, setDropIndex] = useState(-1);
  const tilesRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setOver(true);
    if (tilesRef.current) {
      const tileElements = tilesRef.current.querySelectorAll("[data-tile]");
      let idx = tiles.length;
      for (let i = 0; i < tileElements.length; i++) {
        const rect = tileElements[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          idx = i;
          break;
        }
      }
      setDropIndex(idx);
    }
  };

  const handleDragLeave = () => {
    setOver(false);
    setDropIndex(-1);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setOver(false);
    onDrop(dayName, e, dropIndex);
    setDropIndex(-1);
  };

  const dropIndicator = (
    <div style={{ height: 3, background: V("accent"), borderRadius: 2, margin: "2px 4px" }} />
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: over ? V("bg-surface") : isToday ? V("bg-input") : "transparent",
        borderRadius: 12, transition: "background 0.2s",
        border: isToday ? `1px solid ${V("border")}` : "1px solid transparent",
      }}
    >
      {/* Day header */}
      <div style={{
        padding: "14px 12px 10px", textAlign: "center",
        borderBottom: `1px solid ${V("border-inner")}`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: isToday ? V("accent") : V("text-muted"),
          textTransform: "uppercase", letterSpacing: 2, fontFamily: "'DM Sans', sans-serif",
        }}>{SHORT_DAYS[DAYS.indexOf(dayName)]}</div>
        <div style={{
          fontSize: 20, fontWeight: 300, color: isToday ? V("text") : V("text-dim"),
          fontFamily: "'DM Sans', sans-serif", marginTop: 2,
        }}>{date.getDate()}</div>
      </div>

      {/* Tiles */}
      <div ref={tilesRef} style={{ flex: 1, padding: 8, minHeight: 120, display: "flex", flexDirection: "column", gap: 0 }}>
        {tiles.map((t, i) => (
          <div key={t.id}>
            {over && dropIndex === i && dropIndicator}
            <Tile tile={t} dayName={dayName} onEdit={onEdit} onDragStart={onDragStart} />
          </div>
        ))}
        {over && dropIndex === tiles.length && dropIndicator}
      </div>

      {/* Add button */}
      <div style={{ padding: "6px 8px 10px" }}>
        <button onClick={() => onAdd(dayName)} className="wtw-add-btn" style={{
          width: "100%", padding: "8px 0", fontSize: 18, fontWeight: 300,
          background: "transparent", border: `1px dashed ${V("border")}`, borderRadius: 8,
          color: V("text-dim"), cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "border-color 0.2s, color 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = V("accent"); e.currentTarget.style.color = V("accent"); }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = V("border"); e.currentTarget.style.color = V("text-dim"); }}
        >+</button>
      </div>
    </div>
  );
};

// Print styles injected into head
const PrintStyles = () => {
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-print", "true");
    style.textContent = `
      @media print {
        body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { color-adjust: exact !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        [data-no-print] { display: none !important; }
        [data-print-root] {
          background: white !important;
          min-height: auto !important;
          padding: 0 !important;
        }
        [data-print-header] { color: #0f172a !important; }
        [data-print-week] { color: #475569 !important; }
        [data-print-grid] {
          border: 1px solid #cbd5e1 !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  return null;
};

// Grocery list modal
const GroceryList = ({ tiles, weekRange, onClose }) => {
  const [checked, setChecked] = useState({});

  const items = (() => {
    const map = {};
    for (const day of DAYS) {
      for (const tile of tiles[day] || []) {
        if (tile.type !== "meal" || !tile.ingredients) continue;
        for (const raw of tile.ingredients.split(",")) {
          const name = raw.trim().toLowerCase();
          if (!name) continue;
          if (!map[name]) map[name] = { name, meals: [] };
          map[name].meals.push(`${day} \u2014 ${tile.label}`);
        }
      }
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const toggleItem = (name) => setChecked((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleCopy = () => {
    const text = items.filter((i) => !checked[i.name]).map((i) => `- ${i.name}`).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: V("overlay"), backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: V("bg-surface"), borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw",
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        boxShadow: `0 25px 60px ${V("shadow")}`, border: `1px solid ${V("border")}`,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: V("text") }}>
              {"\ud83d\uded2"} Grocery List
            </div>
            <div style={{ fontSize: 11, color: V("text-muted"), marginTop: 2 }}>{weekRange}</div>
          </div>
          {items.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: V("text-secondary"), background: V("bg-input"), padding: "4px 10px", borderRadius: 12 }}>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: V("text-dim"), fontSize: 13 }}>
              No meal tiles yet. Add meals to generate a grocery list.
            </div>
          ) : items.map((item) => (
            <div key={item.name} onClick={() => toggleItem(item.name)} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 6px",
              cursor: "pointer", borderRadius: 6, transition: "background 0.15s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = V("bg-input"); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, border: `1px solid ${V("text-dim")}`, flexShrink: 0, marginTop: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: checked[item.name] ? V("accent") : "transparent",
              }}>
                {checked[item.name] && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>{"\u2713"}</span>}
              </div>
              <div>
                <div style={{
                  fontSize: 14, color: checked[item.name] ? V("text-dim") : V("text"), fontWeight: 500,
                  textDecoration: checked[item.name] ? "line-through" : "none",
                }}>{item.name}</div>
                <div style={{ fontSize: 10, color: V("text-dim"), marginTop: 1 }}>
                  {item.meals.join(", ")}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {items.length > 0 && (
            <button onClick={handleCopy} style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              background: "transparent", border: `1px solid ${V("border")}`, borderRadius: 8, color: V("text-secondary"),
              cursor: "pointer", marginRight: "auto",
            }}>{"\ud83d\udccb"} Copy</button>
          )}
          <button onClick={onClose} style={{
            padding: "9px 18px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            background: V("accent"), border: "none", borderRadius: 8, color: "#fff", cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// Nutrition summary modal
const NutritionSummary = ({ tiles, weekRange, onClose }) => {
  const dailyTotals = DAYS.map((day, i) => {
    const meals = (tiles[day] || []).filter((t) => t.type === "meal");
    return {
      day: SHORT_DAYS[i],
      calories: meals.reduce((s, t) => s + (parseFloat(t.calories) || 0), 0),
      protein: meals.reduce((s, t) => s + (parseFloat(t.protein) || 0), 0),
      carbs: meals.reduce((s, t) => s + (parseFloat(t.carbs) || 0), 0),
      fat: meals.reduce((s, t) => s + (parseFloat(t.fat) || 0), 0),
      count: meals.length,
    };
  });

  const weekTotal = dailyTotals.reduce((acc, d) => ({
    calories: acc.calories + d.calories, protein: acc.protein + d.protein,
    carbs: acc.carbs + d.carbs, fat: acc.fat + d.fat, count: acc.count + d.count,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });

  const activeDays = dailyTotals.filter((d) => d.count > 0).length;

  const cellStyle = { padding: "6px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", textAlign: "right" };
  const headerCell = { ...cellStyle, color: V("text-muted"), fontWeight: 700, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: 1, fontSize: 10 };
  const dayCell = { ...cellStyle, textAlign: "left", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: V("text-secondary") };

  return (
    <div style={{
      position: "fixed", inset: 0, background: V("overlay"), backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: V("bg-surface"), borderRadius: 16, padding: 28, width: 480, maxWidth: "90vw",
        maxHeight: "80vh", overflowY: "auto",
        boxShadow: `0 25px 60px ${V("shadow")}`, border: `1px solid ${V("border")}`,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: V("text") }}>
              {"\ud83d\udcca"} Weekly Nutrition
            </div>
            <div style={{ fontSize: 11, color: V("text-muted"), marginTop: 2 }}>{weekRange}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: V("text-secondary"), background: V("bg-input"), padding: "4px 10px", borderRadius: 12 }}>
            {weekTotal.count} meal{weekTotal.count !== 1 ? "s" : ""}
          </div>
        </div>

        {weekTotal.count === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: V("text-dim"), fontSize: 13 }}>
            No meal tiles with macros yet.
          </div>
        ) : (
          <>
            {/* Weekly totals */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20,
            }}>
              {[
                { label: "Calories", value: Math.round(weekTotal.calories), unit: "cal" },
                { label: "Protein", value: Math.round(weekTotal.protein), unit: "g" },
                { label: "Carbs", value: Math.round(weekTotal.carbs), unit: "g" },
                { label: "Fat", value: Math.round(weekTotal.fat), unit: "g" },
              ].map(({ label, value, unit }) => (
                <div key={label} style={{
                  background: V("bg-input"), borderRadius: 10, padding: "12px 10px", textAlign: "center",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: V("text"), fontFamily: "'DM Mono', monospace" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 10, color: V("text-muted"), fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
                    {label} ({unit})
                  </div>
                </div>
              ))}
            </div>

            {/* Daily average */}
            {activeDays > 0 && (
              <div style={{ fontSize: 12, color: V("text-muted"), marginBottom: 16, textAlign: "center" }}>
                Daily avg: {Math.round(weekTotal.calories / activeDays)} cal &middot; {Math.round(weekTotal.protein / activeDays)}g P &middot; {Math.round(weekTotal.carbs / activeDays)}g C &middot; {Math.round(weekTotal.fat / activeDays)}g F
              </div>
            )}

            {/* Per-day breakdown */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${V("border")}` }}>
                  <th style={{ ...headerCell, textAlign: "left" }}>Day</th>
                  <th style={headerCell}>Cal</th>
                  <th style={headerCell}>P(g)</th>
                  <th style={headerCell}>C(g)</th>
                  <th style={headerCell}>F(g)</th>
                </tr>
              </thead>
              <tbody>
                {dailyTotals.map((d) => (
                  <tr key={d.day} style={{ borderBottom: `1px solid ${V("border-inner")}`, opacity: d.count > 0 ? 1 : 0.4 }}>
                    <td style={dayCell}>{d.day}</td>
                    <td style={{ ...cellStyle, color: V("text") }}>{d.calories || "\u2014"}</td>
                    <td style={{ ...cellStyle, color: V("text") }}>{d.protein || "\u2014"}</td>
                    <td style={{ ...cellStyle, color: V("text") }}>{d.carbs || "\u2014"}</td>
                    <td style={{ ...cellStyle, color: V("text") }}>{d.fat || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            background: V("accent"), border: "none", borderRadius: 8, color: "#fff", cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default function WeekPlanner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tiles, setTiles] = useState(() => loadOrPopulateWeek(getWeekKey(0)));
  const [editing, setEditing] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [showGroceries, setShowGroceries] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("wtw-theme") || "dark");

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedDay, setSelectedDay] = useState(() => {
    const dow = new Date().getDay();
    return DAYS[dow === 0 ? 6 : dow - 1];
  });

  // Theme sync
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("wtw-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => t === "dark" ? "light" : "dark");

  const weekKey = getWeekKey(weekOffset);
  const weekKeyRef = useRef(weekKey);
  weekKeyRef.current = weekKey;

  const dates = getWeekDates(weekOffset);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Persist tiles to localStorage on every mutation
  const persistTiles = useCallback((updater) => {
    setTiles((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveWeek(weekKeyRef.current, next);
      return next;
    });
  }, []);

  // Load tiles when navigating weeks (skip initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setTiles(loadOrPopulateWeek(weekKey));
  }, [weekKey]);

  const handleDrop = useCallback((targetDay, e, dropIndex) => {
    try {
      const raw = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!raw?.id) return;
      const { sourceDay, ...tileData } = raw;

      persistTiles((prev) => {
        const next = { ...prev };

        if (sourceDay === targetDay && dropIndex >= 0) {
          const dayTiles = [...prev[targetDay]];
          const currentIndex = dayTiles.findIndex((t) => t.id === tileData.id);
          if (currentIndex === -1) return prev;
          dayTiles.splice(currentIndex, 1);
          const adjustedIndex = dropIndex > currentIndex ? dropIndex - 1 : dropIndex;
          dayTiles.splice(adjustedIndex, 0, tileData);
          next[targetDay] = dayTiles;
        } else {
          for (const day of DAYS) {
            next[day] = next[day].filter((t) => t.id !== tileData.id);
          }
          const targetTiles = [...next[targetDay]];
          const insertIdx = dropIndex >= 0 ? Math.min(dropIndex, targetTiles.length) : targetTiles.length;
          targetTiles.splice(insertIdx, 0, tileData);
          next[targetDay] = targetTiles;
        }
        return next;
      });
    } catch {}
    setDragging(null);
  }, [persistTiles]);

  const updateRecurringStore = useCallback((tile, day, wasRecurring) => {
    const isRecurring = tile.recurring;
    if (!isRecurring && !wasRecurring) return;
    const templates = loadRecurring();
    if (isRecurring) {
      const { id, ...template } = tile;
      // Remove old version by label if exists, then add
      templates[day] = (templates[day] || []).filter((t) => t.label !== template.label);
      templates[day].push(template);
    } else if (wasRecurring) {
      templates[day] = (templates[day] || []).filter((t) => t.label !== tile.label);
    }
    saveRecurring(templates);
  }, []);

  const handleSave = useCallback((tile) => {
    const day = editing.day;
    const wasRecurring = editing.tile?.recurring;

    persistTiles((prev) => {
      const next = { ...prev };
      if (tile.id) {
        for (const d of DAYS) {
          next[d] = next[d].map((t) => (t.id === tile.id ? tile : t));
        }
      } else {
        next[day] = [...next[day], { ...tile, id: uid() }];
      }
      return next;
    });

    updateRecurringStore(tile, day, wasRecurring);
    setEditing(null);
  }, [editing, persistTiles, updateRecurringStore]);

  const handleDelete = useCallback((id) => {
    // Find the tile to check if it was recurring
    let deletedTile = null;
    let deletedDay = null;
    for (const d of DAYS) {
      const found = tiles[d]?.find((t) => t.id === id);
      if (found) { deletedTile = found; deletedDay = d; break; }
    }

    persistTiles((prev) => {
      const next = { ...prev };
      for (const d of DAYS) {
        next[d] = next[d].filter((t) => t.id !== id);
      }
      return next;
    });

    if (deletedTile?.recurring && deletedDay) {
      const templates = loadRecurring();
      templates[deletedDay] = (templates[deletedDay] || []).filter((t) => t.label !== deletedTile.label);
      saveRecurring(templates);
    }

    setEditing(null);
  }, [persistTiles, tiles]);

  const handleDuplicate = useCallback((tile, targetDay) => {
    const { id, ...tileData } = tile;
    persistTiles((prev) => {
      const next = { ...prev };
      next[targetDay] = [...next[targetDay], { ...tileData, id: uid() }];
      return next;
    });
    setEditing(null);
  }, [persistTiles]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    const ics = generateICS(tiles, dates);
    downloadICS(ics, `week-${weekKey}.ics`);
  };

  const navBtnStyle = {
    padding: "7px 16px", borderRadius: 8, border: `1px solid ${V("border")}`,
    background: "transparent", color: V("text-secondary"), cursor: "pointer",
    fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
    textTransform: "uppercase", letterSpacing: 1,
    display: "flex", alignItems: "center", gap: 6,
  };

  return (
    <div data-print-root style={{
      minHeight: "100vh", background: V("bg-page"),
      fontFamily: "'DM Sans', sans-serif", padding: "24px 20px",
      display: "flex", flexDirection: "column",
    }}>
      <PrintStyles />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="wtw-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "0 4px" }}>
        <div>
          <h1 data-print-header className="wtw-title" style={{
            fontSize: 28, fontWeight: 800, color: V("text"), margin: 0,
            letterSpacing: -0.5, fontFamily: "'DM Sans', sans-serif",
          }}>
            WIN THE WEEK
          </h1>
          <div data-print-week style={{ fontSize: 14, color: V("text-muted"), marginTop: 4, fontWeight: 500 }}>
            {formatWeekRange(dates)}
          </div>
        </div>

        <div className="wtw-nav" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button data-no-print onClick={() => setWeekOffset((w) => w - 1)} style={{
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${V("border")}`,
            background: "transparent", color: V("text-secondary"), cursor: "pointer", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#8249;</button>
          <button data-no-print onClick={() => setWeekOffset(0)} style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${V("border")}`,
            background: weekOffset === 0 ? V("bg-surface") : "transparent", color: V("text-secondary"),
            cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            textTransform: "uppercase", letterSpacing: 1,
          }}>Today</button>
          <button data-no-print onClick={() => setWeekOffset((w) => w + 1)} style={{
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${V("border")}`,
            background: "transparent", color: V("text-secondary"), cursor: "pointer", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#8250;</button>

          {/* Theme toggle */}
          <button data-no-print onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} style={{
            width: 36, height: 36, borderRadius: 8, border: `1px solid ${V("border")}`,
            background: "transparent", color: V("text-secondary"), cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{theme === "dark" ? "\u2600\ufe0f" : "\ud83c\udf19"}</button>

          <div className="wtw-divider" style={{ width: 1, height: 24, background: V("border-inner"), margin: "0 6px" }} />

          <button data-no-print onClick={handlePrint} className="wtw-print-btn" style={navBtnStyle}>
            <span style={{ fontSize: 15 }}>&#9112;</span> Print
          </button>
          <button data-no-print onClick={handleExport} className="wtw-export-btn" style={navBtnStyle}>
            <span style={{ fontSize: 15 }}>&#128197;</span> Export
          </button>
          <button data-no-print onClick={() => setShowGroceries(true)} className="wtw-groceries-btn" style={navBtnStyle}>
            <span style={{ fontSize: 15 }}>{"\ud83d\uded2"}</span> Groceries
          </button>
          <button data-no-print onClick={() => setShowNutrition(true)} className="wtw-macros-btn" style={navBtnStyle}>
            <span style={{ fontSize: 15 }}>{"\ud83d\udcca"}</span> Macros
          </button>
        </div>
      </div>

      {/* Mobile day tabs */}
      {isMobile && (
        <div data-no-print style={{
          display: "flex", gap: 6, overflowX: "auto", padding: "0 0 12px",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
        }}>
          {DAYS.map((day, i) => {
            const d = dates[i];
            const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const isSelected = day === selectedDay;
            const isDayToday = dayStr === todayStr;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} style={{
                flex: "0 0 auto", padding: "10px 16px", borderRadius: 10,
                border: isSelected ? `1px solid ${V("accent")}` : `1px solid ${V("border-inner")}`,
                background: isSelected ? V("bg-surface") : "transparent",
                color: isSelected ? V("text") : isDayToday ? V("accent") : V("text-muted"),
                fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer", textTransform: "uppercase", letterSpacing: 1,
                whiteSpace: "nowrap",
              }}>
                {SHORT_DAYS[i]} {d.getDate()}
              </button>
            );
          })}
        </div>
      )}

      {/* Week grid */}
      {isMobile ? (
        <div data-print-grid style={{
          flex: 1, background: V("bg-card"), borderRadius: 16,
          border: `1px solid ${V("border-inner")}`, overflow: "hidden",
        }}>
          {(() => {
            const i = DAYS.indexOf(selectedDay);
            const d = dates[i];
            const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            return (
              <DayColumn
                dayName={selectedDay}
                date={d}
                tiles={tiles[selectedDay]}
                isToday={dayStr === todayStr}
                onDrop={handleDrop}
                onEdit={(tile) => setEditing({ day: selectedDay, tile })}
                onDragStart={setDragging}
                onAdd={(dayName) => setEditing({ day: dayName, tile: null })}
              />
            );
          })()}
        </div>
      ) : (
        <div data-print-grid style={{
          display: "flex", gap: 2, flex: 1,
          background: V("bg-card"), borderRadius: 16, overflow: "hidden",
          border: `1px solid ${V("border-inner")}`,
        }}>
          {DAYS.map((day, i) => {
            const d = dates[i];
            const dayStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            return (
              <DayColumn
                key={day}
                dayName={day}
                date={d}
                tiles={tiles[day]}
                isToday={dayStr === todayStr}
                onDrop={handleDrop}
                onEdit={(tile) => setEditing({ day, tile })}
                onDragStart={setDragging}
                onAdd={(dayName) => setEditing({ day: dayName, tile: null })}
              />
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      <div data-no-print style={{
        textAlign: "center", padding: "14px 0 4px", fontSize: 12, color: V("text-footer"),
        fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      }}>
        {isMobile
          ? "Tap + to add blocks \u00b7 Tap day tabs to navigate \u00b7 Tap any tile to edit"
          : "Click + to add blocks \u00b7 Drag tiles to reorder or move between days \u00b7 Click any tile to edit"
        }
      </div>

      {/* Modals */}
      {editing && (
        <TileEditor
          tile={editing.tile || { label: "", color: PALETTE[0], startTime: "No time", duration: "No duration", type: "task" }}
          editingDay={editing.day}
          onSave={handleSave}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onCancel={() => setEditing(null)}
        />
      )}
      {showGroceries && (
        <GroceryList tiles={tiles} weekRange={formatWeekRange(dates)} onClose={() => setShowGroceries(false)} />
      )}
      {showNutrition && (
        <NutritionSummary tiles={tiles} weekRange={formatWeekRange(dates)} onClose={() => setShowNutrition(false)} />
      )}
    </div>
  );
}
