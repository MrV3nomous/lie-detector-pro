import { useEffect, useState } from "react";
import "../styles/floatinghud.css";

export default function FloatingHUD({ floatingRef }) {
  const [positions, setPositions] = useState(
    Array.from({ length: 8 }, () => ({ x: Math.random()*100, y: Math.random()*100 }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((p) => ({
          x: (p.x + (Math.random() - 0.5) * 5) % 100,
          y: (p.y + (Math.random() - 0.5) * 5) % 100,
        }))
      );
    }, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={floatingRef}>
      {positions.map((p, idx) => (
        <div
          key={idx}
          className="floating-hud-icon"
          style={{ top: `${p.y}%`, left: `${p.x}%` }}
        />
      ))}
    </div>
  );
}
