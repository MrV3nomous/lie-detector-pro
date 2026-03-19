import { motion } from "framer-motion";

export default function QuestionCard({ question = "", index = 0 }) {
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto bg-[#0f0f12] border border-[#1f1f25] rounded-xl p-6"
    >
      <p className="text-sm text-gray-400 mb-2">Question {index + 1}</p>
      <h2 className="text-xl md:text-2xl font-semibold text-white leading-snug">{question}</h2>
    </motion.div>
  );
}
