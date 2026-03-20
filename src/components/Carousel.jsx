import { useState, useEffect, useRef } from "react";
import "../styles/carousel.css";

export default function Carousel({ items, selectedIndex, onSelect }) {
  const [current, setCurrent] = useState(selectedIndex || 0);
  const trackRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (selectedIndex !== undefined && selectedIndex !== current) {
      setCurrent(selectedIndex);
    }
  }, [selectedIndex, current]);

  useEffect(() => {
    if (itemRefs.current[current]) {
      itemRefs.current[current].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
  }, [current]);

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
      <div className="carousel-track" ref={trackRef}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => (itemRefs.current[idx] = el)}
            className={`carousel-item ${idx === current ? "active" : ""}`}
            onClick={() => { 
              setCurrent(idx); 
              onSelect(idx); 
            }}
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
