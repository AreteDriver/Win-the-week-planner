import { useState, useRef, useCallback, useEffect } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

const formatWeekRange = (dates) => {
  const m1 = dates[0].toLocaleString("default", { month: "short" });
  const m2 = dates[6].toLocaleString("default", { month: "short" });
  const y = dates[0].getFullYear();
  if (m1 === m2) return `${m1} ${dates[0].getDate()} – ${dates[6].getDate()}, ${y}`;
  return `${m1} ${dates[0].getDate()} – ${m2} ${dates[6].getDate()}, ${y}`;
};

const initialTiles = () => {
  const tiles = {};
  DAYS.forEach((d) => (tiles[d] = []));
  return tiles;
};

// Tile editor modal
const TileEditor = ({ tile, onSave, onDelete, onCancel }) => {
  const [label, setLabel] = useState(tile?.label || "");
  const [color, setColor] = useState(tile?.color || PALETTE[0]);
  const [startTime, setStartTime] = useState(tile?.startTime || "No time");
  const [duration, setDuration] = useState(tile?.duration || "No duration");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#1e293b", borderRadius: 16, padding: 28, width: 380, maxWidth: "90vw",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)", border: "1px solid #334155",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>
          {tile?.id ? "Edit Block" : "New Block"}
        </div>

        <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="What needs doing?"
          onKeyDown={(e) => { if (e.key === "Enter" && label.trim()) onSave({ ...tile, label, color, startTime, duration }); }}
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
            background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#f1f5f9",
            outline: "none", marginBottom: 18,
          }}
        />

        {/* Time row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Start</div>
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{
              width: "100%", padding: "8px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", outline: "none",
            }}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Duration</div>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{
              width: "100%", padding: "8px 10px", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
              background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", outline: "none",
            }}>
              {DURATION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Color picker */}
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Color</div>
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
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          {tile?.id && (
            <button onClick={() => onDelete(tile.id)} style={{
              padding: "9px 16px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
              background: "transparent", border: "1px solid #7f1d1d", borderRadius: 8, color: "#fca5a5",
              cursor: "pointer", marginRight: "auto",
            }}>Delete</button>
          )}
          <button onClick={onCancel} style={{
            padding: "9px 18px", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
            background: "transparent", border: "1px solid #475569", borderRadius: 8, color: "#94a3b8", cursor: "pointer",
          }}>Cancel</button>
          <button disabled={!label.trim()} onClick={() => onSave({ ...tile, label, color, startTime, duration })} style={{
            padding: "9px 20px", fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            background: label.trim() ? "#3b82f6" : "#1e3a5f", border: "none", borderRadius: 8,
            color: label.trim() ? "#fff" : "#64748b", cursor: label.trim() ? "pointer" : "not-allowed",
          }}>Save</button>
        </div>
      </div>
    </div>
  );
};

