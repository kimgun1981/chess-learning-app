let audioContext = null;

export function playGameSound(enabled, type = 'move') {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencies = { move:360, capture:520, check:680, warning:820, end:240 };
    oscillator.frequency.value = frequencies[type] ?? frequencies.move;
    gain.gain.setValueAtTime(0.05, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + 0.1);
  } catch { /* Audio is an optional enhancement. */ }
}

export function vibrate(pattern = 25) {
  try { globalThis.navigator?.vibrate?.(pattern); } catch { /* vibration is optional */ }
}
