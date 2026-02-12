import { DAYS, SHORT_DAYS } from "../constants";

const V = (name) => `var(--wtw-${name})`;

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

export default NutritionSummary;
