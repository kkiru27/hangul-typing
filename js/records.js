// 단계별 기록과 고구마 보상. 이 아이패드(브라우저)에만 저장된다.
// 저장이 막힌 환경(사생활 보호 모드 등)에서도 앱은 그대로 돌아가야 해서 모든 저장은 try로 감싼다.

const KEY = 'hangul-typing:records:v1';

// 정확도 → 고구마 개수
export const GOGUMA_RULE = [[0.95, 3], [0.85, 2], [0.7, 1]];
export const GOGUMA_MAX = 3;

export function gogumaFor(acc) {
  if (acc == null) return 0;
  for (const [min, n] of GOGUMA_RULE) if (acc >= min) return n;
  return 0;
}

// 타자 검정: 타수와 정확도 둘 다 넘어야 한다 (둘 중 낮은 쪽). 타수 기준은 초보 눈높이로 잡은 값
export const TEST_CPM_RULE = [[100, 3], [60, 2], [30, 1]];
export function gogumaForTest(acc, cpm) {
  let bySpeed = 0;
  for (const [min, n] of TEST_CPM_RULE) if ((cpm ?? 0) >= min) { bySpeed = n; break; }
  return Math.min(bySpeed, gogumaFor(acc));
}

export function loadRecords() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || '{}');
    return r && typeof r === 'object' ? r : {};
  } catch {
    return {};
  }
}

// 한 단계를 끝냈을 때 기록을 고치고, 화면에 보여 줄 소식을 돌려준다.
// cpm: 타수(1분에 맞게 친 키 수). 낱말·문장 단계만 넘긴다.
export function saveStageResult(records, stageId, acc, cpm = null, goguma = gogumaFor(acc)) {
  const prev = records[stageId] || { best: null, goguma: 0, plays: 0 };
  records[stageId] = {
    best: prev.best == null ? acc : Math.max(prev.best, acc ?? 0),
    goguma: Math.max(prev.goguma, goguma),
    plays: prev.plays + 1,
    lastAt: Date.now(),
    ...(cpm != null || prev.bestCpm != null ? { bestCpm: Math.max(prev.bestCpm ?? 0, cpm ?? 0) } : {}),
  };
  try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 저장 못 해도 진행 */ }
  return {
    goguma,
    newBest: prev.best != null && acc != null && acc > prev.best,
    firstClear: prev.goguma === 0 && goguma > 0,
    newBestCpm: cpm != null && prev.bestCpm != null && cpm > prev.bestCpm,
    bestCpm: records[stageId].bestCpm ?? null,
  };
}

// 모든 단계는 처음부터 열려 있다 (자기 수준에 맞는 단계를 골라서 시작).
// 단계 지도에서 골라 둘 단계: 가장 최근에 끝낸 단계. 그 단계에서 고구마를 받은 적이 있으면 다음 단계. 처음이면 1단계
export function suggestStage(stages, records) {
  let last = -1;
  let at = 0;
  stages.forEach((s, i) => {
    const t = records[s.id]?.lastAt ?? 0;
    if (t > at) { last = i; at = t; }
  });
  if (last < 0) return 0;
  return (records[stages[last].id].goguma ?? 0) > 0 ? Math.min(last + 1, stages.length - 1) : last;
}

// 게임(고구마 비)에 떨어뜨릴 낱말 단계: 끝내 본 단계 중 가장 뒤 단계까지의 낱말 단계.
// 아직 앞쪽만 해 봤으면 첫 낱말 단계만 (처음 온 사람에게 안 배운 자리의 낱말이 떨어지지 않게)
export function gameWordStages(stages, records) {
  const reach = Math.max(-1, ...stages.map((s, i) => (s.type !== 'game' && records[s.id]?.plays ? i : -1)));
  const all = stages.filter((s) => s.type === 'words');
  const upTo = all.filter((s) => stages.indexOf(s) <= reach);
  return upTo.length ? upTo : all.slice(0, 1);
}

export function totalGoguma(stages, records) {
  return stages.reduce((sum, s) => sum + (records[s.id]?.goguma ?? 0), 0);
}
