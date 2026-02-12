import { useState, useRef, useCallback, useEffect } from "react";
import { DAYS, SHORT_DAYS, PALETTE } from "./constants";
import { uid, getWeekDates, getWeekKey, formatWeekRange, generateICS, downloadICS } from "./utils";
import { loadOrPopulateWeek, saveWeek, loadRecurring, saveRecurring } from "./storage";
import { useMediaQuery } from "./hooks";
import { TileEditor, DayColumn, PrintStyles, GroceryList, NutritionSummary } from "./components";

const V = (name) => `var(--wtw-${name})`;

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
      // Match by recurringId (stable) with label fallback (backwards compat)
      templates[day] = (templates[day] || []).filter((t) =>
        tile.recurringId ? t.recurringId !== tile.recurringId : t.label !== template.label
      );
      templates[day].push(template);
    } else if (wasRecurring) {
      templates[day] = (templates[day] || []).filter((t) =>
        tile.recurringId ? t.recurringId !== tile.recurringId : t.label !== tile.label
      );
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
      // Match by recurringId (stable) with label fallback (backwards compat)
      templates[deletedDay] = (templates[deletedDay] || []).filter((t) =>
        deletedTile.recurringId ? t.recurringId !== deletedTile.recurringId : t.label !== deletedTile.label
      );
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
