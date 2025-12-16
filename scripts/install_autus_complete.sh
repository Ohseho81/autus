#!/bin/bash

echo "🦁 Autus v3.8 Full Stack (Frontend + Backend + Connection) 설치 중..."

# ==============================================================================
# 0. 기본 설정 (디렉토리 생성)
# ==============================================================================
mkdir -p core/autus/hassabis_v2
mkdir -p core/autus/dean
mkdir -p app/routers
mkdir -p frontend
mkdir -p tests/autus

# 패키지 Init
touch core/__init__.py core/autus/__init__.py
touch app/__init__.py app/routers/__init__.py

# ==============================================================================
# 1. 프론트엔드 (UI - Analyst Edition)
# ==============================================================================
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>AUTUS OS v3.8 (Analyst Edition)</title>
    <script type="importmap">
        { "imports": { "react": "https://esm.sh/react@18.2.0", "react-dom/client": "https://esm.sh/react-dom@18.2.0/client", "three": "https://esm.sh/three@0.160.0", "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.15.16?external=react,react-dom,three", "@react-three/drei": "https://esm.sh/@react-three/drei@9.99.0?external=react,react-dom,three,@react-three/fiber" } }
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; background: #000000; color: white; font-family: monospace; overflow: hidden; }
        #root { width: 100%; height: 100vh; }
        .glass { background: rgba(10,10,10,0.8); backdrop-filter: blur(8px); border: 1px solid #333; }
        .input-glow:focus { border-color: #3b82f6; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); outline: none; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel" data-type="module">
        import React, { useState, useEffect } from 'react';
        import { createRoot } from 'react-dom/client';
        import * as THREE from 'three';
        import { Canvas, useFrame } from '@react-three/fiber';
        import { OrbitControls, Stars, Html, Trail } from '@react-three/drei';

        const API_BASE = "http://localhost:8000/autus";

        function Particle({ color, isGhost }) {
            const ref = React.useRef();
            const [pos] = useState(()=>Math.random()*Math.PI*2);
            useFrame((state) => {
                const t = state.clock.elapsedTime + pos;
                ref.current.position.y = Math.sin(t) * 2;
                ref.current.position.x = Math.cos(t) * (isGhost ? 6 : 4);
                ref.current.position.z = Math.sin(t) * (isGhost ? 6 : 4);
            });
            return (
                <group>
                    <Trail width={isGhost?1:2} length={4} color={color} attenuation={t=>t}>
                        <mesh ref={ref}><sphereGeometry args={[0.2]} /><meshBasicMaterial color={color} /></mesh>
                    </Trail>
                </group>
            );
        }

        function App() {
            const [view, setView] = useState('EXTERNAL');
            const [state, setState] = useState({ mode: 'SEED', integrity: 100 });
            const [ghosts, setGhosts] = useState(false);
            const [input, setInput] = useState("");
            const [logs, setLogs] = useState([]);

            const addLog = (msg) => setLogs(prev => [...prev, msg].slice(-5));

            const send = async (e) => {
                e.preventDefault();
                const text = input;
                setInput("");
                try {
                    const res = await fetch(`${API_BASE}/pipeline/process`, {
                        method: 'POST', headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({ text })
                    });
                    const data = await res.json();
                    if(data.success) setState(data.state);
                    if(data.logs) data.logs.forEach(l => addLog(l));
                } catch(e) { 
                    addLog("SIMULATION: " + text); 
                }
            };
            
            const replay = async () => {
                setGhosts(true);
                addLog("REPLAY: Analyzing past patterns...");
                setTimeout(() => setGhosts(false), 3000);
            };

            return (
                <div className="w-full h-full relative">
                    <div className="absolute top-0 left-0 p-6 z-10 w-full flex justify-between pointer-events-none">
                        <div className="glass p-4 rounded text-white pointer-events-auto">
                            <h1 className="text-2xl font-bold">AUTUS v3.8</h1>
                            <div className="text-xs text-gray-400">ANALYST EDITION</div>
                            <div className="mt-2">MODE: <span className="text-blue-400">{state.mode}</span></div>
                            <div>INTEGRITY: <span className="text-green-400">{state.integrity}%</span></div>
                        </div>
                        <div className="pointer-events-auto flex gap-2 h-10">
                            <button onClick={()=>setView('EXTERNAL')} className="glass px-4 rounded hover:bg-white/10">UNIVERSE</button>
                            <button onClick={()=>setView('LAB')} className="glass px-4 rounded text-pink-400 border-pink-900 hover:bg-pink-900/20">LAB</button>
                        </div>
                    </div>

                    {/* Logs Panel */}
                    <div className="absolute top-32 left-6 w-64 glass p-2 rounded pointer-events-none text-xs text-gray-300 font-mono">
                         {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>

                    {view === 'LAB' && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto z-20">
                            <button onClick={replay} className="glass px-8 py-4 rounded text-xl font-bold text-pink-500 hover:bg-pink-900/30 border border-pink-500">RUN GHOST REPLAY</button>
                        </div>
                    )}

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-96 pointer-events-auto">
                        <form onSubmit={send}>
                            <input value={input} onChange={e=>setInput(e.target.value)} className="glass w-full px-4 py-3 text-white rounded outline-none text-center input-glow" placeholder="COMMAND LINE" />
                        </form>
                    </div>

                    <Canvas>
                        <color attach="background" args={['#000']} />
                        <Stars />
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10,10,10]} />
                        {ghosts && Array.from({length:5}).map((_,i)=><Particle key={i} color="#ec4899" isGhost={true} />)}
                        {!ghosts && <Particle color="#00ffff" />}
                        <OrbitControls />
                    </Canvas>
                </div>
            );
        }
        createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
