export function computeMetrics(metrics = {}) {
  const { totalTime = 0, pauses = 0, backspaces = 0, keystrokes = 0 } = metrics;

  let cognitiveLoad = 0;

  if (totalTime > 8000) cognitiveLoad += 20;
  if (pauses > 2) cognitiveLoad += 20;
  if (backspaces > 5) cognitiveLoad += 20;

  cognitiveLoad = Math.min(100, cognitiveLoad);

  return { cognitiveLoad, pauses, backspaces, keystrokes, totalTime };
}
