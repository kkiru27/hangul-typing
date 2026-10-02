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

// 낱말·문장을 마지막으로 친 때 (덜 본 것 먼저 내려고). 기록과 따로 저장, 너무 많아지면 오래된 것부터 버린다
const SEEN_KEY = 'hangul-typing:seen:v1';
export const SEEN_MAX = 800;

export function loadSeen() {
  try {
    const s = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    return s && typeof s === 'object' ? s : {};
  } catch {
    return {};
  }
}

export function markSeen(seen, text, now = Date.now()) {
  seen[text] = now;
  const keys = Object.keys(seen);
  if (keys.length > SEEN_MAX) {
    keys.sort((a, b) => seen[a] - seen[b]);
    for (const k of keys.slice(0, keys.length - SEEN_MAX * 0.75)) delete seen[k];
  }
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* 저장 못 해도 진행 */ }
}

// ───── 게임: 레벨마다 기록 (id = 게임id:레벨) ─────
export const levelId = (game, n) => `${game.id}:${n}`;
const levelGoguma = (game, n, records) => records[levelId(game, n)]?.goguma ?? 0;

export function gameGoguma(game, records) {
  return game.levels.reduce((sum, _, i) => sum + levelGoguma(game, i + 1, records), 0);
}

export function gamesMax(games) {
  return games.reduce((sum, g) => sum + g.levels.length * GOGUMA_MAX, 0);
}

// 레벨 1은 늘 열림. 레벨 n은 레벨 n-1에서 고구마를 받았거나 이미 고구마를 받은 적이 있으면 열림
export function isLevelOpen(game, n, records) {
  return n === 1 || levelGoguma(game, n - 1, records) > 0 || levelGoguma(game, n, records) > 0;
}

// 게임: 모은 고구마(연습+게임)가 unlock개 이상이면 열림
export function isGameOpen(game, total) {
  return total >= (game.unlock ?? 0);
}

// 게임을 고르면 골라 둘 레벨: 열린 레벨 중 고구마를 다 못 모은 첫 레벨, 다 모았으면 열린 마지막 레벨
export function suggestLevel(game, records) {
  const open = game.levels.map((_, i) => i + 1).filter((n) => isLevelOpen(game, n, records));
  return open.find((n) => levelGoguma(game, n, records) < GOGUMA_MAX) ?? open.at(-1);
}

export function totalGoguma(stages, records) {
  return stages.reduce((sum, s) => sum + (records[s.id]?.goguma ?? 0), 0);
}
