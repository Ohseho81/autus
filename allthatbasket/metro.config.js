/**
 * Metro config: React Native에서 axios가 Node 빌드 대신 브라우저 빌드를 쓰도록 강제.
 * (Node 빌드는 'crypto' 등 미지원 모듈을 참조해 iOS 빌드가 실패함)
 */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // axios → 브라우저용 빌드로 고정 (crypto 미사용)
  if (moduleName === 'axios' || moduleName.startsWith('axios/')) {
    const browserPath = path.join(
      context.projectRoot,
      'node_modules',
      'axios',
      'dist',
      'browser',
      'axios.cjs'
    );
    return { type: 'sourceFile', filePath: browserPath };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
