import { useEffect, useRef, useState } from "react";

function format(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function CountdownTimer({
  initialSeconds = 0,
  onComplete,
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [running, onComplete]);

  return (
    <div>
      <div data-testid="time">{format(seconds)}</div>

      <button onClick={() => setRunning(true)}>Start</button>
      <button onClick={() => setRunning(false)}>Pause</button>
      <button
        onClick={() => {
          setRunning(false);
          setSeconds(initialSeconds);
        }}
      >
        Reset
      </button>
    </div>
  );
}
