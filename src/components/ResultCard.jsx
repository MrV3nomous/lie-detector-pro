import { motion } from "framer-motion";

export default function ResultCard({ score = { cognitiveLoad:0, linguisticRisk:0, consistency:0, integrityIndex:0 } }) {
  const { cognitiveLoad, linguisticRisk, consistency, integrityIndex } = score;

  const getLabel = () => {
    if (integrityIndex > 75) return "Highly Consistent";
    if (integrityIndex > 50) return "Moderately Consistent";
    return "High Variability Detected";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto mt-8 bg-[#0f0f12] border border-gray-800 rounded-xl p-4"
    >
      <h2 className="text-xl font-semibold text-white mb-4 text-center">Analysis Result</h2>

      <div className="space-y-3 text-sm text-gray-300">
        <div className="flex justify-between">
          <span>Cognitive Load</span>
          <span>{cognitiveLoad}%</span>
        </div>

        <div className="flex justify-between">
          <span>Linguistic Risk</span>
          <span>{linguisticRisk}%</span>
        </div>

        <div className="flex justify-between">
          <span>Consistency</span>
          <span>{consistency}%</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">Overall Assessment</p>
        <p className="text-lg font-semibold text-white">{getLabel()}</p>
      </div>

      <div className="mt-4 text-center text-2xl font-bold text-white">{integrityIndex}%</div>
    </motion.div>
  );
}
