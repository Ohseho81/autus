import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Cockpit() {
  const [predictValue, setPredictValue] = useState(85);

  return (
    <div className="w-full h-screen bg-gradient-to-b from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-blue-400">미래 예측 시스템</h1>
          <p className="text-gray-400 mt-2">AI 기반 예측 인터페이스</p>
        </motion.div>

        {/* Main Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Panel - Prediction Meter */}
          <motion.div 
            className="bg-gray-800 rounded-xl p-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative h-64">
              <motion.div 
                className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg"
                initial={{ height: 0 }}
                animate={{ height: `${predictValue}%` }}
                transition={{ duration: 1 }}
              />
              <motion.div 
                className="absolute bottom-0 w-full flex justify-center"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
              >
                <span className="text-5xl font-bold text-white">
                  {predictValue}%
                </span>
              </motion.div>
            </div>
            <div className="mt-4">
              <input 
                type="range"
                min="0"
                max="100"
                value={predictValue}
                onChange={(e) => setPredictValue(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </motion.div>

          {/* Right Panel - Stats */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl text-blue-400 mb-3">신뢰도 지표</h3>
              <motion.div 
                className="h-2 bg-blue-500 rounded"
                initial={{ width: 0 }}
                animate={{ width: `${predictValue * 0.8}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl text-blue-400 mb-3">예측 정확도</h3>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map((i) => (
                  <motion.div
                    key={i}
                    className="h-20 bg-gray-700 rounded-lg flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                  >
                    <span className="text-2xl text-white">{predictValue - i * 5}%</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Panel */}
        <motion.div 
          className="mt-8 bg-gray-800 rounded-xl p-6"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-xl text-blue-400">실시간 데이터</h3>
            <motion.div 
              className="w-3 h-3 bg-green-500 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => (
              <motion.div
                key={i}
                className="h-16 bg-gray-700 rounded-lg"
                whileHover={{ scale: 1.05 }}
              />
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}