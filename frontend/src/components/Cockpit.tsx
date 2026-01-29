import { motion } from 'framer-motion';
import { useState } from 'react';

const Cockpit = () => {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [prediction, setPrediction] = useState('');

  const years = [2024, 2025, 2026, 2027, 2028];
  const predictions = {
    2024: "AI 기술의 혁신적 발전",
    2025: "자율주행차 상용화 확대", 
    2026: "우주 관광 시대 개막",
    2027: "신재생 에너지 전환 가속화",
    2028: "양자 컴퓨터 상용화"
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-blue-400 mb-8 text-center">
          Future Vision Console
        </h1>

        {/* Time Selection */}
        <div className="flex justify-center gap-4 mb-12">
          {years.map(year => (
            <motion.button
              key={year}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setSelectedYear(year);
                setPrediction(predictions[year as keyof typeof predictions]);
              }}
              className={`px-6 py-3 rounded-lg ${
                selectedYear === year 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300'
              } hover:bg-blue-400 transition-colors`}
            >
              {year}
            </motion.button>
          ))}
        </div>

        {/* Prediction Display */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800 p-8 rounded-2xl shadow-2xl"
        >
          <div className="flex items-center mb-6">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"/>
            <span className="text-green-500 text-sm">ANALYZING FUTURE DATA</span>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between text-gray-400">
              <span>Timeline:</span>
              <span>{selectedYear}</span>
            </div>

            <motion.div
              key={prediction}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-semibold text-blue-300"
            >
              {prediction}
            </motion.div>

            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="h-2 bg-blue-500/30 rounded-full"
                  style={{
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          {[
            { label: 'Confidence', value: '89%' },
            { label: 'Data Points', value: '1.2M' },
            { label: 'AI Models', value: '5' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 * i }}
              className="bg-gray-800 p-4 rounded-xl"
            >
              <div className="text-gray-400 text-sm">{stat.label}</div>
              <div className="text-blue-400 text-xl font-bold">{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Cockpit;