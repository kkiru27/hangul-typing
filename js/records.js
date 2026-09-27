// 단계별 기록과 고구마 보상. 이 아이패드(브라우저)에만 저장된다.
// 저장이 막힌 환경(사생활 보호 모드 등)에서도 앱은 그대로 돌아가야 해서 모든 저장은 try로 감싼다.

const KEY = 'hangul-typing:records:v1';

// 정확도 → 고구마 개수 (1개 이상이면 다음 단계가 열린다)
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

// 1단계는 늘 열려 있고, 나머지는 앞 단계에서 고구마를 1개라도 받으면 열린다.
// 앞 단계가 게임처럼 optional이면 건너뛰고 그 앞 단계를 본다 (게임을 안 해도 진행 가능).
// 이미 고구마를 받은 단계도 열려 있다 (단계 순서를 바꿔도 깬 단계가 다시 잠기지 않게).
export function isUnlocked(stages, records, i, all = false) {
  const cleared = (id) => (records[id]?.goguma ?? 0) > 0;
  if (all || i === 0 || cleared(stages[i]?.id)) return true;
  let j = i - 1;
  while (j > 0 && stages[j].optional) j--;
  return cleared(stages[j]?.id);
}

export function totalGoguma(stages, records) {
  return stages.reduce((sum, s) => sum + (records[s.id]?.goguma ?? 0), 0);
}
