import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { 
    ignores: [
      'dist', 
      'node_modules', 
      '*.config.js',
      // Legacy 컴포넌트 (점진적 수정 예정)
      'src/components/Galaxy/**',
      'src/components/Trinity/**',
      'src/components/AUTUSAppV3/**',
      'src/components/Dashboard/**',
      'src/components/_legacy/**',
      'src/components/Hexagon/**',
      'src/components/LaplacianSimulator.tsx',
      'src/components/Visualization/**',
      'src/components/CommandCenter/**',
      'src/components/Cube/**',
      'src/components/DataInputDashboard.tsx',
      'src/components/Edge/**',
      'src/components/LearningLoopDemo.tsx',
      'src/components/Map/**',
      'src/components/Matrix72/**',
      'src/components/Ontology/**',
      'src/components/Prediction/**',
      'src/components/PressureMap/**',
      'src/components/Process/**',
      'src/components/Quantum/**',
      'src/engine/**',
      'src/stores/**',
      'src/core/altitudeEngine.ts',
      'src/core/decision/**',
      'src/hooks/useResponsive.ts',
      'src/AutusApp.tsx',
      'src/components/views/v2/hooks/**',
      'src/hooks/useAcademyData.ts',
      'src/hooks/useKIv2.ts',
      'src/lib/responsive.ts',
      'src/api/views.ts',
    ] 
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // React hooks 규칙 완화 (점진적 수정 예정)
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'no-case-declarations': 'warn',
    },
  },
);
