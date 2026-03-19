export function computeScore(metrics = {}, linguistic = {}) {
  const cognitiveLoad = metrics.cognitiveLoad ?? 0;
  const linguisticRisk = linguistic.linguisticRisk ?? 0;

  let consistency = 100 - Math.floor((cognitiveLoad + linguisticRisk) / 2);
  consistency = Math.max(0, Math.min(100, consistency));

  const integrityIndex = Math.floor(
    (100 - cognitiveLoad) * 0.4 + (100 - linguisticRisk) * 0.3 + consistency * 0.3
  );

  return { cognitiveLoad, linguisticRisk, consistency, integrityIndex };
}
