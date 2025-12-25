/**
 * AUTUS Physics Map
 * Energy/Flow/Risk 3축 물리 지도
 * 양자 얽힘 + 터널링 효과
 */

class PhysicsMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container || typeof THREE === 'undefined') {
      console.warn('[PhysicsMap] Container or THREE.js not found');
      return;
    }
    
    this.width = this.container.offsetWidth || 300;
    this.height = this.container.offsetHeight || 300;
    
    // Three.js 설정
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(3, 3, 3);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true 
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);
    
    // 상태
    this.state = {
      energy: 0.5,
      flow: 0.5,
      risk: 0.3
    };
    
    this.particles = [];
    this.connections = [];
    
    this.createAxes();
    this.createStatePoint();
    this.createQuantumField();
    this.createConnections();
    
    // 컨트롤
    this.initControls();
    
    // 애니메이션
    this.animate();
    
    // 리사이즈
    window.addEventListener('resize', () => this.resize());
  }
  
  createAxes() {
    const axisLength = 2;
    const axes = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0x00e5cc, label: 'Energy' },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x0088ff, label: 'Flow' },
      { dir: new THREE.Vector3(0, 0, 1), color: 0xff6600, label: 'Risk' }
    ];
    
    axes.forEach(axis => {
      // 축 선
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        axis.dir.clone().multiplyScalar(axisLength)
      ]);
      const material = new THREE.LineBasicMaterial({ 
        color: axis.color,
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      
      // 축 끝 화살표
      const arrowGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
      const arrowMat = new THREE.MeshBasicMaterial({ color: axis.color });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.position.copy(axis.dir.clone().multiplyScalar(axisLength));
      arrow.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axis.dir
      );
      this.scene.add(arrow);
    });
    
    // 그리드 (XZ 평면)
    const gridHelper = new THREE.GridHelper(4, 10, 0x00e5cc, 0x003333);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.2;
    this.scene.add(gridHelper);
  }
  
  createStatePoint() {
    // 현재 상태 표시 구체
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00e5cc,
      transparent: true,
      opacity: 0.9
    });
    this.statePoint = new THREE.Mesh(geometry, material);
    this.updateStatePosition();
    this.scene.add(this.statePoint);
    
    // 글로우 효과
    const glowGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x00e5cc,
      transparent: true,
      opacity: 0.3
    });
    this.stateGlow = new THREE.Mesh(glowGeo, glowMat);
    this.statePoint.add(this.stateGlow);
    
    // 궤적 라인
    this.trajectoryPoints = [];
    this.trajectoryGeo = new THREE.BufferGeometry();
    this.trajectoryMat = new THREE.LineBasicMaterial({ 
      color: 0x00e5cc,
      transparent: true,
      opacity: 0.4
    });
    this.trajectory = new THREE.Line(this.trajectoryGeo, this.trajectoryMat);
    this.scene.add(this.trajectory);
  }
  
  createQuantumField() {
    // 양자 얽힘 파티클
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02
      });
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00e5cc,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    this.quantumParticles = new THREE.Points(geometry, material);
    this.particleVelocities = velocities;
    this.scene.add(this.quantumParticles);
  }
  
  createConnections() {
    // 양자 얽힘 연결선
    const lineCount = 20;
    
    for (let i = 0; i < lineCount; i++) {
      const points = [
        new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ),
        new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        )
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00e5cc,
        transparent: true,
        opacity: 0.1 + Math.random() * 0.2
      });
      
      const line = new THREE.Line(geometry, material);
      line.userData = {
        oscillation: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
      };
      
      this.connections.push(line);
      this.scene.add(line);
    }
  }
  
  updateStatePosition() {
    if (this.statePoint) {
      this.statePoint.position.set(
        this.state.energy * 2,
        this.state.flow * 2,
        this.state.risk * 2
      );
      
      // 궤적 업데이트
      this.trajectoryPoints.push(this.statePoint.position.clone());
      if (this.trajectoryPoints.length > 50) {
        this.trajectoryPoints.shift();
      }
      this.trajectoryGeo.setFromPoints(this.trajectoryPoints);
    }
  }
  
  setState(energy, flow, risk) {
    this.state = { 
      energy: Math.max(0, Math.min(1, energy)),
      flow: Math.max(0, Math.min(1, flow)),
      risk: Math.max(0, Math.min(1, risk))
    };
    this.updateStatePosition();
    
    // Risk에 따른 색상 변경
    const color = risk > 0.7 ? 0xff3333 : risk > 0.4 ? 0xff9900 : 0x00e5cc;
    this.statePoint.material.color.setHex(color);
  }
  
  tunnelEffect(from, to) {
    // 터널링 애니메이션
    const curve = new THREE.QuadraticBezierCurve3(
      from,
      new THREE.Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + 1, (from.z + to.z) / 2),
      to
    );
    
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8
    });
    
    const tunnelLine = new THREE.Line(geometry, material);
    this.scene.add(tunnelLine);
    
    // 파동 애니메이션
    let progress = 0;
    const animateTunnel = () => {
      progress += 0.05;
      material.opacity = Math.sin(progress * Math.PI) * 0.8;
      
      if (progress < 1) {
        requestAnimationFrame(animateTunnel);
      } else {
        this.scene.remove(tunnelLine);
        geometry.dispose();
        material.dispose();
      }
    };
    animateTunnel();
  }
  
  initControls() {
    // 마우스/터치 회전
    let isDragging = false;
    let prevX = 0, prevY = 0;
    
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    });
    
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - prevX;
      const deltaY = e.clientY - prevY;
      
      this.scene.rotation.y += deltaX * 0.01;
      this.scene.rotation.x += deltaY * 0.01;
      
      prevX = e.clientX;
      prevY = e.clientY;
    });
    
    this.renderer.domElement.addEventListener('mouseup', () => {
      isDragging = false;
    });
    
    // 터치 지원
    this.renderer.domElement.addEventListener('touchstart', (e) => {
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    });
    
    this.renderer.domElement.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const deltaX = e.touches[0].clientX - prevX;
      const deltaY = e.touches[0].clientY - prevY;
      
      this.scene.rotation.y += deltaX * 0.01;
      this.scene.rotation.x += deltaY * 0.01;
      
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    });
    
    this.renderer.domElement.addEventListener('touchend', () => {
      isDragging = false;
    });
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // 파티클 움직임
    if (this.quantumParticles) {
      const positions = this.quantumParticles.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const vel = this.particleVelocities[i];
        positions[i * 3] += vel.x;
        positions[i * 3 + 1] += vel.y;
        positions[i * 3 + 2] += vel.z;
        
        // 경계 반사
        ['x', 'y', 'z'].forEach((axis, j) => {
          if (Math.abs(positions[i * 3 + j]) > 2) {
            vel[axis] *= -1;
          }
        });
      }
      
      this.quantumParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    // 연결선 진동
    this.connections.forEach(conn => {
      conn.userData.oscillation += conn.userData.speed;
      conn.material.opacity = 0.1 + Math.sin(conn.userData.oscillation) * 0.15;
    });
    
    // 상태 글로우 펄스
    if (this.stateGlow) {
      this.stateGlow.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
    }
    
    // 자동 회전 (느리게)
    this.scene.rotation.y += 0.001;
    
    this.renderer.render(this.scene, this.camera);
  }
  
  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
  
  // 외부 연동
  connectToPhysics() {
    if (window.autusBridge) {
      window.autusBridge.on('physics_update', (data) => {
        const energy = (data.flow || 50) / 100;
        const flow = (100 - (data.entropy || 30)) / 100;
        const risk = (data.risk || 30) / 100;
        
        this.setState(energy, flow, risk);
      });
    }
  }
  
  dispose() {
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

// 글로벌 노출
window.PhysicsMap = PhysicsMap;
