import { motion } from "framer-motion";

export default function TruthMeter({ value = 50 }) {
  const getColor = () => {
    if (value > 70) return "from-green-400 to-green-600";
    if (value > 40) return "from-yellow-400 to-yellow-600";
    return "from-red-400 to-red-600";
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Uncertain</span>
        <span>Consistent</span>
      </div>

      <div className="h-3 w-full bg-[#1a1a1f] rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="text-center mt-2 text-sm text-gray-300">
        Integrity Index: <span className="font-semibold text-white">{value}%</span>
      </div>
    </div>
  );
}
