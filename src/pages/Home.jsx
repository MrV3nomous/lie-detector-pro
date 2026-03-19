import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export default function Home() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const floatingRef = useRef(null);
  const contentRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const densityCount = Math.floor((window.innerWidth * window.innerHeight) / 8000);
      const safeParticleCount = clamp(densityCount, 40, 150);
      
      particlesRef.current = Array.from({ length: safeParticleCount }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    const mousePos = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (e) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;

      const layers = floatingRef.current?.children;
      if (layers) {
        Array.from(layers).forEach((el, idx) => {
          const speed = (idx + 1) * 0.02;
          el.style.transform = `translate3d(${(mousePos.x - canvas.width/2) * speed}px, ${(mousePos.y - canvas.height/2) * speed}px, 0)`;
        });
      }

      const contentLayers = contentRef.current?.children;
      if (contentLayers) {
        Array.from(contentLayers).forEach((el, idx) => {
          const factor = (idx + 1) * 0.015;
          el.style.transform = `translate3d(${(mousePos.x - canvas.width/2) * factor}px, ${(mousePos.y - canvas.height/2) * factor}px, 0)`;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,255,0.3)";
        ctx.fill();


        particlesRef.current.forEach((q) => {
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,255,255,${0.1 - dist / 1200})`;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        });

        const dx = p.x - mousePos.x;
        const dy = p.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,255,${0.5 - dist / 240})`;
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,255,255,${0.2 - dist / 600})`;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", setCanvasDimensions);
      cancelAnimationFrame(animationFrameId); // Kills the infinite loop
    };
  }, []);

  return (
    <div className="home-wrapper">
      <canvas ref={canvasRef} className="home-bg-canvas"></canvas>

      <div className="home-floating-layers" ref={floatingRef}>
        <span className="home-floating-text">Integrity</span>
        <span className="home-floating-text">Cognition</span>
        <span className="home-floating-text">Linguistics</span>
        <span className="home-hud-icon">⚡</span>
        <span className="home-hud-icon">🛰️</span>
        <span className="home-hud-icon">🔹</span>
      </div>

      <div className="home-content" ref={contentRef}>
        <h1 className="home-hud-title glitch">
          Lie Detector
        </h1>

        <p className="home-subtitle">
          Create your own questions, share with friends, and uncover the truth.
        </p>

        <button
          onClick={() => navigate("/create")}
          className="home-start-btn"
        >
          Start Session
        </button>

        <p className="home-hint">
          Viral fun for couples & friends — see who's honest.
        </p>
      </div>
    </div>
  );
}

