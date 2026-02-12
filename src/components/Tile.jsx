import { MEAL_ICONS } from "../constants";

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

export default Tile;
