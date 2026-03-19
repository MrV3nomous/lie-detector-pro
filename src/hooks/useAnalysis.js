//This is a Placeholder App just for showcasing the algorithm.
//The actual analysis is handled in the backend to prevent any information leaks or tampering of data by any user.
export default function useAnalysis() {
  const analyzeTyping = (text = "", metrics = {}, timeInSeconds = 0) => {
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const pauses = metrics.pauses || 0;
    const backspaces = metrics.backspaces || 0;

    let cognitiveLoad = 0;
    
    if (timeInSeconds > 8) cognitiveLoad += 20; 
    if (pauses > 2) cognitiveLoad += 20;
    if (backspaces > 5) cognitiveLoad += 20;
    cognitiveLoad = Math.min(100, cognitiveLoad);

    const riskyPhrases = ["honestly", "believe me", "i swear", "to be honest", "to tell the truth"];
    let linguisticRisk = 0;
    const lowerText = text.toLowerCase();

    riskyPhrases.forEach((p) => {
      if (lowerText.includes(p)) linguisticRisk += 10;
    });

    if (wordCount < 3) linguisticRisk += 10;
    if (wordCount > 40) linguisticRisk += 10;

    linguisticRisk = Math.min(100, linguisticRisk);

    let consistency = 100 - Math.floor((cognitiveLoad + linguisticRisk) / 2);
    consistency = Math.max(0, Math.min(100, consistency));

    const integrityIndex = Math.floor(
      (100 - cognitiveLoad) * 0.4 +
      (100 - linguisticRisk) * 0.3 +
      consistency * 0.3
    );

    return { cognitiveLoad, linguisticRisk, consistency, integrityIndex };
  };

  return { analyzeTyping };
}

