// 효과음: 소리 파일 없이 Web Audio로 짧게 만들어 낸다 (가볍게).
//
// 아이패드 사파리 규칙
// - AudioContext는 처음에 멈춰 있고, 사용자 동작(keydown·pointerdown·touchend) 안에서 바로 resume()해야 풀린다
//   → unlock()을 그 이벤트들에서 동기로 부른다.
// - 무음 모드면 Web Audio가 꺼진다 → navigator.audioSession.type = 'playback' (iOS 17+, 없으면 그냥 넘어감).

if ('audioSession' in navigator) {
  try { navigator.audioSession.type = 'playback'; } catch { /* 지원 안 하면 그대로 */ }
}

const AC = globalThis.AudioContext || globalThis.webkitAudioContext;

// 음 하나: [시작(초), 주파수(Hz), 길이(초), 음색, 크기, 끝 주파수(미끄러지는 소리)]
const NOTE = (at, freq, dur, type = 'triangle', vol = 0.18, to = null) => ({ at, freq, dur, type, vol, to });
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568;

const SOUNDS = {
  key: [NOTE(0, 880, 0.05, 'triangle', 0.08)],                                   // 맞게 친 키: 톡
  miss: [NOTE(0, 240, 0.12, 'square', 0.07, 170), NOTE(0.13, 170, 0.16, 'square', 0.07, 120)], // 틀림: 뿌뿡
  word: [NOTE(0, C6, 0.08), NOTE(0.07, E6, 0.12)],                               // 낱말·문장 끝: 띵동
  round: [NOTE(0, C5, 0.1), NOTE(0.09, E5, 0.1), NOTE(0.18, G5, 0.1), NOTE(0.27, C6, 0.25)], // 판 끝
  fanfare: [NOTE(0, G5, 0.1), NOTE(0.1, C6, 0.1), NOTE(0.2, E6, 0.1), NOTE(0.3, G6, 0.35)],  // 고구마 받음
  cheer: [NOTE(0, E5, 0.12), NOTE(0.12, C5, 0.25)],                              // 고구마 못 받음: 괜찮아
  catch: [NOTE(0, 420, 0.12, 'sine', 0.22, 980)],                                 // 게임: 냠 (뿅)
  drop: [NOTE(0, 520, 0.3, 'triangle', 0.14, 180)],                               // 게임: 놓침 (휘잉)
  warn: [NOTE(0, 988, 0.1, 'square', 0.06), NOTE(0.14, 988, 0.1, 'square', 0.06)], // 경고: 삐삐
  move: [NOTE(0, 660, 0.04, 'sine', 0.08)],                                       // 고르기: 틱
  select: [NOTE(0, E5, 0.06, 'sine', 0.14), NOTE(0.06, C6, 0.1, 'sine', 0.14)],  // 시작: 또잉
  pause: [NOTE(0, G5, 0.08, 'sine', 0.12), NOTE(0.08, C5, 0.12, 'sine', 0.12)],
};

export class Sound {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.ctx = null;
  }

  // 사용자 동작 이벤트 안에서 동기로 불러야 한다
  unlock() {
    if (!AC) return;
    try {
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state !== 'running') this.ctx.resume();
      if (!this.unlocked) {
        // 예전 iOS: 아주 짧은 빈 소리를 한 번 내야 풀린다
        const buf = this.ctx.createBuffer(1, 1, 22050);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.ctx.destination);
        src.start(0);
        this.unlocked = true;
      }
    } catch { /* 소리가 안 돼도 앱은 그대로 */ }
  }

  play(name) {
    const notes = SOUNDS[name];
    const ctx = this.ctx;
    if (!this.enabled || !notes || !ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + 0.01;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, t0 + n.at);
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, t0 + n.at + n.dur);
      // 딸깍 소리가 나지 않게 아주 짧게 커졌다가 줄어든다
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(n.vol, t0 + n.at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
    document.body.dataset.lastSound = name; // 확인용 (마지막으로 낸 소리)
  }
}

export const SOUND_NAMES = Object.keys(SOUNDS);
