// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Scene (Main 3D Canvas with Post-processing)
// ═══════════════════════════════════════════════════════════════════════════════

import { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera,
  Environment,
  Stars,
  Float,
} from '@react-three/drei';
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { GalaxyNodes } from './GalaxyNodes';
import { GalaxyConnections, OrbitRings } from './GalaxyConnections';
import { GalaxyStarfield, GalaxyNebula } from './GalaxyStarfield';
import { useGalaxyStore } from './useGalaxyStore';
import { VISUAL_CONFIG, COLORS } from './constants';

// 로딩 폴백
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#FFD700" wireframe />
    </mesh>
  );
}

// 조명 시스템
function Lighting() {
  return (
    <>
      {/* 앰비언트 (전체 기본 조명) */}
      <ambientLight intensity={0.1} color="#1a1a2e" />
      
      {/* 중앙 포인트 라이트 (User Node에서 방출) */}
      <pointLight
        position={[0, 0, 0]}
        intensity={3}
        color="#FFD700"
        distance={50}
        decay={2}
      />
      
      {/* 상단 디렉셔널 라이트 */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.5}
        color="#ffffff"
      />
      
      {/* 하단 필 라이트 */}
      <pointLight
        position={[0, -20, 0]}
        intensity={0.3}
        color="#4488ff"
        distance={40}
      />
    </>
  );
}

// 카메라 컨트롤러
function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { cameraState, setCameraState, hoveredCluster, clusters } = useGalaxyStore();
  
  // 클러스터 호버 시 카메라 이동
  useFrame((state, delta) => {
    if (hoveredCluster && controlsRef.current) {
      const cluster = clusters.find(c => c.id === hoveredCluster);
      if (cluster) {
        // 부드럽게 타겟 이동
        const targetX = THREE.MathUtils.lerp(
          controlsRef.current.target.x,
          cluster.centerPosition.x * 0.3,
          delta * 2
        );
        const targetY = THREE.MathUtils.lerp(
          controlsRef.current.target.y,
          cluster.centerPosition.y * 0.3,
          delta * 2
        );
        const targetZ = THREE.MathUtils.lerp(
          controlsRef.current.target.z,
          cluster.centerPosition.z * 0.3,
          delta * 2
        );
        
        controlsRef.current.target.set(targetX, targetY, targetZ);
      }
    } else if (controlsRef.current) {
      // 기본 위치로 복귀
      controlsRef.current.target.x = THREE.MathUtils.lerp(
        controlsRef.current.target.x, 0, delta
      );
      controlsRef.current.target.y = THREE.MathUtils.lerp(
        controlsRef.current.target.y, 0, delta
      );
      controlsRef.current.target.z = THREE.MathUtils.lerp(
        controlsRef.current.target.z, 0, delta
      );
    }
  });
  
  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={cameraState.position}
        fov={cameraState.fov}
        near={VISUAL_CONFIG.cameraNear}
        far={VISUAL_CONFIG.cameraFar}
      />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={10}
        maxDistance={80}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
      />
    </>
  );
}

// 후처리 효과
function PostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      {/* Bloom - 발광 효과 */}
      <Bloom
        intensity={VISUAL_CONFIG.bloomIntensity}
        luminanceThreshold={VISUAL_CONFIG.bloomLuminanceThreshold}
        luminanceSmoothing={VISUAL_CONFIG.bloomLuminanceSmoothing}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      
      {/* Chromatic Aberration - 색수차 */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0005, 0.0005)}
        radialModulation={false}
        modulationOffset={0}
      />
      
      {/* Noise - 필름 그레인 */}
      <Noise
        premultiply
        blendFunction={BlendFunction.ADD}
        opacity={0.02}
      />
      
      {/* Vignette - 비네팅 */}
      <Vignette
        offset={0.3}
        darkness={0.6}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

// 메인 씬 내용
function SceneContent() {
  return (
    <>
      {/* 조명 */}
      <Lighting />
      
      {/* 카메라 */}
      <CameraController />
      
      {/* 배경 */}
      <color attach="background" args={[COLORS.background]} />
      <fog attach="fog" args={[COLORS.background, 50, 150]} />
      
      {/* 별 배경 */}
      <GalaxyStarfield />
      <GalaxyNebula />
      <Stars
        radius={100}
        depth={50}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />
      
      {/* 궤도 링 */}
      <OrbitRings />
      
      {/* 연결선 */}
      <GalaxyConnections />
      
      {/* 노드들 */}
      <Float
        speed={0.5}
        rotationIntensity={0.1}
        floatIntensity={0.3}
      >
        <GalaxyNodes />
      </Float>
      
      {/* 후처리 */}
      <PostProcessing />
    </>
  );
}

// 메인 캔버스
interface GalaxySceneProps {
  className?: string;
}

export function GalaxyScene({ className = '' }: GalaxySceneProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        shadows={false}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GalaxyScene;
