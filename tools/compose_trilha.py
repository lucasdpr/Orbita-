"""Uso: python3 tools/compose_trilha.py saida.wav  (requer numpy; depois codifique com ffmpeg -c:a libmp3lame -b:a 128k)

Trilha original "Órbita" — ambiente espacial gerado por código (sem amostras de terceiros).
Renderização circular: tudo que passa do fim volta para o começo, então o loop emenda sem corte."""
import numpy as np, wave, sys

SR = 44100
BPM = 72
BEAT = 60 / BPM                 # 0,833 s
BAR = 4 * BEAT                  # 3,333 s
BARS = 32                       # 4 ciclos de 8 compassos
N = int(round(BARS * BAR * SR))
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)            # seco
RL = np.zeros(N); RR = np.zeros(N)          # envio para reverb

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def add(sig, t0, pan=0.0, gain=1.0, rev=0.0):
    """Soma sinal mono em t0 (s) com pan [-1,1], dando a volta no fim do buffer."""
    s = int(round(t0 * SR)) % N
    idx = (np.arange(len(sig)) + s) % N
    gl = np.cos((pan + 1) * np.pi / 4) * gain; gr = np.sin((pan + 1) * np.pi / 4) * gain
    np.add.at(L, idx, sig * gl); np.add.at(R, idx, sig * gr)
    if rev:
        np.add.at(RL, idx, sig * gl * rev); np.add.at(RR, idx, sig * gr * rev)

def env_adsr(n, a, d, s, r_start, r):
    t = np.arange(n) / SR
    e = np.where(t < a, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1)), 1.0)
    e = np.where(t >= a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-3)), e)
    rel = np.clip((t - r_start) / r, 0, 1)
    return e * (0.5 + 0.5 * np.cos(np.pi * rel)) * (t < r_start + r)

# ---------- harmonia ----------
CHORDS = [  # (baixo, notas do pad)
    (45, [57, 60, 64, 67, 71]),   # Am9
    (41, [53, 57, 60, 64, 67]),   # Fmaj9
    (48, [55, 59, 60, 62, 64]),   # Cmaj9
    (43, [55, 59, 62, 64, 69]),   # G6/9
]
CH_DUR = 2 * BAR

def pad_voice(m, dur, bright):
    n = int((dur + 2.6) * SR); t = np.arange(n) / SR
    y = np.zeros(n)
    for det in (-0.07, 0.0, 0.07):                     # três osciladores desafinados (coro)
        f = mtof(m + det)
        for h in range(1, 8):
            y += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / h ** (1.9 - 0.5 * bright)
    y *= env_adsr(n, 1.6, 2.0, 0.8, dur, 2.4)
    y *= 1 + 0.12 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6.28))   # leve tremolo
    return y / 9

def bass_voice(m, dur):
    n = int((dur + 0.8) * SR); t = np.arange(n) / SR
    f = mtof(m)
    y = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
    return y * env_adsr(n, 0.25, 1.2, 0.65, dur, 0.7)

def bell(m, vel):
    n = int(2.8 * SR); t = np.arange(n) / SR; f = mtof(m)
    y = np.sin(2 * np.pi * f * t + 1.6 * np.exp(-t / 0.22) * np.sin(2 * np.pi * 2 * f * t))
    y += 0.22 * np.sin(2 * np.pi * 4.01 * f * t) * np.exp(-t / 0.35)
    return y * np.exp(-t / 0.95) * np.minimum(1, t / 0.004) * vel

def lead(m, dur):
    n = int((dur + 0.5) * SR); t = np.arange(n) / SR; f = mtof(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.3) / 0.4, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + 0.28 * np.sin(2 * ph) + 0.09 * np.sin(3 * ph)
    return y * env_adsr(n, 0.05, 0.6, 0.75, dur, 0.45)

def twinkle(m):
    n = int(3.0 * SR); t = np.arange(n) / SR; f = mtof(m)
    y = np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.1))
    return y * np.exp(-t / 1.1) * np.minimum(1, t / 0.003)

MELODY = [  # (nota, tempos) por acorde de 2 compassos = 8 tempos
    [(76, 2), (74, 1), (72, 1), (69, 2), (72, 2)],
    [(69, 1), (72, 1), (74, 2), (76, 2), (79, 2)],
    [(79, 2), (76, 1), (74, 1), (76, 2), (72, 2)],
    [(74, 2), (76, 1), (79, 1), (81, 3), (None, 1)],
]
MELODY_B = [  # variação do 4º ciclo
    [(81, 2), (79, 1), (76, 1), (74, 2), (76, 2)],
    [(72, 2), (74, 1), (76, 1), (79, 2), (76, 2)],
    [(74, 2), (72, 1), (74, 1), (76, 2), (79, 2)],
    [(76, 2), (74, 1), (72, 1), (69, 3), (None, 1)],
]

