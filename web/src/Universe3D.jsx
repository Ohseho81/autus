import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls, Text, Line } from '@react-three/drei'

// Identity - 중심 별
function IdentityStar({ coordinates }) {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  return (
    <Sphere ref={meshRef} args={[0.5, 32, 32]} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ff8c00"
        emissiveIntensity={0.5}
      />
    </Sphere>
  )
}

// Worlds - 행성들
function WorldPlanet({ name, position, color }) {
  const meshRef = useRef()
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <group position={position}>
      <Sphere ref={meshRef} args={[0.3, 32, 32]}>
        <meshStandardMaterial color={color} />
      </Sphere>
    </group>
  )
}

// Packs - 궤도 위성
function PackSatellite({ name, orbitRadius, speed, color }) {
  const groupRef = useRef()
  const angle = useRef(Math.random() * Math.PI * 2)
  
  useFrame((state) => {
    angle.current += speed
    if (groupRef.current) {
      groupRef.current.position.x = Math.cos(angle.current) * orbitRadius
      groupRef.current.position.z = Math.sin(angle.current) * orbitRadius
    }
  })

  return (
    <group ref={groupRef}>
      <Sphere args={[0.1, 16, 16]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </Sphere>
    </group>
  )
}

// 궤도 링
function OrbitRing({ radius }) {
  const points = []
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2
    points.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius])
  }
  
  return (
    <Line
      points={points}
      color="#ffffff"
      opacity={0.2}
      transparent
      lineWidth={1}
    />
  )
}

// 연결선
function ConnectionLine({ start, end }) {
  return (
    <Line
      points={[start, end]}
      color="#4fc3f7"
      opacity={0.4}
      transparent
      lineWidth={1}
    />
  )
}

export default function Universe3D({ data }) {
  const worlds = [
    { name: 'Seoul', position: [3, 0, 0], color: '#4fc3f7' },
    { name: 'Clark', position: [-2, 0, 2.5], color: '#81c784' },
    { name: 'Kathmandu', position: [-1, 0, -3], color: '#ffb74d' },
  ]

  const packs = [
    { name: 'school', orbitRadius: 1.5, speed: 0.02, color: '#e91e63' },
    { name: 'visa', orbitRadius: 1.8, speed: 0.015, color: '#9c27b0' },
    { name: 'cmms', orbitRadius: 2.1, speed: 0.01, color: '#3f51b5' },
    { name: 'admissions', orbitRadius: 2.4, speed: 0.008, color: '#00bcd4' },
  ]

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', background: '#0a0a1a' }}>
      <Canvas camera={{ position: [0, 5, 8], fov: 50 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 0]} intensity={2} color="#ffd700" />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        {/* Layer 1: Identity Star (중심) */}
        <IdentityStar coordinates={data?.layers?.["1_identity"]?.coordinates} />

        {/* Layer 3: World Planets */}
        {worlds.map((world, i) => (
          <WorldPlanet key={world.name} {...world} />
        ))}

        {/* Layer 4: Pack Satellites */}
        {packs.map((pack, i) => (
          <PackSatellite key={pack.name} {...pack} />
        ))}

        {/* Orbit Rings */}
        <OrbitRing radius={1.5} />
        <OrbitRing radius={1.8} />
        <OrbitRing radius={2.1} />
        <OrbitRing radius={2.4} />

        {/* Connection Lines to Worlds */}
        {worlds.map((world, i) => (
          <ConnectionLine key={i} start={[0, 0, 0]} end={world.position} />
        ))}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
    </div>
  )
}


