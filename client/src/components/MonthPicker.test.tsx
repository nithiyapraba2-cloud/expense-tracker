import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthPicker from "./MonthPicker";

describe("MonthPicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12)); // October 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the selected month", () => {
    render(<MonthPicker value="2026-08" onChange={() => {}} />);
    expect(screen.getByText("August 2026")).toBeInTheDocument();
  });

  it("goes to the previous month", async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-01" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Previous month"));

    expect(onChange).toHaveBeenCalledWith("2025-12");
  });

  it("goes to the next month when it is in the past", async () => {
    const onChange = vi.fn();
    render(<MonthPicker value="2026-08" onChange={onChange} />);

    await userEvent.click(screen.getByLabelText("Next month"));

    expect(onChange).toHaveBeenCalledWith("2026-09");
  });

  it("can't go past the current month", () => {
    render(<MonthPicker value="2026-10" onChange={() => {}} />);

    expect(screen.getByLabelText("Next month")).toBeDisabled();
    expect(screen.getByLabelText("Previous month")).toBeEnabled();
  });
});
