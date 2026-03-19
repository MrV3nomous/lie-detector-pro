import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/createSession.css";

const getUserId = () => {
  let userId = localStorage.getItem("user_id");
  if (!userId) {
    userId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("user_id", userId);
  }
  return userId;
};


const generateQId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'q_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export default function CreateSession() {
  const [questions, setQuestions] = useState([{ id: generateQId(), text: "" }]);
  
  const [sessionId, setSessionId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [locked, setLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionLink, setSessionLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success", 
  });

  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  const floatingRef = useRef(null);
  const particlesRef = useRef([]); 

  
  const userId = useRef(getUserId()).current;

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 2500);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchExistingSession = async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("id, session_token, questions")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        if (data) {
          if (data.questions && data.questions.length > 0) {
            const upgradedQuestions = data.questions.map((q) => {
              if (typeof q === 'string') return { id: generateQId(), text: q };
              if (typeof q === 'object' && q !== null) return { id: q.id || generateQId(), text: q.text || "" };
              return { id: generateQId(), text: "" };
            });
            setQuestions(upgradedQuestions);
          } else {
            setQuestions([{ id: generateQId(), text: "" }]);
          }

          setSessionId(data.id);
          setSessionToken(data.session_token);
          setSessionLink(`${window.location.origin}/session/${data.session_token}`);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        if (isMounted) setErrorMessage("Failed to load existing session.");
      }
    };

    fetchExistingSession();

    return () => {
      isMounted = false;
    };
  }, [userId]);



  // Canvas Logic with robust resize handling

  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const densityCount = Math.floor((window.innerWidth * window.innerHeight) / 10000);
      const safeParticleCount = Math.max(40, Math.min(250, densityCount));
      
      particlesRef.current = Array.from({ length: safeParticleCount }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      }));
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const layers = floatingRef.current?.children;
      if (layers) {
        Array.from(layers).forEach((el, idx) => {
          const speed = (idx + 1) * 0.015;
          el.style.transform = `translate3d(${(mouseX - canvas.width / 2) * speed}px, ${
            (mouseY - canvas.height / 2) * speed
          }px, 0)`;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      if (!ctx) return;
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
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    
    return () => {
      window.removeEventListener("resize", setCanvasDimensions);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const addQuestion = () => setQuestions([...questions, { id: generateQId(), text: "" }]);

  const handleChange = (index, value) => {
    const newQs = [...questions];
    newQs[index].text = value; 
    setQuestions(newQs);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const createOrUpdateSession = async () => {
    setErrorMessage("");
    
    const filteredQs = questions
      .map(q => ({ ...q, text: q.text.trim() }))
      .filter((q) => q.text !== "");

    if (!filteredQs.length) {
      setErrorMessage("Please add at least one valid question.");
      showToast("Add at least one valid question", "error");
      return;
    }

    setIsLoading(true);

    try {
      if (sessionId) {
        let localEditToken = localStorage.getItem(`edit_token_${sessionId}`);

        if (!localEditToken) {
          const { data, error } = await supabase
            .from("sessions")
            .select("edit_token")
            .eq("id", sessionId)
            .single();

          if (error || !data?.edit_token) throw new Error("Cannot recover edit access.");
          localEditToken = data.edit_token;
          localStorage.setItem(`edit_token_${sessionId}`, localEditToken);
        }

        const { error } = await supabase.rpc("update_session", {
          p_session_id: sessionId,
          p_edit_token: localEditToken,
          p_questions: filteredQs, 
        });

        if (error) throw error;

        setQuestions(filteredQs);
        showToast("Session updated successfully!", "success");
      } else {
        const newToken = Math.random().toString(36).substring(2, 10);

        const { data, error } = await supabase
          .from("sessions")
          .insert([
            {
              user_id: userId,
              session_token: newToken,
              questions: filteredQs, 
            },
          ])
          .select("id, session_token, edit_token")
          .single();

        if (error) throw error;

        localStorage.setItem(`edit_token_${data.id}`, data.edit_token);

        setSessionId(data.id);
        setSessionToken(data.session_token);
        setSessionLink(`${window.location.origin}/session/${data.session_token}`);
        
        setQuestions(filteredQs);
        showToast("Session created successfully!", "success");
      }
    } catch (err) {
      setErrorMessage(`Database error: ${err.message}`);
      showToast(err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sessionLink);
    showToast("Link copied!", "success");
  };

  return (
    <div className="create-wrapper">
      <canvas ref={canvasRef} className="create-bg-canvas"></canvas>

      <div className="create-floating-layers" ref={floatingRef}>
        <span className="create-floating-text">Integrity</span>
        <span className="create-floating-text">Cognition</span>
        <span className="create-floating-text">Linguistics</span>
        <span className="create-hud-icon">⚡</span>
        <span className="create-hud-icon">🛰️</span>
        <span className="create-hud-icon">🔹</span>
      </div>

      <div className="create-content">
        <h2 className="create-hud-title">Create Questions</h2>

        {questions.map((q, i) => (
          <div key={q.id} className="create-question-row">
            <textarea
              value={q.text} 
              onChange={(e) => handleChange(i, e.target.value)}
              placeholder={`Question ${i + 1}`}
              className="create-question-box"
              style={{ textAlign: "center" }}
            />
            {!locked && questions.length > 1 && (
              <span
                className="create-remove-btn"
                onClick={() => removeQuestion(i)}
              >
                ×
              </span>
            )}
          </div>
        ))}

        <div className="create-btn-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="create-add-btn" onClick={addQuestion}>
            ➕ Add Question
          </button>

          <button
            className="create-start-btn"
            onClick={createOrUpdateSession}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : sessionId
              ? "💾 Update Session"
              : "🔗 Generate Link"}
          </button>

          {/* FIX: New "View Results" Bridge Button */}
          {sessionToken && (
            <button
              className="create-start-btn"
              style={{ backgroundColor: "rgba(0, 255, 255, 0.15)", color:"#fff", border: "1px solid #0ff" }}
              onClick={() => navigate("/results", { state: { sessionToken } })}
            >
              📊 View Results
            </button>
          )}
        </div>

        {sessionLink && (
          <div className="create-link-wrapper" style={{ marginTop: "30px" }}>
            <p style={{ color: "white", textAlign: "center" }}>
              🚀 Send this link and watch people reveal what they really think.
            </p>

            <br />

            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                readOnly
                value={sessionLink}
                className="create-link-input"
                style={{ flexGrow: 1 }}
              />
              <button className="create-copy-btn" onClick={copyLink}>
                📋 Copy
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="create-error-message">
            ⚠️ {errorMessage}
          </div>
        )}
      </div>

      <div
        className={`create-toast ${toast.show ? "show" : ""} ${
          toast.type === "error" ? "error" : "success"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}

