import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadWeek,
  saveWeek,
  loadRecurring,
  saveRecurring,
  syncIdCounter,
  loadOrPopulateWeek,
} from "../storage";
import { DAYS, STORAGE_KEY, RECURRING_KEY } from "../constants";
import { getIdCounter, setIdCounter } from "../utils";

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get _store() { return store; },
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  setIdCounter(1);
});

describe("loadWeek", () => {
  it("returns null when storage is empty", () => {
    expect(loadWeek("2026-02-09")).toBeNull();
  });

  it("returns null for non-existent week key", () => {
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ "2026-02-02": {} }));
    expect(loadWeek("2026-02-09")).toBeNull();
  });

  it("returns saved week data", () => {
    const weekData = { Monday: [{ id: "tile-1", label: "Test" }] };
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ "2026-02-09": weekData }));
    expect(loadWeek("2026-02-09")).toEqual(weekData);
  });

  it("handles corrupt JSON gracefully", () => {
    localStorageMock.setItem(STORAGE_KEY, "not valid json{{{");
    expect(loadWeek("2026-02-09")).toBeNull();
  });
});

describe("saveWeek", () => {
  it("persists to localStorage under correct key", () => {
    const weekData = { Monday: [{ id: "tile-1", label: "Test" }] };
    saveWeek("2026-02-09", weekData);

    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
    expect(stored["2026-02-09"]).toEqual(weekData);
  });

  it("preserves existing week data", () => {
    const oldData = { Monday: [{ id: "tile-1" }] };
    const newData = { Monday: [{ id: "tile-2" }] };
    saveWeek("2026-02-02", oldData);
    saveWeek("2026-02-09", newData);

    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEY));
    expect(stored["2026-02-02"]).toEqual(oldData);
    expect(stored["2026-02-09"]).toEqual(newData);
  });
});

describe("loadRecurring", () => {
  it("returns initialTiles when storage is empty", () => {
    const result = loadRecurring();
    expect(Object.keys(result)).toHaveLength(7);
    for (const day of DAYS) {
      expect(result[day]).toEqual([]);
    }
  });

  it("returns saved recurring templates", () => {
    const templates = { Monday: [{ label: "Standup", recurring: true }] };
    for (const d of DAYS) if (!templates[d]) templates[d] = [];
    localStorageMock.setItem(RECURRING_KEY, JSON.stringify(templates));

    const result = loadRecurring();
    expect(result.Monday).toHaveLength(1);
    expect(result.Monday[0].label).toBe("Standup");
  });

  it("handles corrupt JSON gracefully", () => {
    localStorageMock.setItem(RECURRING_KEY, "corrupt!!!");
    const result = loadRecurring();
    expect(Object.keys(result)).toHaveLength(7);
  });
});

describe("saveRecurring", () => {
  it("persists templates to localStorage", () => {
    const templates = { Monday: [{ label: "Standup" }] };
    saveRecurring(templates);
    expect(JSON.parse(localStorageMock.getItem(RECURRING_KEY))).toEqual(templates);
  });
});

describe("syncIdCounter", () => {
  it("advances counter past highest tile id", () => {
    setIdCounter(1);
    const tiles = {};
    for (const d of DAYS) tiles[d] = [];
    tiles.Monday = [{ id: "tile-50" }, { id: "tile-100" }];

    syncIdCounter(tiles);
    expect(getIdCounter()).toBe(101);
  });

  it("does nothing if counter is already ahead", () => {
    setIdCounter(200);
    const tiles = {};
    for (const d of DAYS) tiles[d] = [];
    tiles.Monday = [{ id: "tile-50" }];

    syncIdCounter(tiles);
    expect(getIdCounter()).toBe(200);
  });

  it("handles tiles without ids", () => {
    setIdCounter(1);
    const tiles = {};
    for (const d of DAYS) tiles[d] = [];
    tiles.Monday = [{ label: "No ID" }];

    syncIdCounter(tiles);
    expect(getIdCounter()).toBe(1);
  });

  it("handles empty days", () => {
    setIdCounter(1);
    const tiles = {};
    for (const d of DAYS) tiles[d] = [];

    syncIdCounter(tiles);
    expect(getIdCounter()).toBe(1);
  });
});

describe("loadOrPopulateWeek", () => {
  it("returns saved week if exists", () => {
    const weekData = {};
    for (const d of DAYS) weekData[d] = [];
    weekData.Monday = [{ id: "tile-5", label: "Saved task" }];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ "2026-02-09": weekData }));

    const result = loadOrPopulateWeek("2026-02-09");
    expect(result.Monday[0].label).toBe("Saved task");
  });

  it("populates from recurring if no saved week", () => {
    const templates = {};
    for (const d of DAYS) templates[d] = [];
    templates.Monday = [{ label: "Standup", recurring: true, recurringId: "rec-tile-1" }];
    localStorageMock.setItem(RECURRING_KEY, JSON.stringify(templates));

    const result = loadOrPopulateWeek("2026-02-09");
    expect(result.Monday).toHaveLength(1);
    expect(result.Monday[0].label).toBe("Standup");
    // Gets a new id
    expect(result.Monday[0].id).toMatch(/^tile-/);
    // Preserves recurringId
    expect(result.Monday[0].recurringId).toBe("rec-tile-1");
  });

  it("returns empty tiles if no saved week and no recurring", () => {
    const result = loadOrPopulateWeek("2026-02-09");
    for (const d of DAYS) {
      expect(result[d]).toEqual([]);
    }
  });

  it("syncs id counter on load", () => {
    setIdCounter(1);
    const weekData = {};
    for (const d of DAYS) weekData[d] = [];
    weekData.Monday = [{ id: "tile-75", label: "Test" }];
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ "2026-02-09": weekData }));

    loadOrPopulateWeek("2026-02-09");
    expect(getIdCounter()).toBe(76);
  });
});
