import { useState, useRef } from "react";
import { DAYS, SHORT_DAYS } from "../constants";
import Tile from "./Tile";

const V = (name) => `var(--wtw-${name})`;

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

export default DayColumn;
