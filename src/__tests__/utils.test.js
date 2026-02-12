import { describe, it, expect, beforeEach } from "vitest";
import {
  parseTime12to24,
  parseDurationMinutes,
  formatICSDate,
  formatICSDateTime,
  getWeekDates,
  getWeekKey,
  formatWeekRange,
  generateICS,
  parseIngredients,
  initialTiles,
  uid,
  setIdCounter,
} from "../utils";
import { DAYS } from "../constants";

describe("parseTime12to24", () => {
  it("parses morning time", () => {
    expect(parseTime12to24("9:00 AM")).toEqual({ hours: 9, minutes: 0 });
  });

  it("parses noon", () => {
    expect(parseTime12to24("12:00 PM")).toEqual({ hours: 12, minutes: 0 });
  });

  it("parses midnight", () => {
    expect(parseTime12to24("12:00 AM")).toEqual({ hours: 0, minutes: 0 });
  });

  it("parses late evening", () => {
    expect(parseTime12to24("11:30 PM")).toEqual({ hours: 23, minutes: 30 });
  });

  it("parses afternoon time", () => {
    expect(parseTime12to24("1:00 PM")).toEqual({ hours: 13, minutes: 0 });
  });

  it("parses early morning with minutes", () => {
    expect(parseTime12to24("5:30 AM")).toEqual({ hours: 5, minutes: 30 });
  });
});

describe("parseDurationMinutes", () => {
  it("parses minute durations", () => {
    expect(parseDurationMinutes("30 min")).toBe(30);
  });

  it("parses 15 min", () => {
    expect(parseDurationMinutes("15 min")).toBe(15);
  });

  it("parses hour durations", () => {
    expect(parseDurationMinutes("1.5 hr")).toBe(90);
  });

  it("parses whole hour", () => {
    expect(parseDurationMinutes("2 hr")).toBe(120);
  });

  it("defaults 'No duration' to 60", () => {
    expect(parseDurationMinutes("No duration")).toBe(60);
  });

  it("defaults null to 60", () => {
    expect(parseDurationMinutes(null)).toBe(60);
  });

  it("defaults undefined to 60", () => {
    expect(parseDurationMinutes(undefined)).toBe(60);
  });
});

describe("formatICSDate", () => {
  it("formats a known date", () => {
    const date = new Date(2026, 1, 12); // Feb 12, 2026
    expect(formatICSDate(date)).toBe("20260212");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(formatICSDate(date)).toBe("20260105");
  });
});

describe("formatICSDateTime", () => {
  it("formats date with time", () => {
    const date = new Date(2026, 1, 12); // Feb 12, 2026
    expect(formatICSDateTime(date, 9, 30)).toBe("20260212T093000");
  });

  it("formats midnight", () => {
    const date = new Date(2026, 1, 12);
    expect(formatICSDateTime(date, 0, 0)).toBe("20260212T000000");
  });

  it("pads single-digit hours and minutes", () => {
    const date = new Date(2026, 1, 12);
    expect(formatICSDateTime(date, 5, 5)).toBe("20260212T050500");
  });
});

