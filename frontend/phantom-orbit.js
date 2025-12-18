// ═══════════════════════════════════════════════════════════════
// AUTUS Phantom Orbit v1.0
// 선택에 따른 미래 궤도를 3D로 시각화
// "지금 선택하면 미래가 이렇게 달라진다"
// ═══════════════════════════════════════════════════════════════

class PhantomOrbit {
  constructor() {
    this.phantomGroup = null;
    this.phantomPlanets = {};
    this.phantomRing = null;
    this.phantomTrails = {};
    this.activeChoice = null;
    this.isVisible = false;
    this.animationPhase = 0;
    
    this.init();
  }

  init() {
    // Three.js scene이 로드될 때까지 대기
    this.waitForScene();
  }

  waitForScene() {
    if (typeof scene !== 'undefined' && typeof THREE !== 'undefined') {
      this.createPhantomGroup();
      this.attachListeners();
      console.log('[PhantomOrbit] Initialized');
    } else {
      setTimeout(() => this.waitForScene(), 100);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom Group 생성
  // ─────────────────────────────────────────────────────────────
  createPhantomGroup() {
    this.phantomGroup = new THREE.Group();
    this.phantomGroup.visible = false;
    scene.add(this.phantomGroup);

    // Phantom Ring (미래 Failure Ring)
    this.createPhantomRing();
    
    // Phantom Planets (미래 행성 위치)
    this.createPhantomPlanets();
    
    // Phantom Trails (현재→미래 경로)
    this.createPhantomTrails();
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom Ring (미래 상태의 링)
  // ─────────────────────────────────────────────────────────────
  createPhantomRing() {
    const geometry = new THREE.TorusGeometry(8.0, 0.08, 8, 128);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.0,
      wireframe: true
    });
    
    this.phantomRing = new THREE.Mesh(geometry, material);
    this.phantomRing.rotation.x = Math.PI / 2;
    this.phantomRing.position.y = 0.4;
    this.phantomGroup.add(this.phantomRing);
    
    // 기준 위치 저장
    this.phantomRingBase = geometry.attributes.position.array.slice();
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom Planets (미래 행성 위치)
  // ─────────────────────────────────────────────────────────────
  createPhantomPlanets() {
    if (typeof PLANETS === 'undefined') return;
    
    PLANETS.forEach(p => {
      const geometry = new THREE.SphereGeometry(p.size * 0.8, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: 0.0,
        wireframe: true
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { key: p.key, orbit: p.orbit };
      
      this.phantomPlanets[p.key] = mesh;
      this.phantomGroup.add(mesh);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom Trails (현재→미래 경로선)
  // ─────────────────────────────────────────────────────────────
  createPhantomTrails() {
    if (typeof PLANETS === 'undefined') return;
    
    PLANETS.forEach(p => {
      const material = new THREE.LineBasicMaterial({
        color: p.color,
        transparent: true,
        opacity: 0.0
      });
      
      // 초기 점 2개 (나중에 업데이트)
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6); // 2 points × 3 coords
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const line = new THREE.Line(geometry, material);
      this.phantomTrails[p.key] = line;
      this.phantomGroup.add(line);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 미래 상태 계산
  // ─────────────────────────────────────────────────────────────
  calculateFutureState(choiceAction) {
    if (typeof TwinState === 'undefined' || typeof applyImpulse === 'undefined') {
      return null;
    }
    
    const futureState = applyImpulse({ ...TwinState }, choiceAction);
    const futureDerived = typeof computeDerived === 'function' 
      ? computeDerived(futureState) 
      : { risk: 0.5, entropy: 0.5 };
    
    return { state: futureState, derived: futureDerived };
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom 표시 (Choice 선택 시)
  // ─────────────────────────────────────────────────────────────
  show(choiceAction) {
    const future = this.calculateFutureState(choiceAction);
    if (!future) return;
    
    this.activeChoice = choiceAction;
    this.isVisible = true;
    this.phantomGroup.visible = true;
    
    // Ring 색상 결정 (개선/악화)
    const currentRisk = typeof PhysicsFrame !== 'undefined' 
      ? PhysicsFrame.snapshot.risk 
      : 0.5;
    const isImprovement = future.derived.risk < currentRisk;
    
    this.phantomRing.material.color.setHex(isImprovement ? 0x00ff88 : 0xff4444);
    
    // 애니메이션 시작
    this.animateIn(future);
    
    // 행성 미래 위치 업데이트
    this.updatePhantomPositions(future.state);
    
    console.log(`[PhantomOrbit] Show: ${choiceAction}, Risk: ${currentRisk.toFixed(2)} → ${future.derived.risk.toFixed(2)}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom 숨기기
  // ─────────────────────────────────────────────────────────────
  hide() {
    this.isVisible = false;
    this.activeChoice = null;
    this.animateOut();
  }

  // ─────────────────────────────────────────────────────────────
  // Fade In 애니메이션
  // ─────────────────────────────────────────────────────────────
  animateIn(future) {
    const targetOpacity = 0.6;
    const duration = 500;
    const startTime = performance.now();
    
    const animate = () => {
      if (!this.isVisible) return;
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      
      // Ring opacity
      this.phantomRing.material.opacity = eased * targetOpacity;
      
      // Planets opacity
      Object.values(this.phantomPlanets).forEach(mesh => {
        mesh.material.opacity = eased * targetOpacity;
      });
      
      // Trails opacity
      Object.values(this.phantomTrails).forEach(line => {
        line.material.opacity = eased * 0.4;
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // ─────────────────────────────────────────────────────────────
  // Fade Out 애니메이션
  // ─────────────────────────────────────────────────────────────
  animateOut() {
    const duration = 300;
    const startTime = performance.now();
    const startOpacity = this.phantomRing.material.opacity;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const opacity = startOpacity * (1 - progress);
      
      this.phantomRing.material.opacity = opacity;
      
      Object.values(this.phantomPlanets).forEach(mesh => {
        mesh.material.opacity = opacity;
      });
      
      Object.values(this.phantomTrails).forEach(line => {
        line.material.opacity = opacity * 0.6;
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.phantomGroup.visible = false;
      }
    };
    
    animate();
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom Ring 변형
  // ─────────────────────────────────────────────────────────────
  deformPhantomRing(futureRisk, futureEntropy) {
    if (!this.phantomRing || !this.phantomRingBase) return;
    
    const positions = this.phantomRing.geometry.attributes.position.array;
    const basePos = this.phantomRingBase;
    
    // Risk → Scale (낮을수록 큼)
    const scale = 1.0 - 0.65 * futureRisk;
    
    for (let i = 0; i < positions.length; i += 3) {
      const bx = basePos[i], by = basePos[i + 1], bz = basePos[i + 2];
      positions[i] = bx * scale;
      positions[i + 1] = by;
      positions[i + 2] = bz * scale;
    }
    
    this.phantomRing.geometry.attributes.position.needsUpdate = true;
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom 행성 위치 업데이트
  // ─────────────────────────────────────────────────────────────
  updatePhantomPositions(futureState) {
    if (typeof PLANETS === 'undefined' || typeof planetMeshes === 'undefined') return;
    
    PLANETS.forEach(p => {
      const phantomMesh = this.phantomPlanets[p.key];
      const currentMesh = planetMeshes[p.key];
      
      if (!phantomMesh || !currentMesh) return;
      
      // 현재 위치
      const currentPos = currentMesh.position.clone();
      
      // 미래 값에 따른 궤도 변화
      const futureValue = futureState[p.key] || 0.5;
      const currentValue = typeof TwinState !== 'undefined' ? TwinState[p.key] : 0.5;
      const delta = futureValue - currentValue;
      
      // 미래 위치 계산 (궤도 + 오프셋)
      const orbitOffset = delta * 2; // 값 변화에 따른 궤도 변화
      const futureOrbit = p.orbit + orbitOffset;
      
      // 현재 각도 유지, 궤도만 변경
      const angle = Math.atan2(currentPos.z, currentPos.x);
      phantomMesh.position.set(
        Math.cos(angle) * futureOrbit,
        currentPos.y + delta * 0.5,
        Math.sin(angle) * futureOrbit
      );
      
      // Trail 업데이트
      this.updateTrail(p.key, currentPos, phantomMesh.position);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Trail (현재→미래 경로선) 업데이트
  // ─────────────────────────────────────────────────────────────
  updateTrail(key, from, to) {
    const trail = this.phantomTrails[key];
    if (!trail) return;
    
    const positions = trail.geometry.attributes.position.array;
    
    // 시작점 (현재)
    positions[0] = from.x;
    positions[1] = from.y;
    positions[2] = from.z;
    
    // 끝점 (미래)
    positions[3] = to.x;
    positions[4] = to.y;
    positions[5] = to.z;
    
    trail.geometry.attributes.position.needsUpdate = true;
  }

  // ─────────────────────────────────────────────────────────────
  // 이벤트 리스너
  // ─────────────────────────────────────────────────────────────
  attachListeners() {
    // Choice Card 호버 감지
    document.addEventListener('mouseenter', (e) => {
      const card = e.target.closest('.choice-card');
      if (card) {
        const btn = card.querySelector('.card-lock-btn');
        if (btn) {
          this.show(btn.dataset.action);
        }
      }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      const card = e.target.closest('.choice-card');
      if (card) {
        this.hide();
      }
    }, true);
    
    // 기존 액션 버튼 호버
    document.addEventListener('mouseenter', (e) => {
      const btn = e.target.closest('.action-btn');
      if (btn) {
        const action = btn.dataset.action || this.detectAction(btn);
        if (action) this.show(action);
      }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
      const btn = e.target.closest('.action-btn');
      if (btn) {
        this.hide();
      }
    }, true);
  }

  detectAction(btn) {
    const text = btn.textContent.toUpperCase();
    if (text.includes('RECOVER')) return 'recover';
    if (text.includes('DEFRICTION')) return 'defriction';
    if (text.includes('SHOCK')) return 'shock_damp';
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // 매 프레임 업데이트 (애니메이션 루프에서 호출)
  // ─────────────────────────────────────────────────────────────
  update(time) {
    if (!this.isVisible || !this.activeChoice) return;
    
    this.animationPhase += 0.02;
    
    // Phantom Ring 펄스 효과
    const pulse = Math.sin(this.animationPhase * 2) * 0.1 + 0.5;
    this.phantomRing.material.opacity = pulse;
    
    // Phantom Planets 글로우 효과
    Object.values(this.phantomPlanets).forEach((mesh, i) => {
      const offset = i * 0.3;
      mesh.material.opacity = Math.sin(this.animationPhase + offset) * 0.2 + 0.4;
    });
  }
}

// 전역 인스턴스
window.phantomOrbit = new PhantomOrbit();

// 애니메이션 루프에 연결
const originalAnimate = window.animate;
if (typeof originalAnimate === 'function') {
  window.animate = function() {
    originalAnimate();
    if (window.phantomOrbit) {
      window.phantomOrbit.update(performance.now());
    }
  };
}
