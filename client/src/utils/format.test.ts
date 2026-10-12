import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentMonth,
  formatDate,
  formatDayHeading,
  formatINR,
  formatINRCompact,
  formatMonth,
  formatMonthMedium,
  formatMonthShort,
  monthRange,
  shiftMonth,
  todayISO,
} from "./format";

describe("formatINR", () => {
  it("drops .00 on whole rupees", () => {
    expect(formatINR(45000)).toBe("₹45,000");
  });

  it("keeps two decimals for paise", () => {
    expect(formatINR(658.5)).toBe("₹658.50");
  });

  it("uses Indian digit grouping (lakhs)", () => {
    expect(formatINR(150000)).toBe("₹1,50,000");
  });

  it("formats negatives and zero", () => {
    expect(formatINR(-200)).toBe("-₹200");
    expect(formatINR(0)).toBe("₹0");
  });
});

describe("formatINRCompact", () => {
  it("shortens thousands and lakhs for chart axes", () => {
    expect(formatINRCompact(45000)).toBe("₹45K");
    expect(formatINRCompact(150000)).toBe("₹1.5L");
  });
});

describe("formatDate", () => {
  it("turns ISO into dd/mm/yyyy", () => {
    expect(formatDate("2026-10-09")).toBe("09/10/2026");
  });
});

describe("month labels", () => {
  it("formats long, medium and short month names", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonthMedium("2026-10")).toBe("Oct 2026");
    expect(formatMonthShort("2026-10")).toBe("Oct 26");
  });
});

describe("shiftMonth", () => {
  it("moves forward and back within a year", () => {
    expect(shiftMonth("2026-05", 1)).toBe("2026-06");
    expect(shiftMonth("2026-05", -1)).toBe("2026-04");
  });

  it("crosses year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });

  it("handles jumps larger than a year", () => {
    expect(shiftMonth("2026-03", -14)).toBe("2025-01");
  });
});

describe("monthRange", () => {
  it("covers the whole month", () => {
    expect(monthRange("2026-10")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(monthRange("2026-04")).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });

  it("knows February in normal and leap years", () => {
    expect(monthRange("2026-02").to).toBe("2026-02-28");
    expect(monthRange("2028-02").to).toBe("2028-02-29");
  });
});

describe("date helpers that depend on today", () => {
  beforeEach(() => {
    // Only fake Date; real timers keep everything else working
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 10, 30)); // 12 Oct 2026, local time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("todayISO and currentMonth use local time", () => {
    expect(todayISO()).toBe("2026-10-12");
    expect(currentMonth()).toBe("2026-10");
  });

  it("todayISO zero-pads month and day", () => {
    vi.setSystemTime(new Date(2026, 0, 5));
    expect(todayISO()).toBe("2026-01-05");
  });

  it("labels today and yesterday by name", () => {
    expect(formatDayHeading("2026-10-12")).toBe("Today");
    expect(formatDayHeading("2026-10-11")).toBe("Yesterday");
  });

  it("labels older days with weekday, day and month", () => {
    expect(formatDayHeading("2026-10-09")).toBe("Fri, 9 Oct");
  });

  it("knows yesterday across a month boundary", () => {
    vi.setSystemTime(new Date(2026, 10, 1)); // 1 Nov
    expect(formatDayHeading("2026-10-31")).toBe("Yesterday");
  });
});
