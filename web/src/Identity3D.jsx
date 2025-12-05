import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls, MeshDistortMaterial } from '@react-three/drei'

function IdentityOrb({ coordinates }) {
  const meshRef = useRef()
  const { x, y, z } = coordinates

  // 좌표 기반 색상 계산
  const hue = ((z + 1) / 2) * 360
  const color = `hsl(${hue}, 70%, 50%)`

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005
      meshRef.current.rotation.y += 0.01
      // 좌표에 따라 살짝 움직임
      meshRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2 + x * 0.5
      meshRef.current.position.y = Math.cos(state.clock.elapsedTime * 0.3) * 0.2 + y * 0.5
    }
  })

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.4 + Math.abs(x) * 0.2}
        speed={2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  )
}

function ParticleRing({ coordinates }) {
  const groupRef = useRef()
  const { x, y, z } = coordinates
  const particleCount = 50

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += 0.002
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {[...Array(particleCount)].map((_, i) => {
        const angle = (i / particleCount) * Math.PI * 2
        const radius = 2 + Math.sin(i * 0.5) * 0.3
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial
              color={`hsl(${(i * 7 + z * 180) % 360}, 80%, 60%)`}
              emissive={`hsl(${(i * 7 + z * 180) % 360}, 80%, 30%)`}
              emissiveIntensity={0.5}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default function Identity3D({ coordinates }) {
  return (
    <div style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4fc3f7" />
        
        <IdentityOrb coordinates={coordinates} />
        <ParticleRing coordinates={coordinates} />
        
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  )
}

