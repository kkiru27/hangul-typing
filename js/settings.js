// 앱 설정 (소리, 키보드 배열). 기록(records.js)과 따로 저장해서 기록을 지워도 설정은 남는다.
// 저장이 막힌 환경에서도 앱은 그대로 돌아가야 해서 모든 저장은 try로 감싼다.

const KEY = 'hangul-typing:settings:v1';
const DEFAULTS = { sound: true, layout: 'tkl' };

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...(s && typeof s === 'object' ? s : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* 저장 못 해도 진행 */ }
}
