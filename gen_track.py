#!/usr/bin/env python3
"""
DOX MUSIC — Track Generator
Generates procedural WAV tracks across 6 mood presets with random mode.

Presets:
  - phonk      : dark, slow (60 BPM), distorted bass, minor key
  - jumpstyle  : fast (140 BPM), 4/4 kick, major-ish pentatonic
  - lofi       : chilled (75 BPM), mellow chords, soft drums
  - ambient    : beatless, evolving pads, slow arpeggios
  - rave       : fast (160 BPM), driving bass, aggressive lead
  - darktrap   : 70 BPM, 808s, triplet hats, eerie melody

Usage:
  python gen_track.py                    # random preset, output: my_track.wav
  python gen_track.py phonk out.wav 22   # specific preset, custom duration
  python gen_track.py all                # generate one of each preset
"""

import math
import wave
import struct
import random
import sys
import os
from typing import Callable, List

SR = 22050


def midi(n: float) -> float:
    """MIDI note number -> frequency in Hz."""
    return 440.0 * (2.0 ** ((n - 69) / 12.0))


# Scales
PENTATONIC_MINOR = [0, 3, 5, 7, 10, 12]
PENTATONIC_MAJOR = [0, 2, 4, 7, 9, 12]
NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10, 12]
DORIAN = [0, 2, 3, 5, 7, 9, 10, 12]

# Chord progressions (MIDI root offsets per bar, semitone shifts)
PROGRESSIONS = {
    "i_VI_III_VII": [0, -3, -5, -7],   # Am - F - C - G (relative to root)
    "i_IV_VI_V":    [0, 5, -3, -2],   # Am - Dm - F - G
    "i_VII_VI_VII": [0, -2, -3, -2],  # Am - G - F - G (lofi staple)
    "i_III_VII_i":  [0, 3, -2, 0],    # Am - C - G - Am
}


def envelope(attack: float, decay: float, sustain: float, release: float):
    """Return ADSR closure. Sustain level is 0..1."""
    def env(t: float, dur: float) -> float:
        if t < attack:
            return t / max(1e-9, attack)
        if t < attack + decay:
            d = (t - attack) / max(1e-9, decay)
            return 1.0 - (1.0 - sustain) * d
        if t < dur - release:
            return sustain
        if t < dur:
            r = (dur - t) / max(1e-9, release)
            return sustain * r
        return 0.0
    return env


