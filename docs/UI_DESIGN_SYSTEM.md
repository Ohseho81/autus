# 🎨 AUTUS UI Design System
> Liquid Glass + Neo-Tactile 기반 디자인 시스템

---

## 🎯 디자인 철학

### 핵심 스타일
| 요소 | Light Mode | Dark Mode |
|------|-----------|-----------|
| **기본** | Glassmorphism | Neumorphism + Glass |
| **배경** | 반투명 흰색 | 깊은 다크 블루 |
| **강조** | 민트/청록 그라데이션 | 네온 시안 글로우 |
| **표면** | 유리 블러 효과 | 소프트 엘리베이션 |

---

## 🎨 컬러 시스템

### Primary Colors (액션/강조)
```css
:root {
  /* Primary - Mint/Cyan Gradient */
  --primary-start: #00D4AA;
  --primary-end: #00B4D8;
  --primary-gradient: linear-gradient(135deg, var(--primary-start), var(--primary-end));
  
  /* Accent - Blue */
  --accent-blue: #0066FF;
  --accent-light: #00AAFF;
  
  /* Neon Glow (Dark Mode) */
  --neon-cyan: #00F5FF;
  --neon-glow: 0 0 20px rgba(0, 245, 255, 0.5);
}
```

### Background Colors
```css
:root {
  /* Light Mode */
  --bg-light: #F5F7FA;
  --bg-glass-light: rgba(255, 255, 255, 0.7);
  --bg-surface-light: rgba(255, 255, 255, 0.5);
  
  /* Dark Mode */
  --bg-dark: #0A0E1A;
  --bg-dark-secondary: #121828;
  --bg-glass-dark: rgba(20, 30, 50, 0.8);
  --bg-surface-dark: rgba(30, 40, 60, 0.6);
}
```

### Text Colors
```css
:root {
  /* Light Mode */
  --text-primary-light: #1A1A2E;
  --text-secondary-light: #6B7280;
  --text-muted-light: #9CA3AF;
  
  /* Dark Mode */
  --text-primary-dark: #FFFFFF;
  --text-secondary-dark: #A0AEC0;
  --text-muted-dark: #718096;
}
```

### Status Colors
```css
:root {
  --success: #00D4AA;
  --warning: #FFB800;
  --error: #FF4757;
  --info: #00B4D8;
}
```

---

## 📐 컴포넌트 스타일

### 1. Primary Button
```css
.btn-primary {
  background: var(--primary-gradient);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(0, 212, 170, 0.3);
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 212, 170, 0.4);
}

/* Dark Mode - Neon Glow */
.dark .btn-primary {
  box-shadow: var(--neon-glow);
}
```

### 2. Secondary Button
```css
.btn-secondary {
  background: var(--bg-glass-light);
  backdrop-filter: blur(10px);
  color: var(--primary-start);
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid rgba(0, 212, 170, 0.3);
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(0, 212, 170, 0.1);
  border-color: var(--primary-start);
}
```

### 3. Icon Button
```css
.btn-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-glass-light);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}
```

### 4. Glass Card
```css
.glass-card {
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
.dark .glass-card {
  background: var(--bg-glass-dark);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### 5. Text Field / Input
```css
.input-field {
  background: var(--bg-surface-light);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 14px 16px;
  color: var(--text-primary-light);
  font-size: 14px;
  transition: all 0.3s ease;
}

.input-field:focus {
  border-color: var(--primary-start);
  box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.1);
  outline: none;
}

.input-field::placeholder {
  color: var(--text-muted-light);
}

/* Dark Mode */
.dark .input-field {
  background: var(--bg-surface-dark);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary-dark);
}
```

### 6. Search Field with Dropdown
```css
.search-container {
  position: relative;
}

.search-field {
  background: var(--bg-glass-light);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 16px 12px 44px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted-light);
}

.search-results {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.search-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.2s ease;
}

.search-item:hover {
  background: rgba(0, 212, 170, 0.1);
}
```

### 7. Select / Dropdown
```css
.select-container {
  position: relative;
}

.select-trigger {
  background: var(--bg-glass-light);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 12px 40px 12px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
}

.select-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.select-option:hover {
  background: rgba(0, 212, 170, 0.1);
}

