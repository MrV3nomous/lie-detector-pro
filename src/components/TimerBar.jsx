import { motion } from "framer-motion";

export default function TimerBar({ progress = 100 }) {
  return (
    <div className="w-full max-w-xl mx-auto mt-4">
      <div className="h-2 w-full bg-[#1a1a1f] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0.2 }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{Math.ceil(progress)}% left</p>
    </div>
  );
}