for cyc in range(4):
    for ci, (bass, notes) in enumerate(CHORDS):
        t0 = (cyc * 4 + ci) * CH_DUR
        bright = [0.2, 0.5, 0.8, 0.6][cyc]
        for k, m in enumerate(notes):
            add(pad_voice(m, CH_DUR, bright), t0, pan=(k - 2) * 0.28, gain=0.13, rev=0.55)
        add(bass_voice(bass, CH_DUR), t0, gain=[0.08, 0.12, 0.13, 0.12][cyc], rev=0.05)
        # sinos em arpejo (a partir do 2º ciclo)
        if cyc >= 1:
            order = [0, 1, 2, 3, 4, 3, 2, 1]
            for s in range(16):
                if rng.random() < (0.22 if cyc == 1 else 0.1): continue
                m = notes[order[s % 8]] + 12 + (12 if s % 8 == 4 and cyc == 3 else 0)
                vel = rng.uniform(0.45, 0.8) * (0.7 if cyc == 1 else 1.0)
                add(bell(m, vel), t0 + s * BEAT / 2, pan=np.sin(s * 0.9) * 0.6, gain=0.16, rev=0.6)
        # melodia (3º e 4º ciclos)
        if cyc >= 2:
            seq = (MELODY if cyc == 2 else MELODY_B)[ci]
            tt = t0
            for m, beats in seq:
                if m is not None:
                    add(lead(m, beats * BEAT * 0.95), tt, pan=0.08, gain=0.11 if cyc == 2 else 0.095, rev=0.45)
                tt += beats * BEAT

# brilhos de estrelas espalhados
for _ in range(70):
    m = int(rng.choice([84, 86, 88, 91, 93, 96]))
    add(twinkle(m), rng.uniform(0, N / SR), pan=rng.uniform(-0.9, 0.9), gain=rng.uniform(0.02, 0.05), rev=0.9)

# vento cósmico: ruído filtrado com volume que respira (período divide o loop -> emenda perfeita)
def band_noise(lo, hi):
    X = np.fft.rfft(rng.standard_normal(N)); f = np.fft.rfftfreq(N, 1 / SR)
    X *= np.exp(-0.5 * ((np.log(f + 1) - np.log((lo * hi) ** 0.5)) / 0.55) ** 2)
    y = np.fft.irfft(X, N); return y / np.abs(y).max()
tt = np.arange(N) / N
breathe = 0.55 + 0.45 * np.sin(2 * np.pi * 2 * tt - np.pi / 2)
L += band_noise(250, 1400) * breathe * 0.022
R += band_noise(250, 1400) * breathe * 0.022

# reverb por convolução circular (cauda de ~3,5 s) — emenda o fim com o começo
def ir(seed):
    r = np.random.default_rng(seed); n = int(3.6 * SR); t = np.arange(n) / SR
    h = r.standard_normal(n) * np.exp(-t / 0.95) * (1 - np.exp(-t / 0.012))
    h[:int(0.018 * SR)] = 0                           # pré-delay
    full = np.zeros(N); full[:n] = h; return full / np.sqrt((h ** 2).sum())
def conv(x, h): return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(h), N)
WET = 0.42
L += conv(RL, ir(11)) * WET
R += conv(RR, ir(12)) * WET

# corta subgrave (< ~45 Hz) e alivia o embolado em 120-250 Hz
fr = np.fft.rfftfreq(N, 1 / SR)
hp = 1 / (1 + (45 / np.maximum(fr, 1e-6)) ** 4)
mud = 1 - 0.35 * np.exp(-0.5 * ((np.log(np.maximum(fr, 1)) - np.log(170)) / 0.35) ** 2)
L = np.fft.irfft(np.fft.rfft(L) * hp * mud, N); R = np.fft.irfft(np.fft.rfft(R) * hp * mud, N)
# master: tira DC, satura suave e normaliza a -1 dBFS
for ch in (L, R): ch -= ch.mean()
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = np.tanh(1.6 * L / peak) / np.tanh(1.6), np.tanh(1.6 * R / peak) / np.tanh(1.6)
g = 10 ** (-1 / 20) / max(np.abs(L).max(), np.abs(R).max())
out = np.stack([L * g, R * g], axis=1)
pcm = (out * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print(f'ok: {N / SR:.1f}s, emenda: |fim-início| L={abs(out[-1,0]-out[0,0]):.4f} R={abs(out[-1,1]-out[0,1]):.4f}')
