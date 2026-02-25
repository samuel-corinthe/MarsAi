import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import CountdownTimer from "../CountdownTimer";

function getTimeEl() {
  return screen.getByTestId("time");
}

async function advance(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("affiche le temps initial (MM:SS)", () => {
    render(<CountdownTimer initialSeconds={90} />);
    expect(getTimeEl()).toHaveTextContent("01:30");
  });

  it("decremente chaque seconde quand on demarre", async () => {
    render(<CountdownTimer initialSeconds={5} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await advance(1000);
    expect(getTimeEl()).toHaveTextContent("00:04");

    await advance(2000);
    expect(getTimeEl()).toHaveTextContent("00:02");
  });

  it("pause stop la descente du temps", async () => {
    render(<CountdownTimer initialSeconds={5} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await advance(1000);
    expect(getTimeEl()).toHaveTextContent("00:04");

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));

    await advance(2000);
    expect(getTimeEl()).toHaveTextContent("00:04");
  });

  it("ne descend jamais sous 00:00", async () => {
    render(<CountdownTimer initialSeconds={1} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await advance(1000);
    expect(getTimeEl()).toHaveTextContent("00:00");

    await advance(5000);
    expect(getTimeEl()).toHaveTextContent("00:00");
  });

  it("onComplete se lance 1 seule fois a la fin", async () => {
    const onComplete = vi.fn();

    render(<CountdownTimer initialSeconds={2} onComplete={onComplete} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await advance(2000);
    expect(getTimeEl()).toHaveTextContent("00:00");

    await advance(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("reset remet le temps initial", async () => {
    render(<CountdownTimer initialSeconds={10} />);

    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await advance(3000);
    expect(getTimeEl()).toHaveTextContent("00:07");

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(getTimeEl()).toHaveTextContent("00:10");
  });
});
