/**
 * AUTUS Three.js Effects
 * 파티클 + 홀로그램 배경 효과
 */

function initAutusEffects(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('[AUTUS Effects] Container not found:', containerId);
    return null;
  }
  
  const config = {
    particleCount: options.particleCount || 300,
    colorPrimary: options.colorPrimary || 0x00ffcc,
    colorWarning: options.colorWarning || 0xff6600,
    colorDanger: options.colorDanger || 0xff3333,
    ...options
  };
  
  // Three.js 설정
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;
  
  const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  
  // 파티클 시스템
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(config.particleCount * 3);
  const velocities = new Float32Array(config.particleCount * 3);
  const colors = new Float32Array(config.particleCount * 3);
  
  const primaryColor = new THREE.Color(config.colorPrimary);
  
  for (let i = 0; i < config.particleCount; i++) {
    const i3 = i * 3;
    
    // 위치 (구형 분포)
    const radius = 30 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);
    
    // 속도 (느린 움직임)
    velocities[i3] = (Math.random() - 0.5) * 0.05;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
    
    // 색상
    colors[i3] = primaryColor.r;
    colors[i3 + 1] = primaryColor.g;
    colors[i3 + 2] = primaryColor.b;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: 1.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  
  // 홀로그램 링
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeo = new THREE.RingGeometry(15 + i * 8, 15.5 + i * 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: config.colorPrimary,
      transparent: true,
      opacity: 0.15 - i * 0.04,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -20 + i * 5;
    scene.add(ring);
    rings.push(ring);
  }
  
  // 연결선 (노드 네트워크 효과)
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = new Float32Array(50 * 6); // 50개 선 × 2 포인트 × 3 좌표
  
  for (let i = 0; i < 50; i++) {
    const i6 = i * 6;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = angle1 + (Math.random() - 0.5) * 0.5;
    const r1 = 20 + Math.random() * 20;
    const r2 = 20 + Math.random() * 20;
    
    linePositions[i6] = Math.cos(angle1) * r1;
    linePositions[i6 + 1] = (Math.random() - 0.5) * 30;
    linePositions[i6 + 2] = Math.sin(angle1) * r1;
    
    linePositions[i6 + 3] = Math.cos(angle2) * r2;
    linePositions[i6 + 4] = (Math.random() - 0.5) * 30;
    linePositions[i6 + 5] = Math.sin(angle2) * r2;
  }
  
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  
  const lineMaterial = new THREE.LineBasicMaterial({
    color: config.colorPrimary,
    transparent: true,
    opacity: 0.2
  });
  
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(lines);
  
  // 상태 변수
  let intensity = 0.5;
  let mode = 'normal'; // 'normal', 'warning', 'danger'
  let targetColor = new THREE.Color(config.colorPrimary);
  let currentColor = new THREE.Color(config.colorPrimary);
  
  // 애니메이션 루프
  let animationId;
  const clock = new THREE.Clock();
  
  function animate() {
    animationId = requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();
    
    // 파티클 업데이트
    const posAttr = particleGeometry.attributes.position;
    const colAttr = particleGeometry.attributes.color;
    
    for (let i = 0; i < config.particleCount; i++) {
      const i3 = i * 3;
      
      // 위치 업데이트
      posAttr.array[i3] += velocities[i3] * intensity;
      posAttr.array[i3 + 1] += velocities[i3 + 1] * intensity;
      posAttr.array[i3 + 2] += velocities[i3 + 2] * intensity;
      
      // 경계 체크
      const dist = Math.sqrt(
        posAttr.array[i3] ** 2 + 
        posAttr.array[i3 + 1] ** 2 + 
        posAttr.array[i3 + 2] ** 2
      );
      
      if (dist > 80 || dist < 10) {
        velocities[i3] *= -1;
        velocities[i3 + 1] *= -1;
        velocities[i3 + 2] *= -1;
      }
      
      // 색상 보간
      colAttr.array[i3] += (currentColor.r - colAttr.array[i3]) * 0.05;
      colAttr.array[i3 + 1] += (currentColor.g - colAttr.array[i3 + 1]) * 0.05;
      colAttr.array[i3 + 2] += (currentColor.b - colAttr.array[i3 + 2]) * 0.05;
    }
    
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    
    // 색상 보간
    currentColor.lerp(targetColor, 0.02);
    
    // 링 회전
    rings.forEach((ring, i) => {
      ring.rotation.z = time * 0.1 * (i % 2 === 0 ? 1 : -1);
    });
    
    // 선 회전
    lines.rotation.y = time * 0.05;
    
    // 파티클 전체 회전
    particles.rotation.y = time * 0.02;
    particles.rotation.x = Math.sin(time * 0.1) * 0.1;
    
    // 카메라 흔들림 (intensity에 따라)
    camera.position.x = Math.sin(time * 0.3) * intensity * 2;
    camera.position.y = Math.cos(time * 0.2) * intensity * 2;
    
    renderer.render(scene, camera);
  }
  
  animate();
  
  // 리사이즈 핸들러
  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  window.addEventListener('resize', handleResize);
  
  // 정리 함수
  function dispose() {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', handleResize);
    
    particleGeometry.dispose();
    particleMaterial.dispose();
    lineGeometry.dispose();
    lineMaterial.dispose();
    rings.forEach(r => {
      r.geometry.dispose();
      r.material.dispose();
    });
    
    renderer.dispose();
    container.removeChild(renderer.domElement);
  }
  
  // 공개 API
  return {
    setIntensity(value) {
      intensity = Math.max(0.1, Math.min(2, value));
    },
    
    setMode(newMode) {
      mode = newMode;
      switch (mode) {
        case 'warning':
          targetColor.setHex(config.colorWarning);
          break;
        case 'danger':
          targetColor.setHex(config.colorDanger);
          break;
        default:
          targetColor.setHex(config.colorPrimary);
      }
    },
    
    pulse() {
      // 일시적 강도 증가
      const original = intensity;
      intensity = 2;
      setTimeout(() => { intensity = original; }, 500);
    },
    
    dispose
  };
}

// 글로벌 노출
window.initAutusEffects = initAutusEffects;