def osc_sin(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def osc_saw(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 2.0 * phase - 1.0


def osc_square(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 1.0 if phase < 0.5 else -1.0


def osc_tri(freq: float, t: float) -> float:
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0


def noise(t: float) -> float:
    return random.random() * 2.0 - 1.0


def render(
    path: str,
    preset: str = "phonk",
    seconds: int = 18,
    bpm: float = None,
    root_note: int = None,
    seed: int = None,
):
    """Render a track to WAV file."""
    if seed is not None:
        random.seed(seed)

    cfg = PRESETS[preset]
    if bpm is None:
        bpm = cfg["bpm"] + random.uniform(-4, 4)
    if root_note is None:
        root_note = random.choice(cfg["roots"])

    beat = 60.0 / bpm
    n_samples = int(SR * seconds)
    buf: List[float] = [0.0] * n_samples

    def add(off: float, func: Callable[[float], float], amp: float, dur: float = 2.0):
        start = int(off * SR)
        end = min(n_samples, start + int(dur * SR))
        for i in range(max(0, start), end):
            t = (i - start) / SR
            buf[i] += amp * func(t)

    scale = cfg["scale"]
    prog_name = random.choice(cfg["progressions"])
    prog = PROGRESSIONS[prog_name]
    bars = int(seconds / (beat * 4)) + 1
    swing = cfg.get("swing", 0.0)  # 0..0.2 typical

    # ---- helper instruments per preset
    def kick(t: float, base_freq: float = 55.0) -> float:
        if t < 0.001:
            return 1.0
        env = math.exp(-t * (cfg.get("kick_decay", 16)))
        pitch_drop = base_freq * (1.0 - 0.4 * min(1, t / 0.05))
        return math.sin(2 * math.pi * pitch_drop * t) * env

    def snare(t: float) -> float:
        env = math.exp(-t * 26)
        return (noise(t) * 0.7 + osc_tri(220, t) * 0.3) * env if t < 0.25 else 0.0

    def hat(t: float, decay: float = 55.0) -> float:
        env = math.exp(-t * decay)
        return noise(t) * env if t < 0.08 else 0.0

    def bass(t: float, freq: float, dur: float) -> float:
        if t >= dur:
            return 0.0
        env_amp = math.exp(-t * cfg.get("bass_decay", 3.0))
        # Add a soft saturation for phonk/darktrap
        base = osc_sin(freq, t) * 0.7 + osc_tri(freq, t) * 0.3
        if cfg.get("bass_saturate", False):
            base = math.tanh(base * 1.8)
        return base * env_amp

    def lead(t: float, freq: float, dur: float) -> float:
        if t >= dur:
            return 0.0
        env = (1.0 - min(1.0, t / 0.05)) * math.exp(-t * 1.5)
        wave_shape = cfg.get("lead_wave", osc_sin)
        return wave_shape(freq, t) * env * 0.7

    def pad(t: float, freq: float, dur: float) -> float:
        env_attack = min(1.0, t / 0.4)
        env_release = min(1.0, (dur - t) / 0.6) if t > dur - 0.6 else 1.0
        env = env_attack * max(0, env_release)
        # Slight detune for richness
        return (osc_sin(freq, t) * 0.6 + osc_sin(freq * 1.005, t) * 0.4) * env

    # ---- per-bar composition
    for bar in range(bars):
        root = root_note + prog[bar % len(prog)]
        # Drums
        for b in range(4):
            tb = (bar * 4 + b) * beat
            # Apply swing on offbeats
            if b % 2 == 1:
                tb += swing * beat
            if cfg.get("kick_pattern") == "four_floor":
                add(tb, kick, 0.95, 0.5)  # every beat
            elif cfg.get("kick_pattern") == "trap":
                if b == 0 or (bar % 2 == 0 and b == 2) or (random.random() < 0.3):
                    add(tb, kick, 0.95, 0.5)
            elif cfg.get("kick_pattern") == "phonk":
                if b == 0 or b == 2 or (b == 3 and random.random() < 0.5):
                    add(tb, kick, 0.95, 0.5)
            else:  # default every other
                if b % 2 == 0:
                    add(tb, kick, 0.95, 0.5)

            # Snare
            if cfg.get("snare_on_2_4", True) and (b == 1 or b == 3):
                add(tb, snare, 0.5, 0.3)

            # Hats
            hat_pattern = cfg.get("hat_pattern", "half")
            if hat_pattern == "half":
                for h in (0.0, 0.5):
                    add(tb + h * beat, hat, 0.18, 0.1)
            elif hat_pattern == "quarter":
                for h in (0.0, 0.25, 0.5, 0.75):
                    add(tb + h * beat, hat, 0.14, 0.08)
            elif hat_pattern == "triplet":
                for h in (0.0, 1 / 3, 2 / 3, 1.0):
                    add(tb + h * beat, hat, 0.15, 0.07)
            elif hat_pattern == "none":
                pass

            # Bass
            bf = midi(root - 12)
            if cfg.get("bass", True):
                add(tb, lambda t, f=bf, d=beat * 0.95: bass(t, f, d),
                    cfg.get("bass_amp", 0.5), beat * 1.0)

            # Lead arpeggio
            if cfg.get("lead", True):
                note = root + scale[(bar * 4 + b) % len(scale)] + 12
                lf = midi(note)
                lead_dur = beat * 0.45
                add(tb + 0.5 * beat, lambda t, f=lf, d=lead_dur: lead(t, f, d),
                    cfg.get("lead_amp", 0.22), lead_dur)

        # Pad/ambience (only some bars)
        if cfg.get("pad", False) and (bar % 2 == 0):
            chord_notes = [root, root + scale[2], root + scale[4]]
            for cn in chord_notes:
                pf = midi(cn)
                add(bar * beat * 4, lambda t, f=pf, d=beat * 4: pad(t, f, d),
                    cfg.get("pad_amp", 0.12), beat * 4)

    # ---- normalize
    peak = max(1e-6, max(abs(x) for x in buf))
    target_peak = 0.9
    buf = [x / peak * target_peak for x in buf]

    # ---- soft limiter to prevent clipping
    buf = [max(-1.0, min(1.0, math.tanh(x * 1.1))) for x in buf]

    # ---- write WAV
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(
            struct.pack("<h", int(x * 32767)) for x in buf
        )
        w.writeframes(frames)
    print(f"[gen] wrote {path} | preset={preset} bpm={bpm:.1f} root={root_note} "
          f"bars={bars} samples={n_samples}")


# ============================================================================
# PRESET DEFINITIONS
# ============================================================================
PRESETS = {
    "phonk": {
        "bpm": 65,
        "roots": [33, 31, 36, 34],   # A1, G1, C2, A#1
        "scale": PENTATONIC_MINOR,
        "progressions": ["i_VI_III_VII", "i_IV_VI_V"],
        "kick_pattern": "phonk",
        "snare_on_2_4": True,
        "hat_pattern": "half",
        "bass": True,
        "bass_amp": 0.65,
        "bass_decay": 3.5,
        "bass_saturate": True,
        "lead": True,
        "lead_amp": 0.18,
        "lead_wave": osc_sin,
        "pad": False,
        "kick_decay": 16,
    },
    "jumpstyle": {
        "bpm": 140,
        "roots": [33, 33, 29, 31],
        "scale": PENTATONIC_MINOR,
        "progressions": ["i_VI_III_VII", "i_VII_VI_VII"],
        "kick_pattern": "four_floor",
        "snare_on_2_4": True,
        "hat_pattern": "quarter",
        "bass": True,
        "bass_amp": 0.5,
        "bass_decay": 3.0,
        "bass_saturate": False,
        "lead": True,
        "lead_amp": 0.25,
        "lead_wave": osc_square,
        "pad": False,
        "kick_decay": 14,
    },
    "lofi": {
        "bpm": 75,
        "roots": [57, 60, 55, 53],   # A3, C4, G3, F3
        "scale": DORIAN,
        "progressions": ["i_VII_VI_VII", "i_IV_VI_V"],
        "kick_pattern": "trap",
        "snare_on_2_4": True,
        "hat_pattern": "half",
        "swing": 0.12,
        "bass": True,
        "bass_amp": 0.4,
        "bass_decay": 4.0,
        "bass_saturate": False,
        "lead": False,
        "pad": True,
        "pad_amp": 0.18,
        "kick_decay": 20,
    },
    "ambient": {
        "bpm": 60,
        "roots": [60, 65, 67, 62],
        "scale": NATURAL_MINOR,
        "progressions": ["i_VI_III_VII", "i_III_VII_i"],
        "kick_pattern": "none",
        "snare_on_2_4": False,
        "hat_pattern": "none",
        "bass": False,
        "lead": True,
        "lead_amp": 0.18,
        "lead_wave": osc_sin,
        "pad": True,
        "pad_amp": 0.28,
    },
    "rave": {
        "bpm": 160,
        "roots": [33, 35, 30, 32],
        "scale": PENTATONIC_MINOR,
        "progressions": ["i_VI_III_VII", "i_VII_VI_VII"],
        "kick_pattern": "four_floor",
        "snare_on_2_4": True,
        "hat_pattern": "quarter",
        "bass": True,
        "bass_amp": 0.55,
        "bass_decay": 2.2,
        "bass_saturate": True,
        "lead": True,
        "lead_amp": 0.28,
        "lead_wave": osc_saw,
        "pad": False,
        "kick_decay": 12,
    },
    "darktrap": {
        "bpm": 70,
        "roots": [33, 31, 36, 28],
        "scale": PENTATONIC_MINOR,
        "progressions": ["i_VI_III_VII", "i_III_VII_i"],
        "kick_pattern": "trap",
        "snare_on_2_4": True,
        "hat_pattern": "triplet",
        "bass": True,
        "bass_amp": 0.7,
        "bass_decay": 4.5,
        "bass_saturate": True,
        "lead": True,
        "lead_amp": 0.16,
        "lead_wave": osc_tri,
        "pad": True,
        "pad_amp": 0.1,
        "kick_decay": 18,
    },
}


# Mood tags for the player
MOOD_TAGS = {
    "phonk":    {"mood": "dark",    "energy": 5, "color": "#9b59b6"},
    "jumpstyle":{"mood": "energetic", "energy": 8, "color": "#e67e22"},
    "lofi":     {"mood": "chill",   "energy": 3, "color": "#3498db"},
    "ambient":  {"mood": "calm",    "energy": 1, "color": "#1abc9c"},
    "rave":     {"mood": "energetic", "energy": 9, "color": "#e74c3c"},
    "darktrap": {"mood": "dark",    "energy": 6, "color": "#8e44ad"},
}


def main():
    args = sys.argv[1:]
    if not args:
        # Random preset
        preset = random.choice(list(PRESETS.keys()))
        out = "my_track.wav"
        render(out, preset, seconds=18, seed=random.randint(0, 1_000_000))
        print(f"[gen] random preset: {preset}")
        return

    if args[0] == "all":
        for name in PRESETS:
            out = f"track_{name}.wav"
            render(out, name, seconds=18, seed=42)
        return

    preset = args[0]
    if preset not in PRESETS:
        print(f"Unknown preset: {preset}")
        print(f"Available: {', '.join(PRESETS.keys())} or 'all'")
        sys.exit(1)

    out = args[1] if len(args) > 1 else f"track_{preset}.wav"
    secs = int(args[2]) if len(args) > 2 else 18
    render(out, preset, seconds=secs)


if __name__ == "__main__":
    main()
