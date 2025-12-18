// ═══════════════════════════════════════════════════════════════
// AUTUS Phantom Orbit System v1.0
// "미래는 행성 위에 뜬다" - 인과 기반 운영 지도
// ═══════════════════════════════════════════════════════════════

class PhantomOrbitEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.phantoms = new Map(); // choiceId → phantom data
    this.heldPhantoms = new Set(); // HOLD된 phantom IDs
    this.maxPhantoms = 3;
    this.animationId = null;
    
    // 물리→시각 매핑 상수
    this.config = {
      // 시간축 반경 오프셋
      timeOffsets: {
        h1: 0,      // 안쪽
        h24: 15,    // 중간
        d7: 30      // 바깥
      },
      // 겹침 회피
      radialSeparation: 0.35,
      phaseOffset: 12, // degrees
      // 애니메이션
      hoverDelay: 150,
      lockDuration: 800,
      // 영향도 가중치
      impactWeights: { rec: 0.35, rsk: 0.30, out: 0.20, conf: 0.15 }
    };
    
    // 행성 위치 (현재 Solar HQ 기준)
    this.planets = {
      recovery: { angle: 225, radius: 180, color: '#22c55e' },
      stability: { angle: 315, radius: 160, color: '#3b82f6' },
      cohesion: { angle: 45, radius: 200, color: '#8b5cf6' },
      shock: { angle: 135, radius: 220, color: '#ef4444' },
      friction: { angle: 180, radius: 190, color: '#f59e0b' },
      transfer: { angle: 0, radius: 170, color: '#06b6d4' },
      time: { angle: 270, radius: 150, color: '#ec4899' },
      quality: { angle: 90, radius: 140, color: '#10b981' },
      output: { angle: 160, radius: 130, color: '#f97316' }
    };
    
    this.center = { x: canvas.width / 2, y: canvas.height / 2 };
    this.gate = 'AMBER'; // 현재 Gate 상태
  }

  // ─────────────────────────────────────────────────────────────
  // Gate 상태 동기화
  // ─────────────────────────────────────────────────────────────
  setGate(gate) {
    this.gate = gate;
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom 생성 (Choice 기반)
  // ─────────────────────────────────────────────────────────────
  createPhantom(choiceId, choiceData) {
    // 최대 개수 체크
    if (this.phantoms.size >= this.maxPhantoms && !this.phantoms.has(choiceId)) {
      this.removeLowestImpact();
    }

    const phantom = {
      id: choiceId,
      choice: choiceData,
      affectedPlanets: this.getAffectedPlanets(choiceData),
      impact: this.calculateImpact(choiceData),
      state: 'entering', // entering, visible, held, locking, exiting
      opacity: 0,
      phase: 0,
      timestamp: Date.now()
    };

    this.phantoms.set(choiceId, phantom);
    return phantom;
  }

  // ─────────────────────────────────────────────────────────────
  // 영향받는 행성 계산
  // ─────────────────────────────────────────────────────────────
  getAffectedPlanets(choiceData) {
    const affected = [];
    const delta = choiceData.delta || {};
    
    Object.keys(delta).forEach(key => {
      const planetKey = this.mapDeltaToPlanet(key);
      if (planetKey && this.planets[planetKey]) {
        const d = delta[key];
        const magnitude = Math.abs(d.h24 || d.now || 0);
        if (magnitude > 0.01) {
          affected.push({
            planet: planetKey,
            delta: d,
            magnitude,
            direction: (d.h24 || d.now || 0) > 0 ? 'positive' : 'negative'
          });
        }
      }
    });

    return affected.sort((a, b) => b.magnitude - a.magnitude).slice(0, 3);
  }

  mapDeltaToPlanet(deltaKey) {
    const mapping = {
      recovery: 'recovery',
      friction: 'friction',
      shock: 'shock',
      stability: 'stability',
      cohesion: 'cohesion',
      transfer: 'transfer',
      flow: 'transfer',
      risk: null, // risk는 계산값, 행성 아님
      entropy: null,
      pressure: null
    };
    return mapping[deltaKey];
  }

  // ─────────────────────────────────────────────────────────────
  // 영향도(Impact Score) 계산
  // ─────────────────────────────────────────────────────────────
  calculateImpact(choiceData) {
    const w = this.config.impactWeights;
    const d = choiceData.delta || {};
    
    let score = 0;
    score += Math.abs(d.recovery?.h24 || 0) * w.rec;
    score += Math.abs(d.risk?.h24 || 0) * w.rsk;
    score += Math.abs(d.output?.h24 || 0) * w.out;
    score += (choiceData.confidence || 0.5) * w.conf;
    
    // Gate CRITICAL 시 risk 가중치 증가
    if (this.gate === 'RED') {
      score += Math.abs(d.risk?.h24 || 0) * 0.1;
    }
    
    return score;
  }

  // ─────────────────────────────────────────────────────────────
  // 가장 낮은 Impact 제거
  // ─────────────────────────────────────────────────────────────
  removeLowestImpact() {
    let lowest = null;
    let lowestScore = Infinity;
    
    this.phantoms.forEach((phantom, id) => {
      if (!this.heldPhantoms.has(id) && phantom.impact < lowestScore) {
        lowestScore = phantom.impact;
        lowest = id;
      }
    });
    
    if (lowest) {
      this.removePhantom(lowest);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Phantom 제거
  // ─────────────────────────────────────────────────────────────
  removePhantom(choiceId) {
    const phantom = this.phantoms.get(choiceId);
    if (phantom) {
      phantom.state = 'exiting';
      setTimeout(() => {
        this.phantoms.delete(choiceId);
        this.heldPhantoms.delete(choiceId);
      }, 300);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HOLD (비교 모드)
  // ─────────────────────────────────────────────────────────────
  holdPhantom(choiceId) {
    if (this.phantoms.has(choiceId)) {
      this.heldPhantoms.add(choiceId);
      this.phantoms.get(choiceId).state = 'held';
    }
  }

  releasePhantom(choiceId) {
    this.heldPhantoms.delete(choiceId);
    if (this.phantoms.has(choiceId)) {
      this.phantoms.get(choiceId).state = 'exiting';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOCK (선택 확정)
  // ─────────────────────────────────────────────────────────────
  lockPhantom(choiceId) {
    const phantom = this.phantoms.get(choiceId);
    if (!phantom) return;

    phantom.state = 'locking';
    phantom.timestamp = Date.now();
    
    // 다른 Phantom 모두 제거
    this.phantoms.forEach((p, id) => {
      if (id !== choiceId) {
        this.removePhantom(id);
      }
    });

    // 수렴 애니메이션 후 제거
    setTimeout(() => {
      this.phantoms.delete(choiceId);
      this.heldPhantoms.clear();
    }, this.config.lockDuration);
  }

  // ─────────────────────────────────────────────────────────────
  // 겹침 회피 계산
  // ─────────────────────────────────────────────────────────────
  calculateAvoidance(phantomList) {
    const sorted = [...phantomList].sort((a, b) => b.impact - a.impact);
    
    return sorted.map((phantom, index) => {
      const radialOffset = index === 0 ? 0 : 
                          index === 1 ? this.config.radialSeparation * 20 :
                          -this.config.radialSeparation * 20;
      
      const phaseOffset = index === 0 ? 0 :
                         index === 1 ? this.config.phaseOffset :
                         -this.config.phaseOffset;
      
      return {
        ...phantom,
        radialOffset,
        phaseOffset,
        priority: index + 1
      };
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 물리→시각 매핑
  // ─────────────────────────────────────────────────────────────
  mapPhysicsToVisual(phantom, affectedPlanet) {
    const choice = phantom.choice;
    const delta = affectedPlanet.delta;
    
    // 1) 반경 안정성 (Recovery)
    const recDelta = choice.delta?.recovery?.h24 || 0;
    const radiusStability = recDelta > 0 ? 1.0 : 0.85 + Math.random() * 0.15;
    
    // 2) 색 등급 (Risk)
    const riskDelta = choice.delta?.risk?.h24 || 0;
    let colorClass;
    if (riskDelta < -0.15) colorClass = 'stable';      // 녹
    else if (riskDelta < -0.05) colorClass = 'unstable'; // 황
    else colorClass = 'critical';                        // 적
    
    // 3) 두께/광도 (Confidence)
    const confidence = choice.confidence || 0.5;
    const thickness = 1 + confidence * 3;
    const glow = confidence * 0.8;
    
    // 4) 편심 (Friction)
    const friDelta = Math.abs(choice.delta?.friction?.h24 || 0);
    const eccentricity = friDelta * 0.3;
    
    // 5) 결손 (Shock)
    const shkDelta = Math.abs(choice.delta?.shock?.h24 || 0);
    const gaps = shkDelta > 0.15 ? Math.floor(shkDelta * 10) : 0;
    
    // 6) 노이즈 (Entropy - 외부에서 가져옴)
    const entropy = this.getEntropy();
    const noise = entropy * 0.5;
    
    // 7) 압력 변위
    const pressure = this.getPressure();
    const pressureOffset = pressure * 5;

    return {
      radiusStability,
      colorClass,
      thickness,
      glow,
      eccentricity,
      gaps,
      noise,
      pressureOffset
    };
  }

  getEntropy() {
    // PhysicsFrame에서 가져오기
    if (typeof PhysicsFrame !== 'undefined' && PhysicsFrame.snapshot) {
      return PhysicsFrame.snapshot.entropy || 0.5;
    }
    const el = document.querySelector('[data-metric="entropy"], #m-entropy');
    return el ? parseFloat(el.textContent) : 0.5;
  }

  getPressure() {
    if (typeof PhysicsFrame !== 'undefined' && PhysicsFrame.snapshot) {
      return PhysicsFrame.snapshot.pressure || 0.5;
    }
    const el = document.querySelector('[data-metric="pressure"], #m-pressure');
    return el ? parseFloat(el.textContent) : 0.5;
  }

  // ─────────────────────────────────────────────────────────────
  // 색상 결정
  // ─────────────────────────────────────────────────────────────
  getColor(colorClass, opacity = 1) {
    const colors = {
      stable: `rgba(34, 197, 94, ${opacity})`,    // 녹
      unstable: `rgba(234, 179, 8, ${opacity})`,  // 황
      critical: `rgba(239, 68, 68, ${opacity})`   // 적
    };
    
    // Gate 연동
    if (this.gate === 'AMBER' && colorClass === 'stable') {
      return `rgba(234, 179, 8, ${opacity * 0.7})`; // 황 계열로 톤다운
    }
    
    return colors[colorClass] || colors.unstable;
  }

  // ─────────────────────────────────────────────────────────────
  // 렌더링 메인 루프
  // ─────────────────────────────────────────────────────────────
  render() {
    // 캔버스 클리어
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const phantomList = this.calculateAvoidance([...this.phantoms.values()]);
    
    phantomList.forEach(phantom => {
      this.renderPhantom(phantom);
    });
  }

  renderPhantom(phantom) {
    const ctx = this.ctx;
    
    // 상태별 opacity
    let baseOpacity;
    switch (phantom.state) {
      case 'entering':
        baseOpacity = Math.min(1, (Date.now() - phantom.timestamp) / this.config.hoverDelay);
        if (baseOpacity >= 1) phantom.state = 'visible';
        break;
      case 'visible':
      case 'held':
        baseOpacity = phantom.state === 'held' ? 1 : 0.8;
        break;
      case 'locking':
        const lockProgress = (Date.now() - phantom.timestamp) / this.config.lockDuration;
        baseOpacity = 1 - lockProgress;
        break;
      case 'exiting':
        baseOpacity = 0.3;
        break;
      default:
        baseOpacity = 0.8;
    }

    // 영향받는 각 행성에 Phantom 링 그리기
    phantom.affectedPlanets.forEach((affected, planetIndex) => {
      const planet = this.planets[affected.planet];
      if (!planet) return;

      const visual = this.mapPhysicsToVisual(phantom, affected);
      
      // 우선순위에 따른 시각 조정
      const priorityMod = 1 - (phantom.priority - 1) * 0.15;
      
      // 3개 타임스케일 링 그리기
      ['h1', 'h24', 'd7'].forEach((timeframe, tfIndex) => {
        this.renderOrbitRing(
          planet,
          affected,
          visual,
          timeframe,
          baseOpacity * priorityMod,
          phantom
        );
      });
    });
  }

  renderOrbitRing(planet, affected, visual, timeframe, opacity, phantom) {
    const ctx = this.ctx;
    const timeOffset = this.config.timeOffsets[timeframe];
    
    // 행성 중심 좌표
    const planetX = this.center.x + Math.cos(planet.angle * Math.PI / 180) * planet.radius;
    const planetY = this.center.y + Math.sin(planet.angle * Math.PI / 180) * planet.radius;
    
    // Phantom 링 반경 (행성 중심에서)
    const baseRadius = 25 + timeOffset + (phantom.radialOffset || 0);
    const radius = baseRadius * visual.radiusStability;
    
    // 위상 오프셋
    const phaseRad = (phantom.phaseOffset || 0) * Math.PI / 180;
    
    ctx.save();
    ctx.translate(planetX, planetY);
    ctx.rotate(phaseRad);
    
    // 색상
    const color = this.getColor(visual.colorClass, opacity * 0.7);
    
    // 두께
    const thickness = visual.thickness * (timeframe === 'd7' ? 0.5 : 1);
    
    // 노이즈 적용
    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    
    // 글로우 효과
    if (visual.glow > 0.3) {
      ctx.shadowColor = color;
      ctx.shadowBlur = visual.glow * 15;
    }
    
    // 편심 타원
    const a = radius;
    const b = radius * (1 - visual.eccentricity);
    
    // 결손(gaps) 처리
    if (visual.gaps > 0 && timeframe === 'd7') {
      this.renderGappedEllipse(ctx, a, b, visual.gaps);
    } else if (timeframe === 'd7') {
      // +7d는 점선
      ctx.setLineDash([8, 4]);
      this.renderEllipse(ctx, a, b);
      ctx.setLineDash([]);
    } else {
      this.renderEllipse(ctx, a, b);
    }
    
    // 노이즈 오버레이
    if (visual.noise > 0.2) {
      this.renderNoise(ctx, a, b, visual.noise, opacity);
    }
    
    // LOCKING 상태면 수렴 애니메이션
    if (phantom.state === 'locking') {
      this.renderConvergence(ctx, radius, opacity);
    }
    
    ctx.restore();
  }

  renderEllipse(ctx, a, b) {
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderGappedEllipse(ctx, a, b, gapCount) {
    const segmentAngle = (Math.PI * 2) / (gapCount * 2);
    
    for (let i = 0; i < gapCount * 2; i += 2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, i * segmentAngle, (i + 1) * segmentAngle);
      ctx.stroke();
    }
  }

  renderNoise(ctx, a, b, intensity, opacity) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * intensity * 0.3})`;
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const noiseOffset = (Math.random() - 0.5) * intensity * 10;
      const x = (a + noiseOffset) * Math.cos(angle);
      const y = (b + noiseOffset) * Math.sin(angle);
      
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  renderConvergence(ctx, radius, opacity) {
    // NOW 궤도로 수렴하는 효과
    const convergeFactor = 1 - opacity; // opacity 감소하면서 수렴
    const targetRadius = radius * 0.3;
    const currentRadius = radius - (radius - targetRadius) * convergeFactor;
    
    ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─────────────────────────────────────────────────────────────
  // 애니메이션 루프
  // ─────────────────────────────────────────────────────────────
  startAnimation() {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 전체 클리어
  // ─────────────────────────────────────────────────────────────
  clearAll() {
    this.phantoms.clear();
    this.heldPhantoms.clear();
  }
}

window.PhantomOrbitEngine = PhantomOrbitEngine;
