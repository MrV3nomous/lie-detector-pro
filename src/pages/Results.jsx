import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "../styles/results.css";

import RadialBar from "../components/RadialBar";
import SkeletonLoader from "../components/SkeletonLoader";
import Carousel from "../components/Carousel";
import FloatingHUD from "../components/FloatingHUD";

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

const safeNum = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return Number.isNaN(num) ? fallback : num;
};

const clamp = (val, min = 0, max = 100) => Math.max(min, Math.min(max, safeNum(val)));

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionToken } = location.state || {};
  
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [responses, setResponses] = useState([]);
  
  const [selection, setSelection] = useState({ id: null, index: 0 });
  const [filter, setFilter] = useState("all");
  
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [scoreIntensity, setScoreIntensity] = useState(50);
  const intensityRef = useRef(50); 
  const particlesRef = useRef([]);

  const canvasRef = useRef(null);
  const floatingRef = useRef(null);
  const radialPanelRef = useRef(null);
  
  const localUserId = useRef(getUserId()).current;

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    intensityRef.current = scoreIntensity;
  }, [scoreIntensity]);

  useEffect(() => {
    if (!sessionToken) {
      navigate("/");
      return;
    }

    let isMounted = true;

    const fetchResults = async () => {
      try {
        setIsFetching(true);
        setResponses([]); 
        setErrorMessage("");

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("user_id, questions") 
          .eq("session_token", sessionToken)
          .single();

        if (sessionError || !sessionData) throw new Error("Session not found.");
        if (!isMounted) return;

        const isCreator = sessionData.user_id === localUserId;

        const { data: responsesData, error: responsesError } = await supabase
          .rpc("get_session_results", {
            p_session_token: sessionToken,
            p_requesting_user_id: localUserId
          });

        if (responsesError) throw responsesError;
        if (!isMounted) return;
        
        if (!responsesData || responsesData.length === 0) {
          setErrorMessage(isCreator ? "No one has answered your interrogation yet." : "No results found for your profile.");
          return;
        }

        const questionMap = new Map();
        if (Array.isArray(sessionData.questions)) {
          sessionData.questions.forEach(q => {
            if (q && typeof q === 'object' && q.id) questionMap.set(q.id, q);
          });
        }

        const mergedResponses = responsesData.map((res, index) => {
          const safeAnswers = Array.isArray(res.answers) ? res.answers : [];
          
          const mergedAnswers = safeAnswers.map((ans, idx) => {
             let qText = "Unknown Question";
             
             if (ans.question_id && questionMap.has(ans.question_id)) {
                const matchedQ = questionMap.get(ans.question_id);
                qText = matchedQ.text || matchedQ;
             } else {
                const legacyQ = sessionData.questions?.[idx];
                qText = legacyQ?.text ? legacyQ.text : (legacyQ || "Unknown Question");
             }
             
             const cleanAnalysis = {
               cognitiveLoad: safeNum(ans.analysis?.cognitiveLoad, 0),
               linguisticRisk: safeNum(ans.analysis?.linguisticRisk, 0),
               consistency: safeNum(ans.analysis?.consistency, 0),
               integrityIndex: safeNum(ans.analysis?.integrityIndex, 0)
             };

             const uniqueUiKey = ans.id || ans.question_id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString());

             return { 
               ...ans, 
               questionText: qText, 
               analysis: cleanAnalysis,
               _uiKey: uniqueUiKey 
             };
          });
          
          const safeUserId = res.user_id || `unknown_user_${index}`;
          
          const cleanScore = {
            integrityIndex: safeNum(res.score?.integrityIndex, 50),
            cognitiveLoad: safeNum(res.score?.cognitiveLoad, 0),
            linguisticRisk: safeNum(res.score?.linguisticRisk, 0),
            consistency: safeNum(res.score?.consistency, 0),
            overallScore: res.score?.overallScore != null ? safeNum(res.score.overallScore) : null,
            tamperFlag: res.score?.tamperFlag || false,
            verdict: res.score?.verdict || "VALID"
          };

          return { 
            ...res, 
            user_id: safeUserId, 
            answers: mergedAnswers, 
            score: cleanScore 
          };
        });

        let defaultId = mergedResponses[0]?.user_id;
        let defaultIndex = 0;

        if (isCreator && mergedResponses.length > 1) {
          let lowestIntegrity = Infinity;
          mergedResponses.forEach((r, idx) => {
            if (r.score.integrityIndex < lowestIntegrity) {
              lowestIntegrity = r.score.integrityIndex;
              defaultId = r.user_id;
              defaultIndex = idx;
            }
          });
        }

        const activeResponderExists = mergedResponses.find(r => r.user_id === defaultId);
        if (!activeResponderExists) {
          defaultIndex = 0;
          defaultId = mergedResponses[0]?.user_id;
        }

        if (isMounted) {
          setResponses(mergedResponses);
          setSelection({ id: defaultId, index: defaultIndex });
        }

      } catch (err) {
        console.error("Fetch Error:", err);
        if (isMounted) setErrorMessage("Failed to load results. Try refreshing.");
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [sessionToken, navigate]); 

  const responder = useMemo(() => {
    if (!responses.length) return null;
    const found = responses.find(r => r.user_id === selection.id);
    return found ?? responses[selection.index] ?? responses[0];
  }, [responses, selection]);
  
  const totalAnswers = Array.isArray(responder?.answers) ? responder.answers.length : 0;
  
  const isTampered = responder?.score?.tamperFlag === true || responder?.score?.verdict === "INVALID";

  useEffect(() => {
    if (isTampered) {
      setScoreIntensity(100);
      return;
    }
    if (responder?.score?.integrityIndex != null) {
      const newScore = responder.score.integrityIndex;
      setScoreIntensity((prev) => prev === newScore ? prev : newScore);
    }
  }, [responder, isTampered]);

  const filteredQuestions = useMemo(() => {
    if (!responder) return [];
    
    let list = [...(responder.answers || [])]; 
    const query = searchQuery.trim().toLowerCase();
    
    if (query) {
      list = list.filter((a) => {
        const qMatch = (a?.questionText || "").toLowerCase().includes(query);
        const aMatch = (a?.text || "").toLowerCase().includes(query);
        return qMatch || aMatch;
      });
    }

    if (filter !== "all") {
      list = [...list].sort((a, b) => { 
        if (filter === "cognitive") return b.analysis.cognitiveLoad - a.analysis.cognitiveLoad;
        if (filter === "linguistic") return b.analysis.linguisticRisk - a.analysis.linguisticRisk;
        if (filter === "consistency") return b.analysis.consistency - a.analysis.consistency;
        return 0;
      });
    }

    return list;
  }, [responder, filter, searchQuery]);

  const calculatedFallback = responder 
    ? clamp(
        (clamp(responder.score?.integrityIndex) + 
         (100 - clamp(responder.score?.cognitiveLoad)) + 
         (100 - clamp(responder.score?.linguisticRisk)) + 
         clamp(responder.score?.consistency)) / 4
      )
    : 0;

  const safeCarouselIndex = useMemo(() => {
    const index = responses.findIndex(r => r.user_id === selection.id);
    return index !== -1 ? index : 0;
  }, [responses, selection.id]);

  const carouselItems = useMemo(() => {
    return responses.map((r) => ({
      id: r.user_id,
      name: r.responder_name,
      integrity: Math.round(r.score.integrityIndex || 0), 
    }));
  }, [responses]);

  // Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const densityCount = Math.floor((window.innerWidth * window.innerHeight) / 10000);
      const safeParticleCount = clamp(densityCount, 40, 250);
      
      particlesRef.current = Array.from({ length: safeParticleCount }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }));
    };
    
    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;
        if (p.y > canvas.height) p.y = 0;
        if (p.y < 0) p.y = canvas.height;

        const baseColor = isTampered ? "255,50,50" : "0,255,255";
        const glow = intensityRef.current / 100; 
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + glow * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor},${0.2 + glow * 0.3})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", setCanvasDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isTampered]);

  return (
    <div className="results-wrapper">
      <canvas ref={canvasRef} className="results-bg-canvas" />
      <FloatingHUD floatingRef={floatingRef} />

      <div className="results-content">
        <h2 className="results-hud-title">Interrogation Results</h2>

        {isFetching ? (
          <SkeletonLoader />
        ) : errorMessage ? (
          <div className="results-error-message">{errorMessage}</div>
        ) : (
          <>
            <Carousel
              items={carouselItems}
              selectedIndex={safeCarouselIndex}
              onSelect={(index) => {
                 if (responses[index]) {
                   setSelection({ id: responses[index].user_id, index });
                 }
              }}
              hideNameBorders
            />

            {isTampered && (
              <div style={{
                background: "rgba(255, 0, 0, 0.15)",
                border: "1px solid #ff4444",
                borderRadius: "8px",
                padding: "1rem",
                margin: "0 auto 2rem auto",
                maxWidth: "600px",
                textAlign: "center",
                color: "#ff4444",
                boxShadow: "0 0 15px rgba(255, 0, 0, 0.3)"
              }}>
                <h3 style={{ margin: "0 0 0.5rem 0", textTransform: "uppercase", letterSpacing: "2px" }}>⚠️ Tamper Detected</h3>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  The subject attempted to spoof or omit analytic data. Their metrics have been invalidated.
                </p>
              </div>
            )}

            {/* THE ORBITAL RADAR SYSTEM */}
            <div className="orbital-system" ref={radialPanelRef}>
              <div className="orbital-center">
                <RadialBar
                  label="Overall Verdict"
                  value={Math.round(responder?.score?.overallScore != null ? responder.score.overallScore : calculatedFallback)}
                  gradientColors={isTampered ? ["#ff0000", "#880000"] : ["#0ff", "#ff0"]}
                  tooltip="Composite lie detection score"
                  largeDial
                />
              </div>
              
              <div className="orbital-track">
                <div className="orbit-planet planet-top">
                  <div className="counter-spin">
                    <RadialBar
                      label="Integrity"
                      value={Math.round(responder?.score?.integrityIndex || 0)}
                      gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#0ff", "#ff00ff"]}
                      smallLabel
                    />
                  </div>
                </div>
                <div className="orbit-planet planet-right">
                  <div className="counter-spin">
                    <RadialBar
                      label="Cog. Load"
                      value={Math.round(responder?.score?.cognitiveLoad || 0)}
                      gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#00ff00", "#ff0000"]}
                      smallLabel
                    />
                  </div>
                </div>
                <div className="orbit-planet planet-bottom">
                  <div className="counter-spin">
                    <RadialBar
                      label="Ling. Risk"
                      value={Math.round(responder?.score?.linguisticRisk || 0)}
                      gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#ffff00", "#ff0000"]}
                      smallLabel
                    />
                  </div>
                </div>
                <div className="orbit-planet planet-left">
                  <div className="counter-spin">
                    <RadialBar
                      label="Consistency"
                      value={Math.round(responder?.score?.consistency || 0)}
                      gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#00ffff", "#ff00ff"]}
                      smallLabel
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="results-controls-container">
              <div className="results-sort-toggles">
                <button 
                  className={`sort-pill ${filter === "all" ? "active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  Default
                </button>
                <button 
                  className={`sort-pill ${filter === "cognitive" ? "active" : ""}`}
                  onClick={() => setFilter("cognitive")}
                >
                  High Cognitive Load
                </button>
                <button 
                  className={`sort-pill ${filter === "linguistic" ? "active" : ""}`}
                  onClick={() => setFilter("linguistic")}
                >
                  High Linguistic Risk
                </button>
                <button 
                  className={`sort-pill ${filter === "consistency" ? "active" : ""}`}
                  onClick={() => setFilter("consistency")}
                >
                  High Consistency
                </button>
              </div>

              <input
                type="text"
                className="results-search-input"
                placeholder="Search answers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="results-answers-grid">
              {totalAnswers === 0 ? (
                 <div className="results-empty-state">No answers submitted by this subject.</div>
              ) : filteredQuestions.length === 0 ? (
                 <div className="results-empty-state">
                   <p>No answers match your current search or filter.</p>
                   <button 
                     className="results-reset-btn"
                     onClick={() => { setSearchInput(""); setSearchQuery(""); setFilter("all"); }}
                   >
                     Clear Search & Filters
                   </button>
                 </div>
              ) : (
                filteredQuestions.map((q) => (
                  <div className="results-answer-card" key={q._uiKey}>
                    <div className="results-answer-front">
                      <p className="results-question-text"><strong>Q:</strong> {q.questionText}</p>
                      <p className="results-answer-text">{q.text || "No response provided."}</p>
                      <hr className="results-card-divider" />
                      
                      {/* MICRO-RADIALS IN CARDS */}
                      <div className="results-micro-radials-row">
                        <div className="micro-stat-item">
                          <div className="micro-radial-wrapper">
                            <RadialBar label="" value={isTampered ? 0 : Math.round(q.analysis?.cognitiveLoad || 0)} gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#00ff00", "#ff0000"]} />
                          </div>
                          <span className="micro-stat-name" style={{ color: isTampered ? '#ff4444' : '#00ff00' }}>Cog</span>
                        </div>
                        
                        <div className="micro-stat-item">
                          <div className="micro-radial-wrapper">
                            <RadialBar label="" value={isTampered ? 0 : Math.round(q.analysis?.linguisticRisk || 0)} gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#ffff00", "#ff0000"]} />
                          </div>
                          <span className="micro-stat-name" style={{ color: isTampered ? '#ff4444' : '#ffff00' }}>Ling</span>
                        </div>
                        
                        <div className="micro-stat-item">
                          <div className="micro-radial-wrapper">
                            <RadialBar label="" value={isTampered ? 0 : Math.round(q.analysis?.consistency || 0)} gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#00ffff", "#ff00ff"]} />
                          </div>
                          <span className="micro-stat-name" style={{ color: isTampered ? '#ff4444' : '#00ffff' }}>Cons</span>
                        </div>
                        
                        <div className="micro-stat-item">
                          <div className="micro-radial-wrapper">
                            <RadialBar label="" value={isTampered ? 0 : Math.round(q.analysis?.integrityIndex || 0)} gradientColors={isTampered ? ["#ff0000", "#ff4444"] : ["#0ff", "#ff00ff"]} />
                          </div>
                          <span className="micro-stat-name" style={{ color: isTampered ? '#ff4444' : '#0ff' }}>Integ</span>
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
            {isCreator && (
              <div className="results-creator-actions">
                <button 
                  className="results-edit-btn"
                  onClick={() => navigate("/create")}
                >
                  ⚙️ Edit Your Questions
                </button>
              </div>
            )}
            <div className="results-viral-footer">
              <p className="viral-hook">Who's lying to you?</p>
              <button 
                className="viral-create-btn"
                onClick={() => navigate("/")}
              >
                Create Your Own Interrogation ⚡
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

