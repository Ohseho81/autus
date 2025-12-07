# LimePass Mobile App Specification

## Overview
- **Platform**: React Native (iOS + Android)
- **Target**: Filipino students applying for Korea programs
- **Core Feature**: 12-step LimePass Flow

## Tech Stack
```
React Native 0.72+
TypeScript
Redux Toolkit (state)
React Navigation 6
Axios (API)
AsyncStorage (local)
Firebase (push notifications)
```

## Screen Structure

### 1. Onboarding
- Splash Screen (logo animation)
- Welcome Carousel (3 slides)
- Language Select (EN/PH/KR)

### 2. Auth
- Phone Login (OTP)
- Profile Setup

### 3. LimePass Flow (12 screens)
```
/flow/welcome
/flow/identity
/flow/academic
/flow/language
/flow/finance
/flow/health
/flow/intent
/flow/documents
/flow/score
/flow/visa
/flow/employment
/flow/roadmap
```

### 4. Dashboard
- Status Card (current step)
- Score Display
- Document Checklist
- Timeline

### 5. Profile
- Personal Info
- Documents
- Settings

## API Integration
```typescript
// api/limepass.ts
const API_BASE = 'https://api.autus-ai.com/api/v1';

export const submitStep = async (step: string, data: any) => {
  return axios.post(`${API_BASE}/flow/submit`, { step, data });
};

export const getScore = async (studentId: string) => {
  return axios.get(`${API_BASE}/arl/score/calculate?state_id=${studentId}`);
};

export const getFlow = async () => {
  return axios.get(`${API_BASE}/flow/limepass`);
};
```

## State Management
```typescript
// store/flowSlice.ts
interface FlowState {
  currentStep: number;
  completedSteps: string[];
  formData: Record<string, any>;
  score: number | null;
}
```

## Push Notifications
- Document reminder
- Deadline alerts
- Status updates
- Interview scheduled

## Offline Support
- Cache form data locally
- Sync when online
- Document upload queue

## UI Components

### ProgressBar
```tsx
<ProgressBar current={5} total={12} />
```

### StepCard
```tsx
<StepCard
  title="Academic Background"
  subtitle="GPA and Major"
  status="completed" | "current" | "pending"
/>
```

### ScoreDisplay
```tsx
<ScoreDisplay score={78} label="Eligibility Score" />
```

## File Structure
```
src/
  components/
    common/
    flow/
    dashboard/
  screens/
    auth/
    flow/
    dashboard/
    profile/
  api/
  store/
  utils/
  navigation/
  assets/
```

## Build Commands
```bash
# Development
npx react-native start
npx react-native run-ios
npx react-native run-android

# Production
cd ios && fastlane release
cd android && ./gradlew assembleRelease
```
