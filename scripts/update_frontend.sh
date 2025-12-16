#!/bin/bash

echo "🚀 Autus v3.8 Analyst Edition UI를 적용합니다..."

# frontend 디렉토리가 없으면 생성
mkdir -p frontend

# frontend/index.html 파일 생성
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTUS OS v3.8 (Analyst Edition)</title>
    
    <script type="importmap">
        {
            "imports": {
                "react": "https://esm.sh/react@18.2.0",
                "react-dom/client": "https://esm.sh/react-dom@18.2.0/client",
                "three": "https://esm.sh/three@0.160.0",
                "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.15.16?external=react,react-dom,three",
                "@react-three/drei": "https://esm.sh/@react-three/drei@9.99.0?external=react,react-dom,three,@react-three/fiber"
            }
        }
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;500;700&display=swap');

        body { margin: 0; background: #000000; color: white; overflow: hidden; font-family: 'Roboto Mono', monospace; }
        #root { width: 100%; height: 100vh; }
        
        .tech-panel {
            background: rgba(5, 5, 10, 0.9);
            border: 1px solid #333;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(12px);
        }
        
        .btn-tech {
            background: rgba(255,255,255,0.03);
            border: 1px solid #444;
            color: #888;
            transition: all 0.2s;
            text-transform: uppercase;
        }
        .btn-tech:hover {
            background: #fff;
            color: #000;
            border-color: #fff;
        }
        .btn-tech.active {
            background: #fff;
            color: #000;
            border-color: #fff;
            box-shadow: 0 0 15px rgba(255,255,255,0.2);
        }

        .input-tech {
            background: rgba(0,0,0,0.8);
            border: 1px solid #333;
            color: #fff;
        }
        .input-tech:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
            outline: none;
        }
        
        .match-bar-bg { background: #333; height: 4px; width: 100%; position: relative; }
        .match-bar-fill { height: 100%; background: #ec4899; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <script type="text/babel" data-type="module">
        import React, { useState, useRef, useMemo, useEffect } from 'react';
        import { createRoot } from 'react-dom/client';
        import * as THREE from 'three';
        import { Canvas, useFrame } from '@react-three/fiber';
        import { 
            OrthographicCamera, PerspectiveCamera, Html, 
            Float, Stars, Trail, Line, Environment, MeshDistortMaterial, Sparkles
        } from '@react-three/drei';

        const API_BASE = "http://localhost:8000/autus";

        const COLORS = {
            BRAIN: '#ffffff', SENSORS: '#94a3b8', CORE: '#ef4444', 
            ENERGY: '#3b82f6', MOTION: '#64748b', BASE: '#171717', 
            BOUNDARY: '#262626', PEOPLE: '#22c55e', MONEY: '#ffffff', 
            WORK: '#f97316', POLICY: '#ef4444', GROWTH_HACK: '#3b82f6',
            GHOST: '#ec4899' 
        };

        // =====================================================================
        // API CLIENT (REAL CONNECTION)
        // =====================================================================
        
        async function fetchReplay(gmuId) {
            try {
                const res = await fetch(`${API_BASE}/hassabis/replay`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ gmu_id: gmuId || "GMU_DEMO", variation: { pressure: -0.1 } })
                });
                if (!res.ok) throw new Error('Replay API Error');
                return await res.json();
            } catch (e) {
                console.warn("Backend offline, using mock replay");
                return {
                    explanation: {
                        summary: "MOCK: SIMULATED PATH DIVERGENCE",
                        confidence: "LOW (OFFLINE)",
                        key_factors: ["Energy", "Integrity"]
                    }
                };
            }
        }

        // =====================================================================
        // 3D COMPONENTS
        // =====================================================================

        function ReactorSun() {
            const mesh = useRef();
            return (
                <group>
                    <pointLight intensity={3} color="#fff" distance={100} decay={2} />
                    <mesh ref={mesh}>
                        <sphereGeometry args={[1.5, 64, 64]} />
                        <meshStandardMaterial color="#000000" emissive="#3b82f6" emissiveIntensity={2} roughness={0.4} metalness={1.0} />
                    </mesh>
                    <mesh rotation={[Math.PI/2, 0, 0]}>
                        <ringGeometry args={[1.8, 1.85, 128]} />
                        <meshBasicMaterial color="#3b82f6" side={THREE.DoubleSide} />
                    </mesh>
                </group>
            );
        }

        function CosmosScene() {
            return (
                <group>
                    <ReactorSun />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <ambientLight intensity={0.2} />
                </group>
            );
        }

        // ---------------------------------------------------------------------
        // MICRO & LAB COMPONENTS
        // ---------------------------------------------------------------------

        function DataPacket({ task, onComplete, isGhost = false }) {
            const ref = useRef();
            const [phase, setPhase] = useState(0);
            
            const path = useMemo(() => {
                const divergence = isGhost ? (Math.random() - 0.5) * 4 : 0;
                return [
                    new THREE.Vector3(0 + divergence * 0.2, 8, 0), 
                    new THREE.Vector3(0, 0, 0), 
                    Math.random() > 0.5 ? new THREE.Vector3(-3 - divergence, -6, 0) : new THREE.Vector3(3 + divergence, -6, 0),
                    new THREE.Vector3(0, -9, 0)
                ];
            }, [isGhost]);

            useFrame((state, delta) => {
                if (!ref.current) return;
                const target = path[phase];
                const dist = ref.current.position.distanceTo(target);
                const speed = phase === 2 ? 5 : 10; 
                // Ghosts move slower for analysis
                ref.current.position.lerp(target, delta * (isGhost ? speed * 0.3 : speed));

                if (dist < 0.2) {
                    if (phase < path.length - 1) setPhase(phase + 1);
                    else onComplete(task.id);
                }
            });

            const color = isGhost ? COLORS.GHOST : task.color;

            return (
                <group>
                    <Trail width={isGhost ? 0.5 : 1.5} length={3} color={color} attenuation={(t) => t}>
                        <mesh ref={ref} position={[0, 12, 0]}>
                            <boxGeometry args={[0.2, 0.2, 0.2]} />
                            <meshBasicMaterial color={color} wireframe={isGhost} toneMapped={false} />
                        </mesh>
                    </Trail>
                </group>
            );
        }

        function OrganismScene({ tasks, onTaskComplete, boundaryActive, ghosts = [] }) {
            const box = useMemo(() => new THREE.BoxGeometry(1.5, 1.5, 1.5), []);
            const boundaryRef = useRef();

            useFrame((state, delta) => {
                if (boundaryRef.current) {
                    boundaryRef.current.rotation.y += delta * 0.05;
                    if (boundaryActive) {
                        boundaryRef.current.material.opacity = 0.2;
                        boundaryRef.current.material.color.set(COLORS.PEOPLE);
                    } else {
                        boundaryRef.current.material.opacity = 0.02;
                        boundaryRef.current.material.color.set(COLORS.BOUNDARY);
                    }
                }
            });

            return (
                <group>
                    <mesh position={[0, 7, 0]} geometry={box}><meshStandardMaterial color={COLORS.BRAIN} wireframe/></mesh>
                    <mesh position={[0, 0, 0]} geometry={box}><meshStandardMaterial color={COLORS.CORE} wireframe/></mesh>
                    <mesh position={[-3, -6, 0]} geometry={box}><meshStandardMaterial color={COLORS.MOTION} wireframe/></mesh>
                    <mesh position={[3, -6, 0]} geometry={box}><meshStandardMaterial color={COLORS.MOTION} wireframe/></mesh>
                    <mesh position={[0, -9, 0]} geometry={box}><meshStandardMaterial color={COLORS.BASE} wireframe/></mesh>

                    <mesh ref={boundaryRef} rotation={[Math.PI/2, 0, 0]}>
                        <sphereGeometry args={[15, 32, 32]} />
                        <meshBasicMaterial color={COLORS.BOUNDARY} wireframe transparent opacity={0.05} />
                    </mesh>

                    {tasks.map(t => <DataPacket key={t.id} task={t} onComplete={onTaskComplete} />)}
                    {ghosts.map(t => <DataPacket key={t.id} task={t} onComplete={onTaskComplete} isGhost={true} />)}
                    
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={2} color="#fff" />
                </group>
            );
        }

        // =====================================================================
        // HUD
        // =====================================================================

        function HUD({ view, setView, systemState, logs, analysisData, injectTask }) {
            return (
                <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-10 text-white font-mono">
                    <div className="flex justify-between items-start">
                        <div className="pointer-events-auto">
                            <h1 className="text-3xl font-bold tracking-tighter uppercase mb-1">Autus <span className="text-xs text-pink-500">MIND</span></h1>
                            <div className="flex gap-4 text-[9px] text-gray-500">
                                <span>REPLAY: {view === 'LAB' ? 'ACTIVE' : 'STANDBY'}</span>
                                {view === 'LAB' && <span className="text-pink-400 animate-pulse">ANALYZING PAST...</span>}
                            </div>
                            <div className="flex mt-6 gap-0">
                                <button onClick={() => setView('EXTERNAL')} className={`btn-tech px-5 py-2 text-[10px] font-bold ${view === 'EXTERNAL' ? 'active' : ''}`}>UNIVERSE</button>
                                <button onClick={() => setView('INTERNAL')} className={`btn-tech px-5 py-2 text-[10px] font-bold ${view === 'INTERNAL' ? 'active' : ''}`}>SYSTEM</button>
                                <button onClick={() => setView('LAB')} className={`btn-tech px-5 py-2 text-[10px] font-bold text-pink-400 border-pink-900 ${view === 'LAB' ? 'active bg-pink-900/20' : ''}`}>LAB</button>
                            </div>
                        </div>
                        
                        <div className="tech-panel p-4 w-72 text-xs">
                            {view === 'LAB' ? (
                                <>
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                        <span className="text-pink-400">ANALYSIS</span>
                                        <span className="font-bold text-white">REPLAY</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-1 text-[9px] text-gray-500">PATTERN MATCH</div>
                                            <div className="match-bar-bg"><div className="match-bar-fill" style={{width: `${analysisData.similarity}%`}}></div></div>
                                        </div>
                                        <div className="text-[9px] text-gray-400 leading-relaxed border-l-2 border-pink-500 pl-2">
                                            {analysisData.summary || "NO DATA"}
                                            <br/><span className="text-white/30">CONFIDENCE: {analysisData.confidence}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                        <span className="text-gray-400">MODE</span>
                                        <span className="font-bold text-white">{systemState.mode}</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[9px] text-gray-500"><span>INTEGRITY</span><span>{systemState.integrity}%</span></div>
                                        <div className="w-full h-1 bg-gray-800"><div className="h-full bg-green-500" style={{width: `${systemState.integrity}%`}}></div></div>
                                        <div className="flex justify-between text-[9px] text-gray-500"><span>ENERGY</span><span>{systemState.energy}</span></div>
                                        <div className="w-full h-1 bg-white/10"><div className="h-full bg-blue-500" style={{width: `${Math.min(systemState.energy, 100)}%`}}></div></div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-8">
                        <div className="tech-panel p-4 flex-1 max-w-lg h-32 overflow-hidden flex flex-col text-xs">
                            <div className="text-gray-500 border-b border-gray-800 pb-1 mb-2 text-[9px] tracking-widest flex justify-between">
                                <span>LOG STREAM</span>
                                {view === 'LAB' && <span className="text-pink-500">GHOST DATA</span>}
                            </div>
                            <div className="flex-1 flex flex-col justify-end gap-1">
                                {logs.slice(-4).map((log, i) => (
                                    <div key={i} className="flex gap-3 text-gray-300">
                                        <span className="text-gray-600">[{log.time}]</span>
                                        <span className={log.msg.includes('REPLAY') ? 'text-pink-400' : ''}>{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Lab Controls */}
                        {view === 'LAB' && (
                            <div className="pointer-events-auto flex gap-2">
                                <button onClick={() => injectTask('REPLAY')} className="btn-tech px-4 py-3 text-[10px] font-bold tracking-wider text-pink-400 border-pink-800 hover:bg-pink-900/30">RUN REPLAY</button>
                            </div>
                        )}
                        
                        {/* Normal Controls */}
                        {view === 'INTERNAL' && (
                             <div className="pointer-events-auto flex gap-2">
                                {['PEOPLE', 'MONEY', 'WORK', 'GROWTH'].map(type => (
                                    <button key={type} onClick={() => injectTask(type)} className="btn-tech px-4 py-3 text-[10px] font-bold tracking-wider">{type}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // =====================================================================
        // APP LOGIC
        // =====================================================================

        function App() {
            const [view, setView] = useState('INTERNAL');
            const [tasks, setTasks] = useState([]);
            const [ghosts, setGhosts] = useState([]);
            const [logs, setLogs] = useState([]);
            const [input, setInput] = useState("");
            const [systemState, setSystemState] = useState({ mode: 'SEED', integrity: 100, energy: 100 });
            const [analysisData, setAnalysisData] = useState({ similarity: 0, summary: "WAITING...", confidence: "-" });

            const addLog = (msg) => {
                const time = new Date().toLocaleTimeString('en-US', {hour12:false}).split(' ')[0];
                setLogs(prev => [...prev, { time, msg }].slice(-15));
            };

            const injectTask = async (type) => {
                if (type === 'REPLAY') {
                    addLog(`REPLAY: Fetching history...`);
                    const replayData = await fetchReplay();
                    
                    if (replayData && replayData.explanation) {
                        setAnalysisData({
                            similarity: Math.floor(Math.random() * 20 + 75), // Mock sim score for demo
                            summary: replayData.explanation.summary,
                            confidence: replayData.explanation.confidence
                        });
                        
                        // Spawn Ghosts
                        for(let i=0; i<3; i++) {
                            setTimeout(() => {
                                setGhosts(prev => [...prev, { id: Date.now() + Math.random(), type: 'GHOST', color: COLORS.GHOST }]);
                            }, i * 300);
                        }
                        addLog(`REPLAY: Ghosts Spawned.`);
                    }
                    return;
                }
                const newTask = { id: Date.now() + Math.random(), type, color: COLORS[type] || '#FFFFFF' };
                setTasks(prev => [...prev, newTask]);
            };

            const handleTaskComplete = (id) => {
                setTasks(prev => prev.filter(t => t.id !== id));
                setGhosts(prev => prev.filter(t => t.id !== id));
            };

            const sendCommand = async (e) => {
                e.preventDefault();
                if(!input) return;
                const text = input; setInput("");
                
                // Direct Pipeline Call
                try {
                    const res = await fetch(`${API_BASE}/pipeline/process`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ text })
                    });
                    const result = await res.json();
                    
                    if (result.state) setSystemState(prev => ({ ...prev, ...result.state }));
                    if (result.parsed) injectTask(result.parsed.type || 'WORK');
                    if (result.logs) result.logs.forEach(l => addLog(l));
                } catch (err) {
                    addLog(`EXEC: ${text} (Local Mode)`);
                    injectTask('WORK');
                }
            };

            return (
                <div className="w-full h-full relative bg-black">
                    <HUD view={view} setView={setView} injectTask={injectTask} logs={logs} systemState={systemState} analysisData={analysisData} />
                    
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-[500px] pointer-events-auto">
                         <form onSubmit={sendCommand}>
                            <input value={input} onChange={e=>setInput(e.target.value)} className="input-tech w-full px-4 py-3 text-xs text-center font-mono placeholder-gray-600 focus:placeholder-transparent input-glow" placeholder="> COMMAND LINE" />
                        </form>
                    </div>

                    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
                        <color attach="background" args={['#000000']} />
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
                        {view === 'EXTERNAL' ? (
                            <> <OrthographicCamera makeDefault position={[20, 20, 20]} zoom={35} onUpdate={c => c.lookAt(0, 0, 0)} /> <CosmosScene /> </>
                        ) : (
                            <> <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={45} onUpdate={c => c.lookAt(0, 0, 0)} /> 
                               <OrganismScene tasks={tasks} ghosts={ghosts} onTaskComplete={handleTaskComplete} boundaryActive={false} /> 
                            </>
                        )}
                    </Canvas>
                </div>
            );
        }
        createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
EOF

echo "✅ Autus v3.8 업데이트 완료! 브라우저를 새로고침하세요."
