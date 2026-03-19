import { useEffect, useRef } from "react";
import "../styles/radialbar.css";

export default function RadialBar({ label, value, gradientColors, tooltip, largeDial }) {
  const circleRef = useRef(null);

  
  const safeLabelId = label ? label.replace(/\s+/g, '-') : 'default';

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
  }, [value]);

  
  const sizeStyle = {
    width: "100%",
    height: "100%",
    maxWidth: largeDial ? "200px" : "120px",
    maxHeight: largeDial ? "200px" : "120px",
    aspectRatio: "1 / 1" // Keeps the wrapper perfectly square
  };

  return (
    <div className="radialbar-wrapper" title={tooltip} style={sizeStyle}>
      <svg className="radialbar-svg" viewBox="0 0 120 120">
        <defs>
          <linearGradient id={`grad-${safeLabelId}`} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientColors.map((c, idx) => (
              <stop 
                key={idx} 
                offset={`${(idx / (gradientColors.length - 1)) * 100}%`} 
                stopColor={c} 
              />
            ))}
          </linearGradient>
        </defs>
        <circle className="radialbar-bg" cx="60" cy="60" r="50" />
        <circle 
          ref={circleRef} 
          className="radialbar-progress" 
          cx="60" 
          cy="60" 
          r="50" 
          stroke={`url(#grad-${safeLabelId})`} 
        />
      </svg>
      <div className="radialbar-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
    </div>
  );
}

