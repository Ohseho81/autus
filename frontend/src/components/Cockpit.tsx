import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Cockpit() {
  const [predictValue, setPredictValue] = useState(75);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-blue-400 mb-2">Future Prediction System</h1>
          <p className="text-gray-400">Advanced AI-powered prediction interface</p>
        </motion.div>

        {/* Main Display */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8">
          <motion.div 
            className="flex justify-between items-center"
            animate={{ scale: isAnalyzing ? 1.02 : 1 }}
            transition={{ duration: 0.5, repeat: isAnalyzing ? Infinity : 0, repeatType: "reverse" }}
          >
            {/* Prediction Gauge */}
            <div className="relative w-64 h-64">
              <svg className="transform -rotate-90 w-full h-full">
                <circle
                  className="text-gray-700"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  r="100"
                  cx="128"
                  cy="128"
                />
                <motion.circle
                  className="text-blue-500"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                  r="100"
                  cx="128"
                  cy="128"
                  initial={{ strokeDasharray: "0 628" }}
                  animate={{ 
                    strokeDasharray: `${predictValue * 6.28} 628`
                  }}
                  transition={{ duration: 1 }}
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <motion.div 
                  className="text-4xl font-bold text-blue-400"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {predictValue}%
                </motion.div>
                <div className="text-gray-400">Probability</div>
              </div>
            </div>

            {/* Prediction Details */}
            <div className="flex-1 ml-8">
              <motion.div 
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-blue-400 font-semibold">Current Status</h3>
                  <p className="text-gray-300">System is {isAnalyzing ? "analyzing" : "ready"}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-blue-400 font-semibold">Prediction Confidence</h3>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                    <motion.div 
                      className="bg-blue-500 h-2.5 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${predictValue}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold"
            onClick={() => {
              setIsAnalyzing(true);
              setTimeout(() => {
                setPredictValue(Math.floor(Math.random() * 100));
                setIsAnalyzing(false);
              }, 2000);
            }}
          >
            Generate Prediction
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold"
            onClick={() => setPredictValue(75)}
          >
            Reset
          </motion.button>
        </div>
        
      </div>
    </div>
  );
}