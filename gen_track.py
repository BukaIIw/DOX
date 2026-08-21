import math, wave, struct, random

SR = 22050
def midi(n): return 440.0 * (2.0 ** ((n - 69) / 12.0))

def render(path, seconds=18):
    n = int(SR * seconds)
    buf = [0.0] * n

    def add(off, func, amp):
        # func(local_t) -> sample in [-1,1]
        start = int(off * SR)
        for i in range(max(0, start), min(n, start + int(2 * SR))):
            t = (i - start) / SR
            buf[i] += amp * func(t)

    beat = 60.0 / 140.0
    bars = int(seconds / (beat * 4)) + 1
    # bass progression (MIDI roots per bar): A1, A1, F1, G1
    roots = [33, 33, 29, 31]
    # minor pentatonic lead offsets
    pent = [0, 3, 5, 7, 10, 12]

    for bar in range(bars):
        root = roots[bar % len(roots)]
        for b in range(4):
            tb = (bar * 4 + b) * beat
            # kick on 1 and 3
            if b % 2 == 0:
                add(tb, lambda t: math.sin(2 * math.pi * 55 * t) * math.exp(-t * 16) if t < 0.3 else 0, 0.95)
            # snare/clap on 2 and 4
            if b == 1 or b == 3:
                add(tb, lambda t: ((random.random() - 0.5) * 2) * math.exp(-t * 26) if t < 0.25 else 0, 0.5)
            # hats on every half-beat
            for h in (0.0, 0.5):
                add(tb + h * beat, lambda t: ((random.random() - 0.5) * 2) * math.exp(-t * 55) if t < 0.08 else 0, 0.18)
            # bass note (root, one octave down)
            bf = midi(root - 12)
            add(tb, lambda t, f=bf: math.sin(2 * math.pi * f * t) * math.exp(-t * 3.0) if t < beat * 0.95 else 0, 0.5)
            # lead arpeggio on offbeats
            note = root + pent[(bar * 4 + b) % len(pent)] + 12
            lf = midi(note)
            add(tb + 0.5 * beat, lambda t, f=lf: math.sin(2 * math.pi * f * t) * (1 - min(1, t / 0.35)) if t < 0.4 else 0, 0.22)

    # normalize
    peak = max(1e-6, max(abs(x) for x in buf))
    buf = [x / peak * 0.9 for x in buf]

    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(max(-1, min(1, x)) * 32767)) for x in buf)
        w.writeframes(frames)
    print("wrote", path, n, "samples")

render("my_track.wav")
