import { useState, useEffect, useRef } from "react";

export default function useTimer() {
  const [time, setTime] = useState(0);
  const intervalRef = useRef(null);

  const start = () => {
    clearInterval(intervalRef.current);
    setTime(0);
    intervalRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };

  const reset = () => setTime(0);
  const stop = () => clearInterval(intervalRef.current);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return { time, start, reset, stop };
}

