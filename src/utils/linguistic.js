export function analyzeLinguistics(text = "") {
  const lowerText = text.toLowerCase();

  const riskyPhrases = ["honestly", "believe me", "i swear", "to be honest", "trust me"];
  let riskScore = 0;

  riskyPhrases.forEach((phrase) => {
    if (lowerText.includes(phrase)) riskScore += 15;
  });

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount < 3) riskScore += 10;
  if (wordCount > 40) riskScore += 10;

  riskScore = Math.min(100, riskScore);

  return { linguisticRisk: riskScore, wordCount };
}
