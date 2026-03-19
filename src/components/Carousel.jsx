import { useState } from "react";
import "../styles/carousel.css";

export default function Carousel({ items, selectedIndex, onSelect }) {
  const [current, setCurrent] = useState(selectedIndex || 0);

  const prev = () => {
    const idx = (current - 1 + items.length) % items.length;
    setCurrent(idx);
    onSelect(idx);
  };

  const next = () => {
    const idx = (current + 1) % items.length;
    setCurrent(idx);
    onSelect(idx);
  };

  return (
    <div className="carousel-wrapper">
      <button className="carousel-btn left" onClick={prev}>&lt;</button>
      <div className="carousel-track">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`carousel-item ${idx === current ? "active" : ""}`}
            onClick={() => { setCurrent(idx); onSelect(idx); }}
          >
            <div className="carousel-avatar">{item.name.charAt(0)}</div>
            <div className="carousel-name">{item.name}</div>
            <div className="carousel-integrity">{item.integrity}%</div>
          </div>
        ))}
      </div>
      <button className="carousel-btn right" onClick={next}>&gt;</button>
    </div>
  );
}
