/**
 * AvatarLipSync — drives the Welcome Guide's face (Oculus/RPM visemes + jawOpen
 * morph targets baked into welcome_guide.glb) from two kinds of narration:
 *
 *   1. Audio CLIPS (HTMLAudioElement, e.g. "Welcome Notes.mp3")
 *      The file is decoded once and analysed offline (energy + spectrum → viseme
 *      timeline). At runtime the mouth is sampled from audio.currentTime, so it
 *      stays in sync through pause / seek / replay. If the file cannot be
 *      decoded (e.g. file://), a syllable-rhythm fallback is used instead.
 *
 *   2. Browser TEXT-TO-SPEECH (SpeechSynthesisUtterance)
 *      The browser gives no audio data, so a viseme timeline is built from the
 *      text (letters → visemes) and re-synced to the real voice using the
 *      utterance's `boundary` (word) events when the voice provides them.
 *
 * Usage (see app.js):
 *   viewer.lipsync.attachClip(audioEl, resolvedUrl);
 *   viewer.lipsync.attachSpeech(utterance, text);
 *   viewer.lipsync.stopClip(audioEl) / stopSpeech() / stop();
 * The viewer calls update(dt) every frame.
 */
(function () {
    'use strict';

    const VISEMES = [
        'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
        'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
        'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'
    ];
    const V = {};
    VISEMES.forEach((name, i) => { V[name.replace('viseme_', '')] = i; });

    // Max influence per viseme (keeps the face natural, never over-stretched)
    const CAP = {
        sil: 0, PP: 0.85, FF: 0.7, TH: 0.6, DD: 0.55, kk: 0.55, CH: 0.7, SS: 0.55,
        nn: 0.5, RR: 0.55, aa: 0.85, E: 0.7, I: 0.65, O: 0.8, U: 0.75
    };
    const CAP_ARR = VISEMES.map((n) => CAP[n.replace('viseme_', '')]);

    const VOWELS = new Set([V.aa, V.E, V.I, V.O, V.U]);

    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    /* ------------------------------------------------------------------ *
     * Offline clip analysis
     * ------------------------------------------------------------------ */

    function fftInPlace(re, im) {
        const n = re.length;
        for (let i = 1, j = 0; i < n; i += 1) {
            let bit = n >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                let t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
        for (let len = 2; len <= n; len <<= 1) {
            const ang = (-2 * Math.PI) / len;
            const wr = Math.cos(ang);
            const wi = Math.sin(ang);
            for (let i = 0; i < n; i += len) {
                let cr = 1;
                let ci = 0;
                for (let k = 0; k < len / 2; k += 1) {
                    const a = i + k;
                    const b = a + len / 2;
                    const xr = re[b] * cr - im[b] * ci;
                    const xi = re[b] * ci + im[b] * cr;
                    re[b] = re[a] - xr;
                    im[b] = im[a] - xi;
                    re[a] += xr;
                    im[a] += xi;
                    const ncr = cr * wr - ci * wi;
                    ci = cr * wi + ci * wr;
                    cr = ncr;
                }
            }
        }
    }

    function decode(arrayBuffer) {
        const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!Ctx) return Promise.reject(new Error('No OfflineAudioContext'));
        const ctx = new Ctx(1, 1, 44100);
        return new Promise((resolve, reject) => {
            const maybe = ctx.decodeAudioData(arrayBuffer, resolve, reject);
            if (maybe && typeof maybe.then === 'function') maybe.then(resolve, reject);
        });
    }

    function analyseBuffer(audioBuf) {
        const sr = audioBuf.sampleRate;
        const chans = audioBuf.numberOfChannels;
        const len = audioBuf.length;
        const mono = new Float32Array(len);
        for (let c = 0; c < chans; c += 1) {
            const data = audioBuf.getChannelData(c);
            for (let i = 0; i < len; i += 1) mono[i] += data[i] / chans;
        }

        const FPS = 50;
        const hop = Math.max(1, Math.round(sr / FPS));
        const hopSec = hop / sr;
        let N = 1;
        while (N < sr * 0.021) N <<= 1; // ~21ms window
        const frames = Math.max(1, Math.floor(len / hop));
        const binHz = sr / N;
        const bin = (hz) => clamp(Math.round(hz / binHz), 1, N / 2 - 1);

        const b = {
            lowA: bin(80), lowB: bin(500),
            midB: bin(1500), hmB: bin(3000), hiB: bin(8000),
            cenA: bin(150), cenB: bin(3500)
        };

        const win = new Float32Array(N);
        for (let i = 0; i < N; i += 1) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

        const re = new Float32Array(N);
        const im = new Float32Array(N);
        const rms = new Float32Array(frames);
        const fric = new Float32Array(frames);
        const cent = new Float32Array(frames);

        for (let f = 0; f < frames; f += 1) {
            const start = f * hop + Math.round(hop / 2) - (N >> 1);
            let sumSq = 0;
            for (let i = 0; i < N; i += 1) {
                const s = start + i;
                const x = s >= 0 && s < len ? mono[s] : 0;
                sumSq += x * x;
                re[i] = x * win[i];
                im[i] = 0;
            }
            rms[f] = Math.sqrt(sumSq / N);
            fftInPlace(re, im);

            let low = 0; let mid = 0; let hm = 0; let high = 0;
            let cNum = 0; let cDen = 0;
            for (let k = b.lowA; k <= b.hiB; k += 1) {
                const mag = Math.hypot(re[k], im[k]);
                const p = mag * mag;
                if (k <= b.lowB) low += p;
                else if (k <= b.midB) mid += p;
                else if (k <= b.hmB) hm += p;
                else high += p;
                if (k >= b.cenA && k <= b.cenB) { cNum += k * binHz * mag; cDen += mag; }
            }
            const total = low + mid + hm + high + 1e-12;
            fric[f] = (hm * 0.5 + high) / total;
            cent[f] = cDen > 0 ? cNum / cDen : 0;
        }

        // Normalise loudness against the 95th percentile of voiced frames
        const sorted = Array.from(rms).sort((x, y) => x - y);
        const p95 = Math.max(sorted[Math.floor(sorted.length * 0.95)] || 0, 1e-4);
        const energy = new Float32Array(frames);
        for (let f = 0; f < frames; f += 1) {
            energy[f] = Math.pow(clamp(rms[f] / p95, 0, 1), 0.75);
        }
        // Light smoothing of the energy envelope
        const eSm = new Float32Array(frames);
        for (let f = 0; f < frames; f += 1) {
            const a = energy[Math.max(0, f - 1)];
            const c = energy[Math.min(frames - 1, f + 1)];
            eSm[f] = a * 0.25 + energy[f] * 0.5 + c * 0.25;
        }

        const SIL_THR = 0.08;
        const raw = new Uint8Array(frames);
        for (let f = 0; f < frames; f += 1) {
            const e = eSm[f];
            if (e < SIL_THR) { raw[f] = V.sil; continue; }

            // Plosive closure: sharp dip between louder neighbours
            let nb = 0; let n = 0;
            for (let d = -4; d <= 4; d += 1) {
                if (d === 0) continue;
                const idx = f + d;
                if (idx < 0 || idx >= frames) continue;
                nb += eSm[idx]; n += 1;
            }
            const avg = n ? nb / n : e;
            if (avg > 0.35 && e < avg * 0.38 && fric[f] < 0.5) { raw[f] = V.PP; continue; }

            const fr = fric[f];
            if (fr > 0.62) { raw[f] = e < 0.28 ? V.FF : V.SS; continue; }
            if (fr > 0.46) { raw[f] = V.CH; continue; }

            const c = cent[f];
            if (c < 430) raw[f] = V.U;
            else if (c < 620) raw[f] = V.O;
            else if (c < 980) raw[f] = V.aa;
            else if (c < 1350) raw[f] = V.E;
            else raw[f] = V.I;
        }

        // Debounce: a class must persist ≥3 frames (60ms) or the previous one is held
        const vis = new Uint8Array(frames);
        let cur = V.sil;
        let cand = V.sil;
        let run = 0;
        for (let f = 0; f < frames; f += 1) {
            const r = raw[f];
            if (r === cur) { cand = r; run = 0; }
            else if (r === cand) {
                run += 1;
                if (run >= 2 || r === V.sil) { cur = r; run = 0; }
            } else { cand = r; run = 1; }
            vis[f] = cur;
        }

        return { hop: hopSec, frames, vis, energy: eSm, duration: len / sr };
    }

    /* ------------------------------------------------------------------ *
     * Text → viseme units (for text-to-speech)
     * ------------------------------------------------------------------ */

    const DIGRAPHS = [
        ['th', V.TH, 1.4], ['sh', V.CH, 1.4], ['ch', V.CH, 1.4], ['ph', V.FF, 1.2],
        ['ck', V.kk, 1], ['ng', V.nn, 1.2], ['wh', V.U, 1],
        ['oo', V.U, 2.4], ['ee', V.I, 2.4], ['ea', V.I, 2.2], ['ie', V.I, 2],
        ['ai', V.E, 2.2], ['ay', V.E, 2.2], ['ei', V.E, 2],
        ['oa', V.O, 2.2], ['ow', V.O, 2.2], ['ou', V.aa, 2.2], ['au', V.O, 2.2],
        ['aw', V.O, 2.2], ['oi', V.O, 2.2]
    ];
    const SINGLE = {
        a: [V.aa, 2], e: [V.E, 1.8], i: [V.I, 1.8], o: [V.O, 2], u: [V.U, 1.8],
        b: [V.PP, 1], m: [V.PP, 1], p: [V.PP, 1],
        f: [V.FF, 1], v: [V.FF, 1],
        s: [V.SS, 1], z: [V.SS, 1], x: [V.SS, 1],
        d: [V.DD, 0.9], t: [V.DD, 0.9],
        n: [V.nn, 0.9], l: [V.nn, 0.9],
        r: [V.RR, 1],
        k: [V.kk, 0.9], g: [V.kk, 0.9], c: [V.kk, 0.9], q: [V.kk, 0.9],
        j: [V.CH, 1.1],
        w: [V.U, 1], y: [V.I, 1], h: [-2, 0.6]
    };

    function buildUnits(text) {
        const src = String(text || '').toLowerCase();
        const units = [];
        let t = 0;
        const push = (viseme, dur, charIdx, weight) => {
            units.push({ viseme, start: t, dur, charIdx, weight: weight || 1 });
            t += dur;
        };
        let i = 0;
        while (i < src.length) {
            const ch = src[i];
            const pair = src.substr(i, 2);
            const dg = DIGRAPHS.find((d) => d[0] === pair);
            if (dg) { push(dg[1], dg[2], i, VOWELS.has(dg[1]) ? 1 : 0.85); i += 2; continue; }
            if (SINGLE[ch]) {
                const [vis, dur] = SINGLE[ch];
                if (vis === -2) push(V.aa, dur, i, 0.35); // soft 'h' breath
                else push(vis, dur, i, VOWELS.has(vis) ? 1 : 0.85);
                i += 1; continue;
            }
            if (/\s/.test(ch)) { push(V.sil, 0.8, i, 0); i += 1; continue; }
            if (/[,;:\u2014\u2013-]/.test(ch)) { push(V.sil, 4, i, 0); i += 1; continue; }
            if (/[.!?\u2026]/.test(ch)) { push(V.sil, 7, i, 0); i += 1; continue; }
            if (/<|>|&/.test(ch)) { i += 1; continue; }
            i += 1; // apostrophes, digits, etc.
        }
        return { units, total: t };
    }

    /* ------------------------------------------------------------------ */

    const analysisCache = new Map();

    function analyseUrl(url) {
        if (analysisCache.has(url)) return analysisCache.get(url);
        const p = fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.arrayBuffer();
            })
            .then(decode)
            .then(analyseBuffer);
        analysisCache.set(url, p);
        p.catch(() => analysisCache.delete(url));
        return p;
    }

    class AvatarLipSync {
        constructor(viewer, options = {}) {
            this.viewer = viewer;
            this.avatarId = options.avatarId || 'welcome_guide';
            this.strength = typeof options.strength === 'number' ? options.strength : 1;
            this.lead = typeof options.lead === 'number' ? options.lead : 0.04;

            this.cur = new Float32Array(VISEMES.length);
            this.tgt = new Float32Array(VISEMES.length);
            this.jawCur = 0;
            this.jawTgt = 0;
            this._dirty = false;

            this._bindingFor = null; // modelRoot we resolved meshes for
            this._bindings = [];

            this.speaking = false; // narration currently playing (for gestures)
            this.level = 0;        // 0..1 smoothed voice level

            this.clip = null;   // { audio, url, analysis, failed, phase, vowelIdx, lastSyl }
            this.speech = null; // text-to-speech state
        }

        /* ---------- public API ---------- */

        attachClip(audio, url) {
            if (!audio) return;
            this.stopSpeech();
            const clip = {
                audio, url,
                analysis: null,
                failed: false,
                phase: 0, syl: -1, vowel: V.aa
            };
            this.clip = clip;
            if (url) {
                analyseUrl(url).then((a) => {
                    clip.analysis = a;
                }).catch((err) => {
                    clip.failed = true;
                    console.warn('Lip-sync analysis unavailable, using rhythm fallback:', err && err.message);
                });
            } else {
                clip.failed = true;
            }
        }

        stopClip(audio) {
            if (!this.clip) return;
            if (audio && this.clip.audio !== audio) return;
            this.clip = null;
        }

        attachSpeech(utter, text) {
            if (!utter) return;
            this.clip = null;
            const { units, total } = buildUnits(text);
            const rate = typeof utter.rate === 'number' ? utter.rate : 1;
            const sp = {
                utter, units, total,
                pos: 0,
                rate: clamp(19 * rate, 8, 40), // units / sec
                started: false,
                ended: false,
                hasBoundary: false,
                lastBoundaryUnit: 0,
                lastBoundaryT: 0,
                wordEnd: total,
                attachedAt: performance.now() / 1000
            };
            this.speech = sp;

            const nowS = () => performance.now() / 1000;
            utter.addEventListener('start', () => {
                if (this.speech !== sp) return;
                sp.started = true;
                sp.pos = 0;
                sp.lastBoundaryUnit = 0;
                sp.lastBoundaryT = nowS();
            });
            utter.addEventListener('boundary', (ev) => {
                if (this.speech !== sp) return;
                if (ev && ev.name && ev.name !== 'word') return;
                const charIndex = ev && typeof ev.charIndex === 'number' ? ev.charIndex : 0;
                const ui = sp.units.findIndex((u) => u.charIdx >= charIndex);
                if (ui < 0) return;
                const unitPos = sp.units[ui].start;
                const now = nowS();
                if (sp.hasBoundary && now - sp.lastBoundaryT > 0.05) {
                    const observed = (unitPos - sp.lastBoundaryUnit) / (now - sp.lastBoundaryT);
                    if (observed > 0) sp.rate = clamp(sp.rate * 0.5 + observed * 0.5, 6, 45);
                }
                sp.hasBoundary = true;
                sp.started = true;
                sp.pos = unitPos;
                sp.lastBoundaryUnit = unitPos;
                sp.lastBoundaryT = now;
                // Where the current word ends (next whitespace / punctuation unit)
                let k = ui;
                while (k < sp.units.length && sp.units[k].weight !== 0) k += 1;
                sp.wordEnd = k < sp.units.length ? sp.units[k].start : sp.total;
            });
            const end = () => {
                if (this.speech === sp) sp.ended = true;
            };
            utter.addEventListener('end', end);
            utter.addEventListener('error', end);
        }

        stopSpeech() {
            this.speech = null;
        }

        stop() {
            this.clip = null;
            this.speech = null;
        }

        /* ---------- per-frame ---------- */

        update(dt) {
            dt = clamp(dt || 0, 0, 0.1);
            this.tgt.fill(0);
            this.jawTgt = 0;

            this.speaking = false;
            if (this.clip) this._targetsFromClip(dt);
            else if (this.speech) this._targetsFromSpeech(dt);

            // Overall voice level (smoothed) — used by AvatarGestures for hand beats
            let peak = 0;
            for (let i = 1; i < this.tgt.length; i += 1) peak = Math.max(peak, this.tgt[i]);
            this.level += (peak - this.level) * (1 - Math.exp(-12 * dt));

            // Attack fast, release a little slower → natural mouth motion
            let any = false;
            for (let i = 0; i < this.cur.length; i += 1) {
                const t = this.tgt[i] * this.strength;
                const k = t > this.cur[i] ? 26 : 16;
                this.cur[i] += (t - this.cur[i]) * (1 - Math.exp(-k * dt));
                if (this.cur[i] < 0.002) this.cur[i] = 0;
                if (this.cur[i] > 0) any = true;
            }
            const jt = this.jawTgt * this.strength;
            this.jawCur += (jt - this.jawCur) * (1 - Math.exp(-(jt > this.jawCur ? 26 : 16) * dt));
            if (this.jawCur < 0.002) this.jawCur = 0;
            if (this.jawCur > 0) any = true;

            if (!any && !this._dirty) return;
            this._apply();
            this._dirty = any;
        }

        _targetsFromClip(dt) {
            const clip = this.clip;
            const a = clip.audio;
            if (!a || a.paused || a.ended || a.muted || a.volume === 0 || a.readyState < 2) return;
            this.speaking = true;

            const an = clip.analysis;
            if (an) {
                const t = a.currentTime + this.lead;
                const f = clamp(Math.floor(t / an.hop), 0, an.frames - 1);
                const vis = an.vis[f];
                const e = an.energy[f];
                this._setViseme(vis, e);
                return;
            }
            if (!clip.failed) return; // still analysing — keep mouth still for a moment

            // Rhythm fallback: ~4.5 syllables/sec with varied vowels
            clip.phase += dt * 4.5;
            const syl = Math.floor(clip.phase);
            if (syl !== clip.syl) {
                clip.syl = syl;
                const seq = [V.aa, V.E, V.O, V.I, V.aa, V.U, V.O, V.E];
                clip.vowel = seq[(syl * 5 + 3) % seq.length];
            }
            const frac = clip.phase - syl;
            const env = Math.pow(Math.sin(Math.PI * frac), 0.7);
            const gap = syl % 7 === 6 ? 0.15 : 1; // short breath every few syllables
            this._setViseme(frac > 0.9 || frac < 0.1 ? V.PP : clip.vowel, env * gap * 0.9);
        }

        _targetsFromSpeech(dt) {
            const sp = this.speech;
            if (sp.ended) return;
            const synth = window.speechSynthesis;

            if (!sp.started) {
                // Some voices never fire 'start' — fall back to synth state
                if (synth && synth.speaking && performance.now() / 1000 - sp.attachedAt > 0.25) {
                    sp.started = true;
                    sp.lastBoundaryT = performance.now() / 1000;
                } else {
                    return;
                }
            }

            this.speaking = true;
            sp.pos += sp.rate * dt;
            if (sp.hasBoundary && sp.pos > sp.wordEnd) sp.pos = sp.wordEnd;
            if (sp.pos >= sp.total) return;

            // Find the unit under the playhead (binary search on start)
            const u = sp.units;
            let lo = 0; let hi = u.length - 1;
            while (lo < hi) {
                const mid = (lo + hi + 1) >> 1;
                if (u[mid].start <= sp.pos) lo = mid; else hi = mid - 1;
            }
            const unit = u[lo];
            if (!unit || unit.weight === 0) return;
            const p = clamp((sp.pos - unit.start) / unit.dur, 0, 1);
            const env = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * p), 0.6);
            this._setViseme(unit.viseme, env * unit.weight);
        }

        _setViseme(vis, energy) {
            if (vis === V.sil || vis < 0 || energy <= 0) return;
            const e = clamp(energy, 0, 1);
            const w = CAP_ARR[vis] * (0.35 + 0.65 * e);
            this.tgt[vis] = w;
            if (VOWELS.has(vis)) this.jawTgt = 0.08 + 0.3 * e;
            else if (vis === V.SS || vis === V.CH || vis === V.FF) this.jawTgt = 0.05 + 0.08 * e;
        }

        /* ---------- applying to the GLB ---------- */

        _resolveBindings() {
            const avatars = (this.viewer && this.viewer._sceneAvatars) || [];
            const entry = avatars.find((a) => a.isModel && a.modelRoot && a.id === this.avatarId)
                || avatars.find((a) => a.isModel && a.modelRoot);
            const root = entry && entry.modelRoot;
            if (root === this._bindingFor) return;
            this._bindingFor = root || null;
            this._bindings = [];
            if (!root) return;

            root.traverse((child) => {
                if (!child.isMesh || !child.morphTargetDictionary || !child.morphTargetInfluences) return;
                const dict = child.morphTargetDictionary;
                if (dict.viseme_aa === undefined) return;
                const idx = VISEMES.map((n) => (dict[n] !== undefined ? dict[n] : -1));
                this._bindings.push({
                    mesh: child,
                    idx,
                    jaw: dict.jawOpen !== undefined ? dict.jawOpen : -1
                });
                // Morphing needs the flag on the (possibly rebuilt) materials
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                    if (m && !m.morphTargets) { m.morphTargets = true; m.needsUpdate = true; }
                });
            });
        }

        _apply() {
            this._resolveBindings();
            for (let b = 0; b < this._bindings.length; b += 1) {
                const { mesh, idx, jaw } = this._bindings[b];
                const inf = mesh.morphTargetInfluences;
                for (let i = 0; i < idx.length; i += 1) {
                    if (idx[i] >= 0) inf[idx[i]] = this.cur[i];
                }
                if (jaw >= 0) inf[jaw] = this.jawCur;
            }
        }
    }

    window.AvatarLipSync = AvatarLipSync;
})();
