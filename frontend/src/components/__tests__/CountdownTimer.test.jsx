import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CountdownTimer from "../CountdownTimer";

function getTimeEl() {
  return screen.getByTestId("time");
}

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("affiche le temps initial (MM:SS)", () => {
    render(<CountdownTimer initialSeconds={90} />);
    expect(getTimeEl()).toHaveTextContent("01:30");
  });

  it("décrémente chaque seconde quand on démarre", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CountdownTimer initialSeconds={5} />);
    await user.click(screen.getByRole("button", { name: /start/i }));

    vi.advanceTimersByTime(1000);
    expect(getTimeEl()).toHaveTextContent("00:04");

    vi.advanceTimersByTime(2000);
    expect(getTimeEl()).toHaveTextContent("00:02");
  });

  it("pause stoppe la décrémentation", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CountdownTimer initialSeconds={5} />);
    await user.click(screen.getByRole("button", { name: /start/i }));

    vi.advanceTimersByTime(1000);
    expect(getTimeEl()).toHaveTextContent("00:04");

    await user.click(screen.getByRole("button", { name: /pause/i }));
    vi.advanceTimersByTime(2000);

    expect(getTimeEl()).toHaveTextContent("00:04");
  });

  it("ne descend jamais sous 00:00", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CountdownTimer initialSeconds={1} />);
    await user.click(screen.getByRole("button", { name: /start/i }));

    vi.advanceTimersByTime(1000);
    expect(getTimeEl()).toHaveTextContent("00:00");

    vi.advanceTimersByTime(5000);
    expect(getTimeEl()).toHaveTextContent("00:00");
  });

  it("appelle onComplete exactement une fois à la fin", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onComplete = vi.fn();

    render(<CountdownTimer initialSeconds={2} onComplete={onComplete} />);
    await user.click(screen.getByRole("button", { name: /start/i }));

    vi.advanceTimersByTime(2000);
    expect(getTimeEl()).toHaveTextContent("00:00");
    vi.advanceTimersByTime(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("reset remet le temps initial", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CountdownTimer initialSeconds={10} />);
    await user.click(screen.getByRole("button", { name: /start/i }));

    vi.advanceTimersByTime(3000);
    expect(getTimeEl()).toHaveTextContent("00:07");

    await user.click(screen.getByRole("button", { name: /reset/i }));
    expect(getTimeEl()).toHaveTextContent("00:10");
  });
});
