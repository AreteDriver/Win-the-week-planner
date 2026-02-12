import { DAYS, STORAGE_KEY, RECURRING_KEY } from "./constants";
import { uid, initialTiles, getIdCounter, setIdCounter } from "./utils";

export const loadWeek = (weekKey) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return data[weekKey] || null;
  } catch {
    return null;
  }
};

export const saveWeek = (weekKey, tiles) => {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    data[weekKey] = tiles;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

export const loadRecurring = () => {
  try {
    return JSON.parse(localStorage.getItem(RECURRING_KEY) || "null") || initialTiles();
  } catch {
    return initialTiles();
  }
};

export const saveRecurring = (templates) => {
  try {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(templates));
  } catch {}
};

export const syncIdCounter = (tiles) => {
  let counter = getIdCounter();
  for (const day of DAYS) {
    for (const t of tiles[day] || []) {
      const num = parseInt(t.id?.replace("tile-", ""), 10);
      if (!isNaN(num) && num >= counter) counter = num + 1;
    }
  }
  setIdCounter(counter);
};

export const loadOrPopulateWeek = (weekKey) => {
  const saved = loadWeek(weekKey);
  if (saved) {
    syncIdCounter(saved);
    return saved;
  }
  const recurring = loadRecurring();
  const populated = initialTiles();
  for (const day of DAYS) {
    if (recurring[day]?.length) {
      populated[day] = recurring[day].map((t) => ({
        ...t,
        id: uid(),
        // Preserve recurringId so the template link is maintained
      }));
    }
  }
  return populated;
};