EOF

# ==============================================================================
# 2. 백엔드 (Brain & Logic)
# ==============================================================================

# [Core] Matrix & Compute
cat > core/autus/matrix.py << 'EOF'
TASKS = ["People", "Money", "Work", "Policy"]
SLOTS = ["Brain", "Sensors", "Heart", "Core", "Engines", "Base", "Boundary"]
MATRIX = {
    "People": {"Brain": 0.7, "Sensors": 0.8, "Heart": 0.3, "Core": 0.1, "Engines": 0.1, "Base": 0.0, "Boundary": 0.2},
    "Money": {"Brain": 0.2, "Sensors": 0.1, "Heart": 0.4, "Core": 0.8, "Engines": 0.3, "Base": 0.9, "Boundary": 0.3},
    "Work": {"Brain": 0.3, "Sensors": 0.2, "Heart": 0.2, "Core": 0.3, "Engines": 0.9, "Base": 0.2, "Boundary": 0.1},
    "Policy": {"Brain": 0.5, "Sensors": 0.3, "Heart": 0.6, "Core": 0.2, "Engines": 0.1, "Base": 0.3, "Boundary": 0.8},
}
EOF

cat > core/autus/compute.py << 'EOF'
from .matrix import MATRIX, TASKS, SLOTS
def compute_slots(task_inputs: dict) -> dict:
    slots = {slot: 0.0 for slot in SLOTS}
    for task in TASKS:
        v = float(task_inputs.get(task, 0.0))
        for slot in SLOTS: slots[slot] += v * MATRIX[task][slot]
    return {k: round(v, 6) for k, v in slots.items()}
EOF

