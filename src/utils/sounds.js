// Synthesized sound effects using Web Audio API — no audio files needed.
// Each function creates a short, snappy sound programmatically.

let audioCtx = null;

function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

// Short rising chime — played on successful pose match
export function playScore() {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(523, ctx.currentTime);       // C5
        osc.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.1); // G5
        osc.frequency.linearRampToValueAtTime(1047, ctx.currentTime + 0.2); // C6

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* audio not available */ }
}

// Escalating arpeggio — played on streak ≥ 3
export function playStreak() {
    try {
        const ctx = getCtx();
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    } catch (e) { /* audio not available */ }
}

// Soft tick — played every second when timer ≤ 5
export function playTick() {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    } catch (e) { /* audio not available */ }
}

// Short descending tone — played on timeout/skip
export function playTimeout() {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* audio not available */ }
}

// Fanfare — played on game over
export function playGameOver() {
    try {
        const ctx = getCtx();
        const notes = [523, 659, 784, 1047, 784, 1047]; // C E G C G C
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = i < 4 ? "sine" : "triangle";
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.12;
            const dur = i === notes.length - 1 ? 0.5 : 0.18;
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
            osc.start(t);
            osc.stop(t + dur);
        });
    } catch (e) { /* audio not available */ }
}