.select-option.selected {
  background: rgba(0, 212, 170, 0.15);
  color: var(--primary-start);
}
```

### 8. Checkbox
```css
.checkbox-container {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  background: var(--bg-surface-light);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox.checked {
  background: var(--primary-gradient);
  border-color: transparent;
}

.checkbox.checked::after {
  content: '✓';
  color: white;
  font-size: 12px;
  font-weight: bold;
}
```

### 9. Switch / Toggle
```css
.switch {
  width: 52px;
  height: 28px;
  border-radius: 14px;
  background: #E2E8F0;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.switch.active {
  background: var(--primary-gradient);
}

.switch-handle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.switch.active .switch-handle {
  left: 26px;
}

/* Dark Mode - Neon Glow */
.dark .switch.active {
  box-shadow: var(--neon-glow);
}
```

### 10. Tabs
```css
.tabs-container {
  display: flex;
  background: var(--bg-glass-light);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.tab {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  color: var(--text-secondary-light);
  transition: all 0.3s ease;
  cursor: pointer;
}

.tab.active {
  background: white;
  color: var(--text-primary-light);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Dark Mode */
.dark .tab.active {
  background: var(--accent-blue);
  color: white;
}
```

### 11. Modal
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 32px;
  min-width: 320px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.modal-description {
  color: var(--text-secondary-light);
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
```

### 12. Toast / Notification
```css
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  border-radius: 12px;
  padding: 14px 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-icon.success {
  background: var(--success);
  color: white;
}

.toast-close {
  margin-left: auto;
  opacity: 0.5;
  cursor: pointer;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### 13. Slider / Range
```css
.slider-container {
  position: relative;
  padding: 10px 0;
}

.slider-track {
  height: 6px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
  position: relative;
}

.slider-fill {
  position: absolute;
  height: 100%;
  background: var(--primary-gradient);
  border-radius: 3px;
}

.slider-handle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 3px solid var(--primary-start);
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Dark Mode */
.dark .slider-track {
  background: rgba(255, 255, 255, 0.1);
}

.dark .slider-handle {
  box-shadow: var(--neon-glow);
}
```

### 14. Circular Control (Dark Mode)
```css
.circular-control {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-surface-dark);
  border: 3px solid var(--neon-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    var(--neon-glow),
    inset 0 0 20px rgba(0, 245, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.circular-control:hover {
  transform: scale(1.05);
  box-shadow: 
    0 0 30px rgba(0, 245, 255, 0.6),
    inset 0 0 30px rgba(0, 245, 255, 0.2);
}

.circular-control-icon {
  font-size: 24px;
  color: var(--neon-cyan);
}
```

### 15. User Card
```css
.user-card {
  background: var(--bg-glass-light);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.user-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 12px;
  border: 2px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 12px;
}

.btn-follow {
  background: var(--text-primary-light);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}
```

---

## 🌙 다크 모드 전환

### CSS Variables 전환
```css
/* Light Mode (Default) */
:root {
  --bg-base: var(--bg-light);
  --bg-glass: var(--bg-glass-light);
  --bg-surface: var(--bg-surface-light);
  --text-primary: var(--text-primary-light);
  --text-secondary: var(--text-secondary-light);
}

/* Dark Mode */
.dark,
[data-theme="dark"] {
  --bg-base: var(--bg-dark);
  --bg-glass: var(--bg-glass-dark);
  --bg-surface: var(--bg-surface-dark);
  --text-primary: var(--text-primary-dark);
  --text-secondary: var(--text-secondary-dark);
}
```

---

## ✨ 마이크로인터랙션

### Hover State
```css
.interactive {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive:hover {
  transform: translateY(-2px);
}
```

### Active State
```css
.interactive:active {
  transform: scale(0.98);
}
```

### Loading Animation
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### Glow Pulse (Dark Mode)
```css
@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 245, 255, 0.8);
  }
}

.dark .glow-element {
  animation: glowPulse 2s ease-in-out infinite;
}
```

---

## 📱 반응형 브레이크포인트

```css
/* Mobile First */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

## 🔤 타이포그래피

```css
:root {
  --font-family: 'Inter', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* Font Sizes */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  
  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

## 📐 간격 시스템

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

## 🔘 Border Radius

```css
:root {
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
  --radius-full: 9999px;
}
```

---

## 💫 그림자 시스템

```css
:root {
  /* Light Mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  /* Dark Mode Glow */
  --glow-cyan: 0 0 20px rgba(0, 245, 255, 0.5);
  --glow-primary: 0 0 20px rgba(0, 212, 170, 0.5);
}
```

---

## 🎯 AUTUS 적용 예시

### Solar HQ 페이지
- 배경: Dark Mode (--bg-dark)
- 3D Globe: Neon Cyan 글로우
- 패널: Glass Card (Dark)
- 버튼: Primary/Secondary
- 링: Circular Control 스타일

### Dashboard
- 배경: Light/Dark 전환 가능
- 카드: Glass Card
- 차트: Primary 색상 그라데이션
- 탭: Tabs 컴포넌트

### Command Panel
- 입력: Search Field + Dropdown
- 버튼: Primary Button
- 결과: Toast/Notification

---

*Last Updated: 2026-01-18*
*Reference: 4K Liquid UI Kit + Neo-Tactile UI Kit*
