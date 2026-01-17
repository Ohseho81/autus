/**
 * AUTUS 메인 대시보드 페이지
 * Liquid Glass + Bento Grid + FSD 네비게이션 + 1-12-144 그래프
 * 
 * 2026 UI 트렌드 완벽 반영:
 * - Liquid Glass 2.0
 * - Bento Grid 레이아웃
 * - Spatial Floating 카드
 * - Expressive Motion
 * - 모바일 반응형
 * - 다크/라이트 테마
 */

import { useState, useEffect } from "react";
import { useTheme, useGraphWebSocket } from "@/hooks";
import { ThemeToggle } from "@/components/Theme";
import { FSDNavigation } from "@/components/FSD";
import { RelationshipGraph, generateSampleGraphData } from "@/components/Graph";

// 사용자 데이터 타입
interface UserData {
  name: string;
  location: string;
  mbti: string;
  stabilityScore: number;
  inertiaDebt: number;
  connectivityDensity: number;
  influenceScore: number;
}

// 예측 데이터 타입
interface PredictionData {
  successProbability: number;
  uncertainty: number;
  frictionNodes: { name: string; score: number; reason?: string }[];
  synergyNodes: { name: string; score: number; reason?: string }[];
  forecast: number[];
}

export function AUTUSDashboard() {
  const { isDark } = useTheme();
  const { isConnected, data: wsData, lastUpdate } = useGraphWebSocket();

  // 상태
  const [goal, setGoal] = useState("HR 온보딩 프로세스 최적화");
  const [userData, setUserData] = useState<UserData>({
    name: "Oh Seho",
    location: "Quezon City, PH",
    mbti: "INTJ-A",
    stabilityScore: 0.82,
    inertiaDebt: 0.35,
    connectivityDensity: 0.75,
    influenceScore: 0.68,
  });
  const [prediction, setPrediction] = useState<PredictionData>({
    successProbability: 0.765,
    uncertainty: 0.12,
    frictionNodes: [
      { name: "필리핀 노동법 준수 지연", score: 0.7, reason: "법규 검토 필요" },
      { name: "문화적 의사결정 차이", score: 0.5, reason: "커뮤니케이션 조정" },
    ],
    synergyNodes: [
      { name: "퀘존시티 로컬 파트너", score: 0.85, reason: "네트워크 연결" },
      { name: "서울 네트워크 지원", score: 0.78, reason: "원격 협업" },
    ],
    forecast: [0.76, 0.78, 0.80, 0.79, 0.82, 0.85, 0.84],
  });

  // 그래프 데이터
  const [graphData, setGraphData] = useState(() => generateSampleGraphData("user_ohseho_001"));

  // WebSocket 데이터 업데이트
  useEffect(() => {
    if (wsData?.nodes && wsData?.edges) {
      setGraphData(wsData);
    }
  }, [wsData]);

  return (
    <div
      className={`
        min-h-screen
        bg-gradient-to-br from-slate-950 via-indigo-950/80 to-purple-950/60
        dark:from-slate-950 dark:via-indigo-950/80 dark:to-purple-950/60
        text-white
        transition-colors duration-500
      `}
    >
      {/* 배경 오로라 효과 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[150px]" />
      </div>

      {/* 메인 컨테이너 */}
      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* 헤더 */}
        <header
          className="
            mb-6 sm:mb-8
            p-4 sm:p-6 lg:p-8
            rounded-2xl sm:rounded-3xl
            bg-white/5 backdrop-blur-xl
            border border-white/10
            shadow-2xl
          "
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                🏛️ AUTUS
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-white/60">
                사용자 중심 현상 관측 플랫폼
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 연결 상태 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                  }`}
                />
                <span className="text-xs text-white/50">
                  {isConnected ? "실시간" : "오프라인"}
                </span>
              </div>
              
              {/* 사용자 정보 */}
              <div className="hidden sm:block text-right">
                <p className="text-sm text-white/80">{userData.name}</p>
                <p className="text-xs text-white/50">{userData.location} • {userData.mbti}</p>
              </div>
              
              {/* 테마 토글 */}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Bento Grid 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* FSD 네비게이션 (메인) */}
          <div className="lg:col-span-8 row-span-2">
            <FSDNavigation
              goal={goal}
              successProbability={prediction.successProbability}
              uncertainty={prediction.uncertainty}
              frictionNodes={prediction.frictionNodes}
              synergyNodes={prediction.synergyNodes}
              forecast={prediction.forecast}
              className="h-full"
            />
          </div>

          {/* 상태 요약 카드 */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            {/* 실시간 상태 */}
            <div
              className="
                p-4 sm:p-6
                rounded-xl sm:rounded-2xl
                bg-white/5 backdrop-blur-xl
                border border-white/10
              "
            >
              <h3 className="text-sm font-medium text-white/70 mb-4">실시간 상태</h3>
              
              <div className="space-y-4">
                {/* ΔṠ 게이지 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">ΔṠ 변화율</span>
                    <span className="text-cyan-400">0.42</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: "42%" }}
                    />
                  </div>
                </div>

                {/* Inertia Debt 게이지 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">Inertia Debt</span>
                    <span className="text-orange-400">{userData.inertiaDebt.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${userData.inertiaDebt * 100}%` }}
                    />
                  </div>
                </div>

                {/* Stability Score 게이지 */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">Stability Score</span>
                    <span className="text-emerald-400">{userData.stabilityScore.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
                      style={{ width: `${userData.stabilityScore * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 계수 요약 */}
            <div
              className="
                p-4 sm:p-6
                rounded-xl sm:rounded-2xl
                bg-white/5 backdrop-blur-xl
                border border-white/10
              "
            >
              <h3 className="text-sm font-medium text-white/70 mb-4">사용자 계수</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-cyan-400">
                    {(userData.connectivityDensity * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-white/50 mt-1">연결 밀도</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-purple-400">
                    {(userData.influenceScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-white/50 mt-1">영향력</p>
                </div>
              </div>
            </div>
          </div>

          {/* 1-12-144 관계 그래프 */}
          <div className="lg:col-span-12">
            <div
              className="
                p-4 sm:p-6
                rounded-xl sm:rounded-2xl
                bg-white/5 backdrop-blur-xl
                border border-white/10
              "
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-white/70">1-12-144 관계 그래프</h3>
                {lastUpdate && (
                  <span className="text-xs text-white/40">
                    최근 업데이트: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <RelationshipGraph
                data={graphData}
                height="400px"
                onNodeClick={(nodeId) => console.log("Node clicked:", nodeId)}
              />
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="mt-8 py-6 text-center text-xs text-white/40">
          <p>AUTUS v7.0 • LangGraph + CrewAI + Neo4j + TFT</p>
          <p className="mt-1">© 2026 AUTUS. 모든 이벤트는 사용자에서 발생합니다.</p>
        </footer>
      </div>
    </div>
  );
}

export default AUTUSDashboard;
