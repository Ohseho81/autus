/**
 * 🎨 영상 효과 템플릿
 *
 * FFmpeg 필터 기반 - 무료 + 빠름
 * 모든 효과 조합 가능
 */

// ============================================
// 기본 효과
// ============================================
export const BASIC_EFFECTS = {

  // 페이드 인
  fadeIn: (duration = 0.5) =>
    `fade=t=in:st=0:d=${duration}`,

  // 페이드 아웃
  fadeOut: (duration = 0.5) =>
    `fade=t=out:st=end:d=${duration}`,

  // 크로스페이드
  crossfade: (duration = 1) =>
    `xfade=transition=fade:duration=${duration}`,
};

// ============================================
// 속도 효과
// ============================================
export const SPEED_EFFECTS = {

  // 슬로우모션 0.5x
  slowmo50: `setpts=2.0*PTS`,

  // 슬로우모션 0.25x (매우 느림)
  slowmo25: `setpts=4.0*PTS`,

  // 스피드업 1.5x
  speed150: `setpts=0.67*PTS`,

  // 스피드업 2x
  speed200: `setpts=0.5*PTS`,

  // 스피드 램핑 (동적 속도)
  speedRamp: `setpts='if(between(T,2,4),2*PTS,PTS)'`,
};

// ============================================
// 줌/팬 효과
// ============================================
export const ZOOM_EFFECTS = {

  // 줌 인 1.2x
  zoomIn: `scale=iw*1.2:ih*1.2,crop=iw/1.2:ih/1.2`,

  // 줌 인 1.5x
  zoomInBig: `scale=iw*1.5:ih*1.5,crop=iw/1.5:ih/1.5`,

  // Ken Burns (천천히 줌)
  kenBurns: (duration = 5) =>
    `zoompan=z='min(zoom+0.0015,1.5)':d=${duration * 25}:s=1920x1080`,

  // 팬 좌→우
  panLeftRight: `crop=iw/1.2:ih:x='(iw-ow)/2*sin(t)':y=0`,
};

// ============================================
// 컬러 효과
// ============================================
export const COLOR_EFFECTS = {

  // 시네마틱 (영화 느낌)
  cinematic: `eq=contrast=1.1:brightness=0.02:saturation=1.15,colorbalance=rs=0.1:gs=0:bs=0.1`,

  // 스포츠 (선명)
  sports: `eq=contrast=1.2:brightness=0.05:saturation=1.3,unsharp=5:5:1.5`,

  // 따뜻한 톤
  warm: `colortemperature=temperature=6500,eq=saturation=1.1`,

  // 시원한 톤
  cool: `colortemperature=temperature=8000,eq=saturation=1.1`,

  // 흑백
  blackWhite: `hue=s=0`,

  // 비네팅 (가장자리 어둡게)
  vignette: `vignette=PI/4`,

  // LUT 적용 (컬러 그레이딩)
  applyLut: (lutPath) => `lut3d=${lutPath}`,
};

// ============================================
// 텍스트/자막 효과
// ============================================
export const TEXT_EFFECTS = {

  // 이름 자막 (하단 중앙)
  nameBottom: (name) =>
    `drawtext=text='${name}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h-100:box=1:boxcolor=black@0.6:boxborderw=15:font=NanumGothicBold`,

  // 이름 자막 (상단 좌측)
  nameTopLeft: (name) =>
    `drawtext=text='${name}':fontsize=40:fontcolor=white:x=40:y=40:box=1:boxcolor=black@0.5:boxborderw=10`,

  // 날짜 (상단 우측)
  dateTopRight: (date) =>
    `drawtext=text='${date}':fontsize=28:fontcolor=white:x=w-text_w-30:y=30`,

  // 타이틀 (중앙, 페이드)
  titleCenter: (title, startTime = 0, duration = 3) =>
    `drawtext=text='${title}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${startTime},${startTime + duration})':alpha='if(lt(t-${startTime},0.5),(t-${startTime})*2,if(gt(t-${startTime},${duration - 0.5}),2*(${startTime + duration}-t),1))'`,

  // 워터마크
  watermark: (text = '올댓바스켓') =>
    `drawtext=text='${text}':fontsize=24:fontcolor=white@0.5:x=w-text_w-20:y=h-40`,
};

// ============================================
// 트랜지션 효과
// ============================================
export const TRANSITIONS = {

  // 페이드
  fade: `xfade=transition=fade:duration=1`,

  // 와이프 (좌→우)
  wipeRight: `xfade=transition=wiperight:duration=0.5`,

  // 와이프 (상→하)
  wipeDown: `xfade=transition=wipedown:duration=0.5`,

  // 줌 인 트랜지션
  zoomIn: `xfade=transition=zoomin:duration=0.5`,

  // 슬라이드
  slideLeft: `xfade=transition=slideleft:duration=0.5`,

  // 원형
  circleOpen: `xfade=transition=circleopen:duration=0.5`,

  // 디졸브
  dissolve: `xfade=transition=dissolve:duration=1`,
};

// ============================================
// 프리셋 조합
// ============================================
export const PRESETS = {

  // 기본 훈련 영상
  training: {
    video: [
      COLOR_EFFECTS.sports,
      TEXT_EFFECTS.watermark(),
    ],
    audio: null,
  },

  // 하이라이트
  highlight: {
    video: [
      COLOR_EFFECTS.cinematic,
      SPEED_EFFECTS.slowmo50,
      ZOOM_EFFECTS.zoomIn,
    ],
    audio: 'epic',
  },

  // 분기 요약
  quarterly: {
    intro: {
      duration: 3,
      effects: [BASIC_EFFECTS.fadeIn(1)],
    },
    main: {
      effects: [COLOR_EFFECTS.cinematic],
    },
    outro: {
      duration: 3,
      effects: [BASIC_EFFECTS.fadeOut(1)],
    },
  },

  // 성장 비교 (Before/After)
  comparison: {
    layout: 'splitScreen', // 화면 분할
    effects: [COLOR_EFFECTS.sports],
    labels: ['Before', 'After'],
  },
};

// ============================================
// FFmpeg 명령어 생성 헬퍼
// ============================================
export function buildFFmpegFilter(effects) {
  if (!effects || effects.length === 0) return 'null';
  return effects.join(',');
}

export function buildComplexFilter(config) {
  const filters = [];

  // 비디오 필터
  if (config.video) {
    filters.push(`[0:v]${buildFFmpegFilter(config.video)}[v]`);
  }

  // 오디오 필터
  if (config.audio) {
    filters.push(`[0:a]${config.audio}[a]`);
  }

  return filters.join(';');
}

// ============================================
// 음악 프리셋
// ============================================
export const MUSIC_PRESETS = {
  upbeat: {
    bpm: 120,
    mood: 'energetic',
    file: 'music/upbeat.mp3',
  },
  epic: {
    bpm: 90,
    mood: 'dramatic',
    file: 'music/epic.mp3',
  },
  emotional: {
    bpm: 70,
    mood: 'inspiring',
    file: 'music/emotional.mp3',
  },
  inspiring: {
    bpm: 100,
    mood: 'positive',
    file: 'music/inspiring.mp3',
  },
};

export default {
  BASIC_EFFECTS,
  SPEED_EFFECTS,
  ZOOM_EFFECTS,
  COLOR_EFFECTS,
  TEXT_EFFECTS,
  TRANSITIONS,
  PRESETS,
  MUSIC_PRESETS,
  buildFFmpegFilter,
  buildComplexFilter,
};
