import { useState } from "react";
import { parseIngredients } from "../utils";

const V = (name) => `var(--wtw-${name})`;

const GroceryList = ({ tiles, weekRange, onClose }) => {
  const [checked, setChecked] = useState({});
  const items = parseIngredients(tiles);

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

export default GroceryList;
