import { describe, expect, it } from "vitest";
import { getNextPage, groupByDate } from "./transactions";
import { makeTransaction } from "../test/fixtures";

describe("groupByDate", () => {
  it("returns an empty list for no transactions", () => {
    expect(groupByDate([])).toEqual([]);
  });

  it("puts same-day transactions under one date, keeping order", () => {
    const a = makeTransaction({ date: "2026-10-12" });
    const b = makeTransaction({ date: "2026-10-12" });
    const c = makeTransaction({ date: "2026-10-10" });

    expect(groupByDate([a, b, c])).toEqual([
      ["2026-10-12", [a, b]],
      ["2026-10-10", [c]],
    ]);
  });

  it("merges a day that spans two loaded pages into one group", () => {
    // Page 1 ends and page 2 starts on the same day
    const page1 = [makeTransaction({ date: "2026-10-12" })];
    const page2 = [
      makeTransaction({ date: "2026-10-12" }),
      makeTransaction({ date: "2026-10-11" }),
    ];

    const groups = groupByDate([...page1, ...page2]);

    expect(groups.map(([date]) => date)).toEqual(["2026-10-12", "2026-10-11"]);
    expect(groups[0][1]).toHaveLength(2);
  });
});

describe("getNextPage", () => {
  const page = (page: number, total: number, limit = 20) => ({
    data: [],
    page,
    limit,
    total,
  });

  it("asks for the next page while rows remain", () => {
    expect(getNextPage(page(1, 47))).toBe(2);
    expect(getNextPage(page(2, 47))).toBe(3);
  });

  it("stops after the last page", () => {
    expect(getNextPage(page(3, 47))).toBeUndefined();
  });

  it("stops when the total is an exact multiple of the limit", () => {
    expect(getNextPage(page(2, 40))).toBeUndefined();
  });

  it("stops when there is nothing at all", () => {
    expect(getNextPage(page(1, 0))).toBeUndefined();
  });
});
