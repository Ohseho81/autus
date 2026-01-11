// Web Worker: 모션 트렌드 계산(예: 단순 이동 평균/회귀 자리)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
self.onmessage = (e: MessageEvent) => {
  const { motions, windowSize = 5 } = e.data;
  if (!Array.isArray(motions)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    self.postMessage({ error: "motions must be array" });
    return;
  }
  const values = motions.map((m: any) => m.value ?? m.delta ?? 0);
  const trends: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    trends.push(avg);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  self.postMessage({ trends });
};

