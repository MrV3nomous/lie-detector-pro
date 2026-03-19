import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/answerSession.css";

import useTimer from "../hooks/useTimer";
import useTypingTracker from "../hooks/useTypingTracker";

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


const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export default function AnswerSession() {
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [toastQueue, setToastQueue] = useState([]);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const [name, setName] = useState("");
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refreshCount, setRefreshCount] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const canvasRef = useRef(null);
  const floatingRef = useRef(null);
  const particlesRef = useRef([]); // Stable particle array reference

  const navigate = useNavigate();
  const { sessionToken } = useParams();
  
  const userId = useRef(getUserId()).current;

  const { time, start: startTimer, stop: stopTimer } = useTimer();
  const { trackTyping, finalize: finalizeTyping, reset: resetTyping, getTypingData } = useTypingTracker();

  const showToast = (message, type = "success") => {
    setToastQueue((prev) => [...prev, { message, type }]);
  };

  useEffect(() => {
    if (toastQueue.length === 0) return;

    setIsToastVisible(true);
    let shiftTimer;

    const displayTimer = setTimeout(() => {
      setIsToastVisible(false);

      shiftTimer = setTimeout(() => {
        setToastQueue((prev) => prev.slice(1));
      }, 300);
    }, 2200);

    return () => {
      clearTimeout(displayTimer);
      if (shiftTimer) clearTimeout(shiftTimer);
    };
  }, [toastQueue]);

 


  // Fetch & Hydrate (localStorage)

  useEffect(() => {
    let isMounted = true;

    const fetchSessionData = async () => {
      try {
        setIsFetching(true);

        const { data: existingResponse } = await supabase
          .from("responses")
          .select("id")
          .eq("session_id", sessionToken)
          .eq("user_id", userId)
          .maybeSingle();

        if (existingResponse) {
          navigate("/results", { state: { sessionToken, user_id: userId } });
          return;
        }

        const { data, error } = await supabase
          .from("sessions")
          .select("questions")
          .eq("session_token", sessionToken)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted) return;

        if (!data || !data.questions) {
          setErrorMessage("This session does not exist or the link is invalid.");
          return;
        }

        setQuestions(data.questions);

        const initAnswers = data.questions.map((q) => ({
          question_id: q && typeof q === 'object' ? q.id : null,
          text: "",
          timeTaken: 0
        }));

        const savedStateRaw = localStorage.getItem(`interrogation_${sessionToken}`);
        if (savedStateRaw) {
          try {
            const savedState = JSON.parse(savedStateRaw);
            const { savedAnswers, savedIndex, savedName, isStarted } = savedState;
            setAnswers(savedAnswers);
            setCurrentIndex(savedIndex < data.questions.length ? savedIndex : 0);
            setName(savedName || "");

            if (isStarted && savedIndex < data.questions.length) {
              setShowQuestions(true);
              startTimer();
              showToast("Session recovered.", "success");
            }
          } catch {
            setAnswers(initAnswers);
          }
        } else {
          setAnswers(initAnswers);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        if (isMounted) setErrorMessage("Failed to load the session securely. Please check your connection.");
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    if (sessionToken) fetchSessionData();

    return () => {
      isMounted = false;
    };
  }, [sessionToken, userId, navigate]);

 


  // Persist Progress & Refresh

  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem(`interrogation_${sessionToken}`, JSON.stringify({
        savedAnswers: answers,
        savedIndex: currentIndex,
        savedName: name,
        isStarted: showQuestions
      }));
    }
  }, [answers, currentIndex, name, showQuestions, questions, sessionToken]);

  useEffect(() => {
    const counterKey = `refreshCount_${sessionToken}`;
    setRefreshCount(Number(localStorage.getItem(counterKey) || 0));

    const handleBeforeUnload = () => {
      const trueDiskCount = Number(localStorage.getItem(counterKey) || 0);
      localStorage.setItem(counterKey, trueDiskCount + 1);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionToken]);




  // Handlers

  const handleStart = () => {
    if (name.trim().length < 2) {
      showToast("Please enter your full name", "error");
      return;
    }
    setShowQuestions(true);
    startTimer();
  };

  const handleAnswerChange = (e) => {
    if (e.nativeEvent && e.nativeEvent.inputType === 'insertFromPaste') {
      showToast("Pasting from clipboard is strictly prohibited.", "error");
      return;
    }

    const value = e.target.value;
    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], text: value };
      return updated;
    });
  };




  // Submission

  const handleAnswerSubmit = async (e) => {
    if (e) e.preventDefault();

    const currentAnswer = answers[currentIndex]?.text?.trim();
    if (!currentAnswer || isSubmitting || isTransitioning) return;

    setIsTransitioning(true);
    finalizeTyping();
    const syncTypingData = getTypingData();

    const currentQ = questions[currentIndex];
    const qId = currentQ && typeof currentQ === 'object' ? currentQ.id : null;

    const updatedAnswers = [...answers];
    
    // THE ZERO-TRUST
    updatedAnswers[currentIndex] = {
      question_id: qId,
      text: currentAnswer,
      timeTaken: time,
      typingMetrics: { ...syncTypingData }
    };

    setAnswers(updatedAnswers);

    if (currentIndex + 1 < questions.length) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        startTimer();
        resetTyping();
        setIsTransitioning(false);
      }, 200);
    } else {
      stopTimer();
      setIsSubmitting(true);

      const payload = {
        session_id: sessionToken,
        user_id: userId,
        responder_name: name,
        answers: updatedAnswers,
        metrics: { refreshCount }
      };

      try {
        const { error } = await supabase.from("responses").insert([payload]);
        if (error) throw error;

        localStorage.removeItem(`interrogation_${sessionToken}`);
        localStorage.removeItem(`refreshCount_${sessionToken}`);

        showToast(`Thanks ${name}! Redirecting to results...`);
        navigate("/results", { state: { sessionToken, user_id: userId } });
      } catch (err) {
        console.error("Submission error:", err);
        setErrorMessage("Failed to save submission. Please try again.");
        setIsSubmitting(false);
        setIsTransitioning(false);
      }
    }
  };




  // Canvas & Animation

  useEffect(() => {
    let animationFrameId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const densityCount = Math.floor((window.innerWidth * window.innerHeight) / 10000);
      const safeParticleCount = clamp(densityCount, 40, 250);
      
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

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      const layers = floatingRef.current?.children;
      if (layers) {
        Array.from(layers).forEach((el, idx) => {
          const speed = (idx + 1) * 0.015;
          el.style.transform = `translate3d(${(mouse.x - canvas.width / 2) * speed}px, ${
            (mouse.y - canvas.height / 2) * speed
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

  const currentTextEmpty = !answers[currentIndex]?.text?.trim();

  const activeQuestionData = questions[currentIndex];
  const activeQuestionText = activeQuestionData && typeof activeQuestionData === 'object'
    ? activeQuestionData.text
    : activeQuestionData;

  return (
    <div className="answer-wrapper">
      <canvas ref={canvasRef} className="answer-bg-canvas" />

      <div className="answer-floating-layers" ref={floatingRef}>
        <span className="answer-floating-text">Integrity</span>
        <span className="answer-floating-text">Cognition</span>
        <span className="answer-floating-text">Linguistics</span>
        <span className="answer-hud-icon">⚡</span>
        <span className="answer-hud-icon">🛰️</span>
        <span className="answer-hud-icon">🔹</span>
      </div>

      <div className="answer-content">
        <h2 className="answer-hud-title">Interrogation Suite</h2>

        {isFetching ? (
          <div className="answer-loading-text">Establishing secure connection...</div>
        ) : errorMessage ? (
          <div className="answer-error-message">{errorMessage}</div>
        ) : !showQuestions ? (
          <>
            <div className="answer-loading-text">
              ⚠️ Refresh count: {refreshCount}
            </div>
            <input
              type="text"
              className="answer-name-input"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="answer-start-btn" onClick={handleStart}>
              🚀 Start
            </button>
          </>
        ) : (
          <div className={`answer-question-container question-fade ${isTransitioning ? "question-fade-out" : ""}`}>
            <div className="answer-timer">⏱ {time}s</div>
            <div className="answer-question-header">
              Question {currentIndex + 1} of {questions.length}: {activeQuestionText}
            </div>
            <textarea
              className="answer-question-box"
              value={answers[currentIndex]?.text || ""}
              onChange={handleAnswerChange}
              onKeyDown={trackTyping}
              onPaste={(e) => {
                e.preventDefault();
                showToast("Pasting is strictly prohibited.", "error");
              }}
              onContextMenu={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-gramm="false"
              placeholder="Write your answer here"
              disabled={isSubmitting || isTransitioning}
            />
            <button
              className="answer-start-btn"
              onClick={handleAnswerSubmit}
              disabled={isSubmitting || isTransitioning || currentTextEmpty}
            >
              {isSubmitting ? "Submitting..." : (currentIndex + 1 === questions.length ? "Submit" : "Next")}
            </button>
          </div>
        )}
      </div>

      {toastQueue.length > 0 && (
        <div className={`answer-toast ${toastQueue[0].type === "error" ? "error" : "success"} ${isToastVisible ? "show" : ""}`}>
          {toastQueue[0].message}
        </div>
      )}
    </div>
  );
}

