import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import Home from "./pages/Home";
import CreateSession from "./pages/CreateSession";
import Results from "./pages/Results";
import SessionGate from "./pages/SessionGate";
import AnswerSession from "./pages/AnswerSession";

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          <Route
            path="/"
            element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Home />
              </motion.div>
            }
          />

          <Route
            path="/create"
            element={
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <CreateSession />
              </motion.div>
            }
          />

          <Route
            path="/results"
            element={
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
                <Results />
              </motion.div>
            }
          />

          <Route
            path="/session/:sessionToken"
            element={
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SessionGate />
              </motion.div>
            }
          />

          <Route
            path="/answer/:sessionToken"
            element={
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <AnswerSession />
              </motion.div>
            }
          />

        </Routes>
      </AnimatePresence>
    </div>
  );
}