describe("getWeekDates", () => {
  it("returns 7 dates", () => {
    const dates = getWeekDates(0);
    expect(dates).toHaveLength(7);
  });

  it("first day is Monday", () => {
    const dates = getWeekDates(0);
    expect(dates[0].getDay()).toBe(1); // Monday = 1
  });

  it("last day is Sunday", () => {
    const dates = getWeekDates(0);
    expect(dates[6].getDay()).toBe(0); // Sunday = 0
  });

  it("dates are consecutive", () => {
    const dates = getWeekDates(0);
    for (let i = 1; i < 7; i++) {
      const diff = dates[i].getDate() - dates[i - 1].getDate();
      // Handle month boundary: diff is 1 or negative (month rollover)
      expect(diff === 1 || diff < 0).toBe(true);
    }
  });

  it("offset shifts by 7 days", () => {
    const thisWeek = getWeekDates(0);
    const nextWeek = getWeekDates(1);
    const diff = (nextWeek[0].getTime() - thisWeek[0].getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(7);
  });
});

describe("getWeekKey", () => {
  it("returns YYYY-MM-DD format", () => {
    const key = getWeekKey(0);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("different offsets produce different keys", () => {
    expect(getWeekKey(0)).not.toBe(getWeekKey(1));
  });
});

describe("formatWeekRange", () => {
  it("formats same-month range", () => {
    const dates = [
      new Date(2026, 1, 9), // Feb 9
      new Date(2026, 1, 10),
      new Date(2026, 1, 11),
      new Date(2026, 1, 12),
      new Date(2026, 1, 13),
      new Date(2026, 1, 14),
      new Date(2026, 1, 15), // Feb 15
    ];
    const result = formatWeekRange(dates);
    expect(result).toContain("9");
    expect(result).toContain("15");
    expect(result).toContain("2026");
  });

  it("formats cross-month range", () => {
    const dates = [
      new Date(2026, 0, 26), // Jan 26
      new Date(2026, 0, 27),
      new Date(2026, 0, 28),
      new Date(2026, 0, 29),
      new Date(2026, 0, 30),
      new Date(2026, 0, 31),
      new Date(2026, 1, 1), // Feb 1
    ];
    const result = formatWeekRange(dates);
    expect(result).toContain("Jan");
    expect(result).toContain("Feb");
    expect(result).toContain("2026");
  });
});

describe("generateICS", () => {
  it("generates valid calendar wrapper", () => {
    const tiles = initialTiles();
    const dates = getWeekDates(0);
    const ics = generateICS(tiles, dates);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("PRODID:-//Win the Week//Planner//EN");
  });

  it("includes DESCRIPTION for meal tiles", () => {
    const tiles = initialTiles();
    tiles.Monday = [{
      id: "tile-100", label: "Grilled Chicken", type: "meal",
      mealType: "Dinner", ingredients: "chicken, rice",
      calories: "500", notes: "Grill 10 min",
      startTime: "6:00 PM", duration: "1 hr",
      color: { bg: "#fff", border: "#000", text: "#000" },
    }];
    const dates = getWeekDates(0);
    const ics = generateICS(tiles, dates);
    expect(ics).toContain("DESCRIPTION:");
    expect(ics).toContain("Dinner");
    expect(ics).toContain("chicken, rice");
  });

  it("omits DESCRIPTION for task tiles", () => {
    const tiles = initialTiles();
    tiles.Monday = [{
      id: "tile-101", label: "Workout", type: "task",
      startTime: "7:00 AM", duration: "1 hr",
      color: { bg: "#fff", border: "#000", text: "#000" },
    }];
    const dates = getWeekDates(0);
    const ics = generateICS(tiles, dates);
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("generates all-day event for tiles without time", () => {
    const tiles = initialTiles();
    tiles.Monday = [{
      id: "tile-102", label: "Read", type: "task",
      startTime: "No time", duration: "No duration",
      color: { bg: "#fff", border: "#000", text: "#000" },
    }];
    const dates = getWeekDates(0);
    const ics = generateICS(tiles, dates);
    expect(ics).toContain("DTSTART;VALUE=DATE:");
  });

  it("generates timed event for tiles with time", () => {
    const tiles = initialTiles();
    tiles.Monday = [{
      id: "tile-103", label: "Meeting", type: "task",
      startTime: "9:00 AM", duration: "30 min",
      color: { bg: "#fff", border: "#000", text: "#000" },
    }];
    const dates = getWeekDates(0);
    const ics = generateICS(tiles, dates);
    expect(ics).toContain("DTSTART:");
    expect(ics).toContain("DTEND:");
    expect(ics).not.toContain("DTSTART;VALUE=DATE:");
  });
});

describe("parseIngredients", () => {
  it("returns empty array for no meals", () => {
    const tiles = initialTiles();
    expect(parseIngredients(tiles)).toEqual([]);
  });

  it("extracts and lowercases ingredients", () => {
    const tiles = initialTiles();
    tiles.Monday = [{
      type: "meal", label: "Lunch",
      ingredients: "Chicken, Rice",
    }];
    const items = parseIngredients(tiles);
    expect(items.map((i) => i.name)).toEqual(["chicken", "rice"]);
  });

  it("deduplicates across days", () => {
    const tiles = initialTiles();
    tiles.Monday = [{ type: "meal", label: "Lunch", ingredients: "chicken, rice" }];
    tiles.Tuesday = [{ type: "meal", label: "Dinner", ingredients: "chicken, broccoli" }];
    const items = parseIngredients(tiles);
    const chicken = items.find((i) => i.name === "chicken");
    expect(chicken.meals).toHaveLength(2);
  });

  it("tracks source meals", () => {
    const tiles = initialTiles();
    tiles.Monday = [{ type: "meal", label: "Grilled Chicken", ingredients: "chicken" }];
    const items = parseIngredients(tiles);
    expect(items[0].meals[0]).toContain("Monday");
    expect(items[0].meals[0]).toContain("Grilled Chicken");
  });

  it("sorts alphabetically", () => {
    const tiles = initialTiles();
    tiles.Monday = [{ type: "meal", label: "Lunch", ingredients: "zucchini, apple, banana" }];
    const items = parseIngredients(tiles);
    expect(items.map((i) => i.name)).toEqual(["apple", "banana", "zucchini"]);
  });

  it("skips task tiles", () => {
    const tiles = initialTiles();
    tiles.Monday = [{ type: "task", label: "Workout", ingredients: "not food" }];
    expect(parseIngredients(tiles)).toEqual([]);
  });

  it("skips empty ingredient strings", () => {
    const tiles = initialTiles();
    tiles.Monday = [{ type: "meal", label: "Lunch", ingredients: ",  , " }];
    expect(parseIngredients(tiles)).toEqual([]);
  });
});

describe("initialTiles", () => {
  it("returns object with 7 day keys", () => {
    const tiles = initialTiles();
    expect(Object.keys(tiles)).toHaveLength(7);
    for (const day of DAYS) {
      expect(tiles[day]).toEqual([]);
    }
  });

  it("returns fresh object each time", () => {
    const a = initialTiles();
    const b = initialTiles();
    expect(a).not.toBe(b);
  });
});

describe("uid", () => {
  it("returns unique ids", () => {
    setIdCounter(1000);
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
  });

  it("returns tile- prefixed ids", () => {
    setIdCounter(2000);
    expect(uid()).toMatch(/^tile-\d+$/);
  });
});
