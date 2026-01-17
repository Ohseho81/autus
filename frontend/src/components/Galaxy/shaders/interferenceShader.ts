// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Interference Shader (I-지수 기반 지직거림 효과)
// ═══════════════════════════════════════════════════════════════════════════════
//
// I-지수가 낮은(갈등) 연결선에 적용되는 에너지 간섭 효과
// - 지직거리는 레이저 효과
// - 색상 변조 (마젠타-시안)
// - 강도에 따른 Bloom 반응
//
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// 기본 Interference Shader (갈등 연결선)
// ═══════════════════════════════════════════════════════════════════════════════

export const interferenceShader = {
  uniforms: {
    uTime: { value: 0 },
    uIntensity: { value: 0.5 },       // I-지수 기반 강도 (0: 안정, 1: 최대 갈등)
    uColor1: { value: new THREE.Color('#00f5ff') },  // 시안
    uColor2: { value: new THREE.Color('#ff00ff') },  // 마젠타
    uNoiseScale: { value: 100.0 },
    uGlitchSpeed: { value: 10.0 },
    uOpacity: { value: 0.8 },
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uNoiseScale;
    uniform float uGlitchSpeed;
    uniform float uOpacity;
    
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // 노이즈 함수
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      return mix(a, b, u.x) +
             (c - a) * u.y * (1.0 - u.x) +
             (d - b) * u.x * u.y;
    }
    
    void main() {
      // 기본 라인 형태
      float lineWidth = 0.1;
      float line = smoothstep(0.5 - lineWidth, 0.5, vUv.x) - 
                   smoothstep(0.5, 0.5 + lineWidth, vUv.x);
      
      // 강도에 따른 노이즈 추가
      float noiseVal = noise(vec2(vUv.y * uNoiseScale, uTime * uGlitchSpeed));
      float glitch = sin(vUv.y * uNoiseScale + uTime * uGlitchSpeed) * 0.1 * uIntensity;
      
      // 글리치 라인 변형
      float glitchLine = smoothstep(0.5 - lineWidth + glitch, 0.5 + glitch, vUv.x) - 
                         smoothstep(0.5 + glitch, 0.5 + lineWidth + glitch, vUv.x);
      
      // 고강도 갈등 시 추가 노이즈 레이어
      float extraGlitch = 0.0;
      if (uIntensity > 0.5) {
        float highFreqNoise = noise(vec2(vUv.y * 200.0, uTime * 20.0));
        extraGlitch = step(0.7, highFreqNoise) * (uIntensity - 0.5) * 2.0;
      }
      
      // 최종 라인 알파
      float finalLine = max(glitchLine, extraGlitch);
      
      // 색상 혼합 (시간에 따라 변조)
      float colorMix = sin(uTime * 2.0 + vUv.y * 10.0) * 0.5 + 0.5;
      colorMix = mix(colorMix, noiseVal, uIntensity * 0.5);
      vec3 color = mix(uColor1, uColor2, colorMix);
      
      // Bloom을 위한 강도 증폭
      float bloomMultiplier = 3.0 + uIntensity * 7.0;
      color *= bloomMultiplier;
      
      // 에너지 펄스 효과
      float pulse = sin(vUv.y * 20.0 - uTime * 5.0) * 0.5 + 0.5;
      pulse = pow(pulse, 2.0) * uIntensity;
      color += color * pulse;
      
      gl_FragColor = vec4(color, finalLine * uOpacity);
    }
  `,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 에너지 흐름 Shader (정상 연결선)
// ═══════════════════════════════════════════════════════════════════════════════

export const energyFlowShader = {
  uniforms: {
    uTime: { value: 0 },
    uStrength: { value: 0.5 },        // 연결 강도
    uColor: { value: new THREE.Color('#4488ff') },
    uFlowSpeed: { value: 3.0 },
    uOpacity: { value: 0.4 },
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying float vProgress;
    attribute float lineProgress;
    
    void main() {
      vUv = uv;
      vProgress = lineProgress;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float uTime;
    uniform float uStrength;
    uniform vec3 uColor;
    uniform float uFlowSpeed;
    uniform float uOpacity;
    
    varying vec2 vUv;
    varying float vProgress;
    
    void main() {
      // 에너지 흐름 파동
      float flow = sin(vProgress * 20.0 - uTime * uFlowSpeed) * 0.5 + 0.5;
      flow = pow(flow, 2.0);
      
      // 중심이 밝은 라인
      float lineWidth = 0.1;
      float line = 1.0 - abs(vUv.x - 0.5) * 2.0;
      line = smoothstep(0.0, lineWidth, line);
      
      // 강도에 따른 밝기
      float brightness = 0.3 + flow * 0.7;
      brightness *= (0.5 + uStrength * 0.5);
      
      // 색상
      vec3 color = uColor * brightness * 3.0; // Bloom용 증폭
      
      // 알파
      float alpha = line * uOpacity * (0.5 + flow * 0.5);
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 노드 글로우 Shader
// ═══════════════════════════════════════════════════════════════════════════════

export const nodeGlowShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#FFD700') },
    uIntensity: { value: 1.0 },
    uPulseSpeed: { value: 2.0 },
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uPulseSpeed;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      // Fresnel 효과 (가장자리가 밝음)
      vec3 viewDir = vec3(0.0, 0.0, 1.0);
      float fresnel = 1.0 - abs(dot(vNormal, viewDir));
      fresnel = pow(fresnel, 2.0);
      
      // 펄스
      float pulse = sin(uTime * uPulseSpeed) * 0.3 + 0.7;
      
      // 최종 색상
      vec3 color = uColor * (1.0 + fresnel * 2.0) * uIntensity * pulse;
      color *= 5.0; // Bloom용 증폭
      
      float alpha = fresnel * 0.8 + 0.2;
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 셰이더 머티리얼 생성 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

export function createInterferenceMaterial(intensity: number = 0.5): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...interferenceShader.uniforms,
      uIntensity: { value: intensity },
    },
    vertexShader: interferenceShader.vertexShader,
    fragmentShader: interferenceShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export function createEnergyFlowMaterial(strength: number = 0.5, color?: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...energyFlowShader.uniforms,
      uStrength: { value: strength },
      ...(color && { uColor: { value: color } }),
    },
    vertexShader: energyFlowShader.vertexShader,
    fragmentShader: energyFlowShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createNodeGlowMaterial(color: THREE.Color, intensity: number = 1.0): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...nodeGlowShader.uniforms,
      uColor: { value: color },
      uIntensity: { value: intensity },
    },
    vertexShader: nodeGlowShader.vertexShader,
    fragmentShader: nodeGlowShader.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 셰이더 애니메이션 업데이터
// ═══════════════════════════════════════════════════════════════════════════════

export function updateShaderTime(material: THREE.ShaderMaterial, time: number): void {
  if (material.uniforms?.uTime) {
    material.uniforms.uTime.value = time;
  }
}

export function updateInterferenceIntensity(
  material: THREE.ShaderMaterial, 
  iIndex: number
): void {
  if (material.uniforms?.uIntensity) {
    // I가 음수일수록 강도 증가
    const intensity = Math.max(0, Math.min(1, -iIndex));
    material.uniforms.uIntensity.value = intensity;
  }
}
