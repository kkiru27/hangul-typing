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

export function loadRecords() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || '{}');
    return r && typeof r === 'object' ? r : {};
  } catch {
    return {};
  }
}

// 한 단계를 끝냈을 때 기록을 고치고, 화면에 보여 줄 소식을 돌려준다.
export function saveStageResult(records, stageId, acc) {
  const prev = records[stageId] || { best: null, goguma: 0, plays: 0 };
  const goguma = gogumaFor(acc);
  records[stageId] = {
    best: prev.best == null ? acc : Math.max(prev.best, acc ?? 0),
    goguma: Math.max(prev.goguma, goguma),
    plays: prev.plays + 1,
    lastAt: Date.now(),
  };
  try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 저장 못 해도 진행 */ }
  return {
    goguma,
    newBest: prev.best != null && acc != null && acc > prev.best,
    firstClear: prev.goguma === 0 && goguma > 0,
  };
}

// 1단계는 늘 열려 있고, 나머지는 앞 단계에서 고구마를 1개라도 받으면 열린다.
export function isUnlocked(stages, records, i, all = false) {
  return all || i === 0 || (records[stages[i - 1]?.id]?.goguma ?? 0) > 0;
}

export function totalGoguma(stages, records) {
  return stages.reduce((sum, s) => sum + (records[s.id]?.goguma ?? 0), 0);
}