// Individual tile
const Tile = ({ tile, onEdit, onDragStart }) => {
  const hasTime = tile.startTime && tile.startTime !== "No time";
  const hasDuration = tile.duration && tile.duration !== "No duration";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify(tile));
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
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 16px ${tile.color.border}30`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: tile.color.text, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>
        {tile.label}
      </div>
      {(hasTime || hasDuration) && (
        <div style={{ fontSize: 11, color: tile.color.text, opacity: 0.7, marginTop: 4, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
          {hasTime ? tile.startTime : ""}{hasTime && hasDuration ? " · " : ""}{hasDuration ? tile.duration : ""}
        </div>
      )}
    </div>
  );
};

// Day column
const DayColumn = ({ dayName, date, tiles, onDrop, onEdit, onDragStart, onAdd, isToday }) => {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(dayName, e); }}
      style={{
        flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
        background: over ? "#1e293b" : isToday ? "#0f172a" : "transparent",
        borderRadius: 12, transition: "background 0.2s",
        border: isToday ? "1px solid #334155" : "1px solid transparent",
      }}
    >
      {/* Day header */}
      <div style={{
        padding: "14px 12px 10px", textAlign: "center",
        borderBottom: "1px solid #1e293b",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: isToday ? "#3b82f6" : "#64748b",
          textTransform: "uppercase", letterSpacing: 2, fontFamily: "'DM Sans', sans-serif",
        }}>{SHORT_DAYS[DAYS.indexOf(dayName)]}</div>
        <div style={{
          fontSize: 20, fontWeight: 300, color: isToday ? "#e2e8f0" : "#475569",
          fontFamily: "'DM Sans', sans-serif", marginTop: 2,
        }}>{date.getDate()}</div>
      </div>

      {/* Tiles */}
      <div style={{ flex: 1, padding: 8, minHeight: 120, display: "flex", flexDirection: "column", gap: 0 }}>
        {tiles.map((t) => (
          <Tile key={t.id} tile={t} onEdit={onEdit} onDragStart={onDragStart} />
        ))}
      </div>

      {/* Add button */}
      <div style={{ padding: "6px 8px 10px" }}>
        <button onClick={() => onAdd(dayName)} style={{
          width: "100%", padding: "8px 0", fontSize: 18, fontWeight: 300,
          background: "transparent", border: "1px dashed #334155", borderRadius: 8,
          color: "#475569", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "border-color 0.2s, color 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#475569"; }}
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

export default function WeekPlanner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [tiles, setTiles] = useState(initialTiles);
  const [editing, setEditing] = useState(null); // { day, tile? }
  const [dragging, setDragging] = useState(null);
  const dates = getWeekDates(weekOffset);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const handleDrop = useCallback((targetDay, e) => {
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (!data?.id) return;
      setTiles((prev) => {
        const next = { ...prev };
        // Remove from source
        for (const day of DAYS) {
          next[day] = next[day].filter((t) => t.id !== data.id);
        }
        // Add to target
        next[targetDay] = [...next[targetDay], data];
        return next;
      });
    } catch {}
    setDragging(null);
  }, []);

  const handleSave = useCallback((tile) => {
    const day = editing.day;
    setTiles((prev) => {
      const next = { ...prev };
      if (tile.id) {
        // Update existing — could be in any day
        for (const d of DAYS) {
          next[d] = next[d].map((t) => (t.id === tile.id ? tile : t));
        }
      } else {
        // New tile
        next[day] = [...next[day], { ...tile, id: uid() }];
      }
      return next;
    });
    setEditing(null);
  }, [editing]);

  const handleDelete = useCallback((id) => {
    setTiles((prev) => {
      const next = { ...prev };
      for (const d of DAYS) {
        next[d] = next[d].filter((t) => t.id !== id);
      }
      return next;
    });
    setEditing(null);
  }, []);

  const handlePrint = () => window.print();

  return (
    <div data-print-root style={{
      minHeight: "100vh", background: "#0b1120",
      fontFamily: "'DM Sans', sans-serif", padding: "24px 20px",
      display: "flex", flexDirection: "column",
    }}>
      <PrintStyles />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, padding: "0 4px" }}>
        <div>
          <h1 data-print-header style={{
            fontSize: 28, fontWeight: 800, color: "#e2e8f0", margin: 0,
            letterSpacing: -0.5, fontFamily: "'DM Sans', sans-serif",
          }}>
            WIN THE WEEK
          </h1>
          <div data-print-week style={{ fontSize: 14, color: "#64748b", marginTop: 4, fontWeight: 500 }}>
            {formatWeekRange(dates)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button data-no-print onClick={() => setWeekOffset((w) => w - 1)} style={{
            width: 36, height: 36, borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#8249;</button>
          <button data-no-print onClick={() => setWeekOffset(0)} style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid #334155",
            background: weekOffset === 0 ? "#1e293b" : "transparent", color: "#94a3b8",
            cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            textTransform: "uppercase", letterSpacing: 1,
          }}>Today</button>
          <button data-no-print onClick={() => setWeekOffset((w) => w + 1)} style={{
            width: 36, height: 36, borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 16, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&#8250;</button>

          <div style={{ width: 1, height: 24, background: "#1e293b", margin: "0 6px" }} />

          <button data-no-print onClick={handlePrint} style={{
            padding: "7px 16px", borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#94a3b8", cursor: "pointer",
            fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            textTransform: "uppercase", letterSpacing: 1,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 15 }}>&#9112;</span> Print
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div data-print-grid style={{
        display: "flex", gap: 2, flex: 1,
        background: "#141c2e", borderRadius: 16, overflow: "hidden",
        border: "1px solid #1e293b",
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

      {/* Footer hint */}
      <div data-no-print style={{
        textAlign: "center", padding: "14px 0 4px", fontSize: 12, color: "#334155",
        fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      }}>
        Click + to add blocks · Drag tiles between days · Click any tile to edit
      </div>

      {/* Modal */}
      {editing && (
        <TileEditor
          tile={editing.tile || { label: "", color: PALETTE[0], startTime: "No time", duration: "No duration" }}
          onSave={handleSave}
          onDelete={handleDelete}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
