import { DAYS } from "./constants";

let idCounter = 1;
export const uid = () => `tile-${idCounter++}`;

export const getIdCounter = () => idCounter;
export const setIdCounter = (val) => { idCounter = val; };

export const getWeekDates = (offset) => {
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

export const getWeekKey = (offset) => {
  const dates = getWeekDates(offset);
  const mon = dates[0];
  return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
};

export const formatWeekRange = (dates) => {
  const m1 = dates[0].toLocaleString("default", { month: "short" });
  const m2 = dates[6].toLocaleString("default", { month: "short" });
  const y = dates[0].getFullYear();
  if (m1 === m2) return `${m1} ${dates[0].getDate()} \u2013 ${dates[6].getDate()}, ${y}`;
  return `${m1} ${dates[0].getDate()} \u2013 ${m2} ${dates[6].getDate()}, ${y}`;
};

export const initialTiles = () => {
  const tiles = {};
  DAYS.forEach((d) => (tiles[d] = []));
  return tiles;
};

export const parseTime12to24 = (timeStr) => {
  const [time, period] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
};

export const parseDurationMinutes = (durStr) => {
  if (!durStr || durStr === "No duration") return 60;
  if (durStr.includes("min")) return parseInt(durStr);
  return parseFloat(durStr) * 60;
};

export const formatICSDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
};

export const formatICSDateTime = (date, hours, minutes) =>
  `${formatICSDate(date)}T${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}00`;

export const generateICS = (tiles, dates) => {
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

export const downloadICS = (content, filename) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const parseIngredients = (tiles) => {
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
};
