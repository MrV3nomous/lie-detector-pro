import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ------------------- Helper -------------------
const logFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "log.txt");
const results = [];

function logResult(testName, passed, details = "") {
  const line = `Test: ${testName} - ${passed ? "✅ PASSED" : "❌ FAILED"} ${details}`;
  console.log(line);
  results.push(line);
}

// ------------------- Utils -------------------
import { computeMetrics } from "./src/utils/metrics.js";
import { analyzeLinguistics } from "./src/utils/linguistic.js";
import { computeScore } from "./src/utils/scoring.js";

// --- Metrics Tests ---
try {
  const metrics = computeMetrics({
    startTime: 0,
    firstKeystrokeTime: 100,
    lastKeystrokeTime: 1100,
    totalTime: 1200,
    keystrokes: 50,
    backspaces: 5,
    pauses: 2,
  });

  logResult("computeMetrics basic test", metrics.typingSpeed > 0 && metrics.backspaceRate > 0);
} catch (err) {
  logResult("computeMetrics basic test", false, err.message);
}

// --- Linguistic Tests ---
try {
  const ling = analyzeLinguistics("I think, honestly, I am not sure.");
  logResult(
    "analyzeLinguistics test",
    ling.wordCount === 7 && ling.riskPhraseCount === 1 && ling.uncertaintyCount === 2
  );
} catch (err) {
  logResult("analyzeLinguistics test", false, err.message);
}

// --- Scoring Tests ---
try {
  const score = computeScore(metrics, analyzeLinguistics("I am not sure honestly."));
  logResult("computeScore test", score.integrityIndex >= 0 && score.integrityIndex <= 100);
} catch (err) {
  logResult("computeScore test", false, err.message);
}

// ------------------- Hooks Logic-only Tests -------------------
import useAnalysis from "./src/hooks/useAnalysis.js";

// useAnalysis test
try {
  const { analyze } = useAnalysis();
  const result = analyze("I think honestly", { totalTime: 5000, pauses: 0, backspaces: 0 });
  logResult("useAnalysis.analyze test", result.integrityIndex >= 0 && result.integrityIndex <= 100);
} catch (err) {
  logResult("useAnalysis.analyze test", false, err.message);
}

// ------------------- Finish -------------------
fs.writeFileSync(logFile, results.join("\n"), "utf-8");
console.log("=== ALL NODE-FRIENDLY TESTS COMPLETED ===");
