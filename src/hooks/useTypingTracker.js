import { useState, useRef, useCallback } from "react";

export default function useTypingTracker() {
  const initialState = {
    startTime: null,
    totalTime: 0,
    keystrokes: 0,
    backspaces: 0,
    pauses: 0,
  };

  const [typingData, setTypingData] = useState(initialState);
  const typingDataRef = useRef(initialState);
  const lastKeyTimeRef = useRef(null);

  const trackTyping = useCallback((e) => {
    if (!e || !e.key) return;

    const now = Date.now();
    const currentData = typingDataRef.current;

    if (!currentData.startTime) {
      currentData.startTime = now;
    }

    if (lastKeyTimeRef.current && now - lastKeyTimeRef.current > 1500) {
      currentData.pauses += 1;
    }

    if (e.key === "Backspace") {
      currentData.backspaces += 1;
    }

    currentData.keystrokes += 1;
    lastKeyTimeRef.current = now;

    setTypingData({ ...currentData });
  }, []);

  const finalize = useCallback(() => {
    const now = Date.now();
    const currentData = typingDataRef.current;
    
    currentData.totalTime = currentData.startTime ? now - currentData.startTime : 0;
    setTypingData({ ...currentData });
  }, []);

  const getTypingData = useCallback(() => {
    return { ...typingDataRef.current };
  }, []);

  const reset = useCallback(() => {
    lastKeyTimeRef.current = null;
    typingDataRef.current = { ...initialState };
    setTypingData({ ...initialState });
  }, []);

  return { typingData, trackTyping, finalize, reset, getTypingData };
}

