/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌡️ CockpitGauge - Kraton이 생성한 온도 게이지 컴포넌트
 * 애니메이션 + 그라데이션 + 반응형
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { motion } from "framer-motion";
import { Thermometer } from "lucide-react";

interface CockpitGaugeProps {
  temperature?: number;
  label?: string;
  showBar?: boolean;
}

export const CockpitGauge = ({ 
  temperature = 68.5, 
  label = "전체 온도",
  showBar = true 
}: CockpitGaugeProps) => {
  // 온도에 따른 색상 설정
  const getColorClass = (temp: number) => {
    if (temp >= 70) return "text-emerald-400";
    if (temp >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getGradientClass = (temp: number) => {
    if (temp >= 70) return "bg-gradient-to-r from-emerald-500 to-teal-500";
    if (temp >= 40) return "bg-gradient-to-r from-amber-500 to-orange-500";
    return "bg-gradient-to-r from-red-500 to-rose-500";
  };

  const getStatus = (temp: number) => {
    if (temp >= 70) return "양호";
    if (temp >= 40) return "주의";
    return "위험";
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 cursor-pointer"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <Thermometer size={18} className={getColorClass(temperature)} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>

      {/* 온도 표시 */}
      <div className="flex items-baseline gap-2 mb-2">
        <motion.span
          className={`text-5xl font-bold ${getColorClass(temperature)}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {temperature.toFixed(1)}
        </motion.span>
        <span className="text-2xl text-slate-500">°</span>
      </div>

      {/* 상태 뱃지 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs mb-4 ${
          temperature >= 70 ? "bg-emerald-500/20 text-emerald-400" :
          temperature >= 40 ? "bg-amber-500/20 text-amber-400" :
          "bg-red-500/20 text-red-400"
        }`}
      >
        {getStatus(temperature)}
      </motion.div>

      {/* 게이지 바 */}
      {showBar && (
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(temperature, 100)}%` }}
            className={`h-full rounded-full ${getGradientClass(temperature)}`}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      )}
    </motion.div>
  );
};

export default CockpitGauge;