# [Core] Hastings (Filter)
cat > core/autus/hastings.py << 'EOF'
import time
from typing import Dict, Any, List
class HastingsLayer:
    def __init__(self):
        self.history = []
    def inspect(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        raw = parsed_data.get("raw", "")
        if not raw or len(raw) < 2: return {"valid": False, "reason": "NOISE"}
        if parsed_data["ir"]["pressure"] > 0.8:
            if not any(h["type"] == parsed_data["type"] for h in self.history[-5:]):
                return {"valid": True, "warnings": ["SPIKE"]}
        self.history.append({"type": parsed_data["type"], "time": time.time()})
        return {"valid": True, "warnings": []}
EOF

# [Core] Nadella (Health)
cat > core/autus/nadella.py << 'EOF'
import math
from typing import Dict, Any
class NadellaLayer:
    def assess(self, state: Dict[str, Any], task_type: str) -> Dict[str, Any]:
        integrity = state.get("integrity", 100.0)
        gmu_count = state.get("gmu_count", 1)
        talent_density = integrity / max(1.0, math.log2(gmu_count + 1))
        empathy = 1.2 if task_type == 'PEOPLE' and talent_density > 80 else 1.0
        return {"talent_density": talent_density, "empathy_factor": empathy, "allow_expansion": talent_density >= 70, "logs": []}
EOF

# [Core] Grove (Growth)
cat > core/autus/grove.py << 'EOF'
from enum import Enum
class GroveState(str, Enum):
    NORMAL="normal"; TENSION="tension"; INFLECTION="inflection"; TRANSITION_READY="transition_ready"
class GroveLayer:
    def __init__(self): self.points = 0
    def accumulate(self, success):
        if success: self.points += 1
        if self.points >= 3:
            self.points = 0
            return {"type": "TRANSITION_READY"}
        return {"type": "GROWING", "progress": self.points/3}
EOF

# [Core] CZ (Boundary)
cat > core/autus/cz.py << 'EOF'
class CZLayer:
    def __init__(self):
        self.modes = ['SEED', 'GROWTH', 'SCALE', 'DOMINANCE']
        self.idx = 0
    def evaluate(self, grove, state, nadella):
        if grove.get("type") != "TRANSITION_READY": return {"action": "MONITOR"}
        if not nadella["allow_expansion"]: return {"action": "REJECT", "reason": "Nadella Veto"}
        if state["integrity"] < 85: return {"action": "REJECT", "reason": "Low Integrity"}
        if self.idx < len(self.modes)-1:
            self.idx += 1
            return {"action": "TRANSITION", "mode": self.modes[self.idx], "cost": 30, "replication": self.modes[self.idx]=="SCALE"}
        return {"action": "MAX_LEVEL"}
EOF

# [Core] Hassabis v2 (Analysis - Replay)
cat > core/autus/hassabis_v2/replay.py << 'EOF'
from typing import List, Dict, Any
def replay_segment(segment: List[Dict], variation: Dict=None) -> Dict[str, Any]:
    return {
        "summary": "SIMULATED PATH DIVERGENCE",
        "key_factors": ["Energy", "Integrity"],
        "confidence": "HIGH"
    }
EOF

# [Pipeline] Integrated Logic
cat > core/autus/pipeline.py << 'EOF'
from .hastings import HastingsLayer
from .nadella import NadellaLayer
from .grove import GroveLayer
from .cz import CZLayer

class AutusPipeline:
    def __init__(self):
        self.state = {"integrity": 100, "energy": 100, "mode": "SEED", "gmu_count": 1}
        self.layers = {
            "hastings": HastingsLayer(),
            "nadella": NadellaLayer(),
            "grove": GroveLayer(),
            "cz": CZLayer()
        }
    
    def process(self, text: str):
        logs = []
        task = "WORK"
        if "사람" in text: task = "PEOPLE"
        elif "돈" in text: task = "MONEY"
        elif "성장" in text: task = "GROWTH_HACK"
        
        parsed = {"raw": text, "type": task, "ir": {"pressure": 0.5}}
        
        # 1. Hastings
        insp = self.layers["hastings"].inspect(parsed)
        if not insp["valid"]: return {"success": False, "logs": ["BLOCKED: Noise"]}
        
        # 2. Nadella
        nadella = self.layers["nadella"].assess(self.state, task)
        self.state["integrity"] = min(100, self.state["integrity"] + (1 if task=="PEOPLE" else 0))
        
        # 3. Grove
        grove = self.layers["grove"].accumulate(True)
        visual = None
        
        if grove["type"] == "TRANSITION_READY":
            cz = self.layers["cz"].evaluate(grove, self.state, nadella)
            if cz["action"] == "TRANSITION":
                self.state["mode"] = cz["mode"]
                self.state["energy"] -= cz["cost"]
                if cz.get("replication"): self.state["gmu_count"] *= 2
                visual = "TRANSITION"
                logs.append(f"CZ: Expanded to {cz['mode']}")
        else:
            logs.append(f"GROVE: Charging {grove.get('progress',0)*100:.0f}%")
            
        logs.append(f"EXEC: {task}")
        return {"success": True, "state": self.state, "logs": logs, "parsed": parsed, "visualEffect": visual}
EOF

# ==============================================================================
# 3. 실제 연결 (API & Main)
# ==============================================================================

# API Router
cat > app/routers/autus_pipeline.py << 'EOF'
from fastapi import APIRouter
from pydantic import BaseModel
from core.autus.pipeline import AutusPipeline
from core.autus.hassabis_v2.replay import replay_segment

router = APIRouter(prefix="/autus", tags=["autus"])
pipeline = AutusPipeline()

class Input(BaseModel): text: str
class ReplayInput(BaseModel): gmu_id: str; variation: dict

@router.post("/pipeline/process")
def process(body: Input):
    return pipeline.process(body.text)

@router.post("/hassabis/replay")
def replay(body: ReplayInput):
    return {"explanation": replay_segment([], body.variation)}
EOF

# Main App
cat > app/main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.autus_pipeline import router

app = FastAPI(title="Autus OS v3.8")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
EOF

