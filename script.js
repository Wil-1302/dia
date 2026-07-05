/* =====================================================================
   UN LUGAR PARA DESCANSAR  ·  cuadro vivo interactivo
   HTML + CSS + JS (ES6). Sin frameworks. Audio 100% procedural.
   Hecho con cariño — para que sonrías. — Wil
   ===================================================================== */

'use strict';

/* ============================================================
   0 · UTILIDADES
   ============================================================ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rand  = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick  = (arr) => arr[randi(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SVGNS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1 · CONTENIDO  (mensajes, gifs, frases)
   ============================================================ */
const GIFS = [
  'assets/img/hug.gif',
  'assets/img/seeyall.gif',
  'assets/img/bubu1.gif',
  'assets/img/bubu2.gif',
  'assets/img/kiss.gif',
  'assets/img/dudu.gif',
];

// +40 mensajes originales para las tarjetas de recompensa
const MESSAGES = [
  'Estoy muy orgulloso de ti ❤️',
  'Gracias por existir, en serio.',
  'Descansa, aquí nada te apura.',
  'Hoy hiciste lo mejor que pudiste, y fue suficiente.',
  'No tienes que ser perfecta para ser mi favorita.',
  'Siempre tendrás un lugar seguro conmigo.',
  'Eres mi tranquilidad favorita.',
  'Tu sonrisa hace más bonito mi mundo.',
  'No olvides sonreír, te queda precioso.',
  'Te admiro muchísimo, más de lo que imaginas.',
  'Respira. Yo me quedo aquí contigo.',
  'Eres suave como la luz de esta luna.',
  'Cada día te elijo, y lo volvería a hacer.',
  'Contigo hasta el silencio se siente cálido.',
  'Eres el motivo por el que sonrío sin razón.',
  'Si te cansas, apóyate en mí; para eso estoy.',
  'Me encanta la forma en que ves el mundo.',
  'Eres mi lugar favorito del universo.',
  'Nada de lo que sientes es demasiado para mí.',
  'Te mereces todo lo bonito y despacito.',
  'Guardé un poco de calma aquí, solo para ti.',
  'Eres valiente incluso cuando te sientes pequeña.',
  'Tu paz también me importa a mí.',
  'Me haces bien sin siquiera intentarlo.',
  'Que este ratito te recuerde lo amada que eres.',
  'Eres la mejor parte de mis días ordinarios.',
  'Contigo aprendí que la ternura también es hogar.',
  'No corras hoy; el mundo puede esperarte.',
  'Eres luz cálida en las noches largas.',
  'Me gusta cuidarte, aunque sea desde una pantalla.',
  'Tu esfuerzo de hoy vale muchísimo.',
  'Aquí puedes bajar los hombros y soltar el peso.',
  'Eres arte, y de mi estilo favorito.',
  'Prometo recordarte lo increíble que eres.',
  'Tienes permiso de descansar sin sentir culpa.',
  'Eres más fuerte de lo que crees, y más dulce también.',
  'Me alegra tanto que existas en mi historia.',
  'Que sepas: pienso en ti más de lo que digo.',
  'Eres calma con forma de persona.',
  'Gracias por dejarme quererte a mi manera.',
  'Todo en ti me parece digno de admirar.',
  'Ojalá pudiera abrazarte justo ahora.',
  'Eres mi pausa buena en medio del ruido.',
  'Sigue, amor; lo estás haciendo hermoso.',
];

// frases fugaces (whisper) al mover cosas del paisaje
const WHISPERS = [
  'shhh… escucha el viento 🍃',
  'las estrellas también te saludan ✨',
  'todo aquí respira contigo',
  'sigue explorando, hay sorpresas 🌙',
  'qué bonito verte curiosear',
  'un pinar entero para tu calma',
  '¿escuchaste eso? fue una campanita 🔔',
];

/* ============================================================
   2 · MOTOR DE AUDIO  (Web Audio, procedural)
   ============================================================ */
const Audio = (() => {
  let ctx, master, musicGain, windGain, on = false, started = false;
  let arpTimer = null, chordTimer = null;

  // reverb sencillo por impulso generado
  function makeReverb() {
    const len = ctx.sampleRate * 3.2;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
  }

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const reverb = makeReverb(); const rGain = ctx.createGain(); rGain.gain.value = 0.5;
    reverb.connect(rGain); rGain.connect(master);

    musicGain = ctx.createGain(); musicGain.gain.value = 0.16;
    musicGain.connect(master); musicGain.connect(reverb);

    // — pad ambiental: acordes lentos —
    const chords = [ [220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [164.81, 207.65, 246.94] ];
    let ci = 0;
    const padOsc = [], padGain = [];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'sine';
      const g = ctx.createGain(); g.gain.value = 0.0;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      o.connect(lp); lp.connect(g); g.connect(musicGain);
      o.start(); padOsc.push(o); padGain.push(g);
    }
    function nextChord() {
      const ch = chords[ci % chords.length]; ci++;
      const t = ctx.currentTime;
      ch.forEach((f, i) => {
        padOsc[i].frequency.cancelScheduledValues(t);
        padOsc[i].frequency.setValueAtTime(padOsc[i].frequency.value, t);
        padOsc[i].frequency.linearRampToValueAtTime(f, t + 3);
        padGain[i].gain.setTargetAtTime(0.12, t, 1.4);
      });
    }
    nextChord(); chordTimer = setInterval(nextChord, 7000);

    // — arpegio de campanitas ocasional —
    function bell(freq, when, dur = 1.6, vol = 0.09) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2.01;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); o2.connect(g); g.connect(musicGain); g.connect(reverb);
      o.start(when); o2.start(when); o.stop(when + dur); o2.stop(when + dur);
    }
    function arp() {
      const scale = [523.25, 587.33, 659.25, 783.99, 880, 987.77];
      const n = randi(2, 4); const t0 = ctx.currentTime + 0.1;
      for (let i = 0; i < n; i++) bell(pick(scale), t0 + i * 0.42, rand(1.2, 2.2), rand(0.05, 0.1));
    }
    arp(); arpTimer = setInterval(() => { if (Math.random() < 0.75) arp(); }, 5200);

    // — viento: ruido marrón filtrado —
    const bufLen = ctx.sampleRate * 2;
    const nb = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = nb.getChannelData(0); let last = 0;
    for (let i = 0; i < bufLen; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; nd[i] = last * 3.2; }
    const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.05;
    const windLfo = ctx.createOscillator(); windLfo.frequency.value = 0.08;
    const windLfoG = ctx.createGain(); windLfoG.gain.value = 0.04;
    windLfo.connect(windLfoG); windLfoG.connect(windGain.gain);
    noise.connect(bp); bp.connect(windGain); windGain.connect(master);
    noise.start(); windLfo.start();

    // expone SFX de descubrimiento vía Audio.sfx
    _sfx = (type) => {
      if (!on) return;
      const t = ctx.currentTime;
      if (type === 'twinkle') {
        const o = ctx.createOscillator(); o.type = 'sine';
        const g = ctx.createGain();
        o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g); g.connect(reverb); g.connect(master); o.start(t); o.stop(t + 0.42);
      } else if (type === 'chime') {
        [880, 1174.66, 1567.98].forEach((f, i) => bell(f, t + i * 0.08, 1.4, 0.09));
      } else if (type === 'discover') {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, t + i * 0.1, 1.8, 0.11));
      } else if (type === 'soft') {
        bell(659.25, t, 1.1, 0.06);
      }
    };
  }

  let _sfx = () => {};
  const sfx = (t) => _sfx(t);

  function fade(target, time = 1.2) {
    if (!ctx) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx.currentTime + time);
  }

  return {
    toggle() {
      if (!started) { init(); started = true; }
      if (ctx.state === 'suspended') ctx.resume();
      on = !on; fade(on ? 0.9 : 0, 1.4); return on;
    },
    ensureOn() {
      if (!started) { init(); started = true; }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      if (!on) { on = true; fade(0.9, 1.4); }
      return on;
    },
    get isOn() { return on; },
    sfx,
  };
})();

/* ============================================================
   3 · FÁBRICA DE SVG  (paltitas con personalidad + paisaje)
   ============================================================ */

// ---- paltita base + 10 personalidades ----
function avocadoSVG(type) {
  const body = `
    <g class="avo-body">
      <ellipse cx="50" cy="72" rx="34" ry="40" fill="#5f8f37"/>
      <ellipse cx="50" cy="72" rx="34" ry="40" fill="none" stroke="#3d6320" stroke-width="3"/>
      <ellipse cx="50" cy="74" rx="24" ry="29" fill="#e7efb6"/>
      <circle cx="50" cy="80" r="13" fill="#8a5a2b"/>
      <circle cx="46" cy="76" r="4" fill="#a9773f" opacity=".7"/>
    </g>`;

  const faces = {
    sleep: {
      face: `<path d="M36 62 q6 5 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <path d="M52 62 q6 5 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <path d="M44 74 q6 4 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      extra: `<g class="glint"><text x="70" y="40" font-family="Quicksand" font-size="12" fill="#fff4c9">z</text>
              <text x="78" y="30" font-family="Quicksand" font-size="9" fill="#fff4c9">z</text></g>
              <path d="M30 44 q20 -16 40 0 q-2 6 -20 6 q-18 0 -20 -6z" fill="#7fb3e6"/>
              <circle cx="70" cy="44" r="5" fill="#fff4c9"/>`,
    },
    read: {
      face: `<circle cx="42" cy="62" r="8" fill="#fff" stroke="#204010" stroke-width="2.4"/>
             <circle cx="58" cy="62" r="8" fill="#fff" stroke="#204010" stroke-width="2.4"/>
             <line x1="50" y1="60" x2="50" y2="62" stroke="#204010" stroke-width="2"/>
             <circle cx="42" cy="63" r="2.4" fill="#204010"/><circle cx="58" cy="63" r="2.4" fill="#204010"/>
             <path d="M44 76 q6 3 12 0" stroke="#204010" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
      extra: `<g class="glint"><rect x="34" y="86" width="32" height="20" rx="2" fill="#c96b4a"/>
              <path d="M50 86 v20" stroke="#8a3f28" stroke-width="1.6"/>
              <path d="M40 92 h6 M54 92 h6 M40 98 h6 M54 98 h6" stroke="#fff" stroke-width="1.2"/></g>`,
    },
    star: {
      face: `<circle cx="42" cy="62" r="3.4" fill="#204010"/><circle cx="58" cy="62" r="3.4" fill="#204010"/>
             <path d="M43 74 q7 6 14 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <circle cx="36" cy="70" r="4" fill="#ff9db0" opacity=".5"/><circle cx="64" cy="70" r="4" fill="#ff9db0" opacity=".5"/>`,
      extra: `<g class="glint" transform="translate(66 78)"><path d="M0 -12 L3.5 -3.5 L12 -3 L5 3 L7 12 L0 6 L-7 12 L-5 3 L-12 -3 L-3.5 -3.5 Z" fill="#f6d365" stroke="#e0a93b" stroke-width="1.5"/></g>`,
    },
    scarf: {
      face: `<circle cx="42" cy="60" r="3.4" fill="#204010"/><circle cx="58" cy="60" r="3.4" fill="#204010"/>
             <path d="M44 70 q6 4 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <circle cx="35" cy="66" r="4" fill="#ff9db0" opacity=".5"/><circle cx="65" cy="66" r="4" fill="#ff9db0" opacity=".5"/>`,
      extra: `<path d="M22 82 q28 12 56 0 v8 q-28 12 -56 0z" fill="#c0453f"/>
              <path d="M30 88 l-6 22 h10 l4 -18z" fill="#a83833"/>
              <path d="M30 88 l-6 22" stroke="#e07a72" stroke-width="1.4"/>`,
    },
    coffee: {
      face: `<circle cx="42" cy="62" r="3.4" fill="#204010"/><circle cx="58" cy="62" r="3.4" fill="#204010"/>
             <path d="M44 74 q6 4 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      extra: `<g class="glint"><path d="M66 68 q4 -10 8 0" stroke="#fff4c9" stroke-width="1.6" fill="none" opacity=".7"/>
              <path d="M60 66 q4 -12 8 0" stroke="#fff4c9" stroke-width="1.6" fill="none" opacity=".5"/></g>
              <rect x="58" y="74" width="18" height="16" rx="2" fill="#f3ede0"/>
              <rect x="58" y="74" width="18" height="6" rx="2" fill="#8a5a2b"/>
              <path d="M76 78 q8 0 8 6 q0 6 -8 6" stroke="#f3ede0" stroke-width="2.4" fill="none"/>`,
    },
    moon: {
      face: `<circle cx="42" cy="60" r="4" fill="#204010"/><circle cx="43.5" cy="58.5" r="1.4" fill="#fff"/>
             <circle cx="58" cy="60" r="4" fill="#204010"/><circle cx="59.5" cy="58.5" r="1.4" fill="#fff"/>
             <ellipse cx="50" cy="74" rx="4" ry="3" fill="#204010"/>`,
      extra: `<g class="glint" transform="translate(70 34)"><path d="M0 0 a9 9 0 1 0 6 15 a11 11 0 1 1 -6 -15z" fill="#fff4c9" stroke="#e0c987" stroke-width="1.4"/></g>`,
    },
    hat: {
      face: `<circle cx="42" cy="64" r="3.4" fill="#204010"/><circle cx="58" cy="64" r="3.4" fill="#204010"/>
             <path d="M44 76 q6 4 12 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <circle cx="35" cy="70" r="4" fill="#ff9db0" opacity=".5"/><circle cx="65" cy="70" r="4" fill="#ff9db0" opacity=".5"/>`,
      extra: `<path d="M28 46 q22 -8 44 0 q-4 6 -22 6 q-18 0 -22 -6z" fill="#b23a48"/>
              <path d="M32 46 q18 -22 36 0z" fill="#d24a58"/>
              <circle cx="50" cy="22" r="6" fill="#fff4c9" class="glint"/>`,
    },
    happy: {
      face: `<path d="M38 60 q4 -4 8 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <path d="M54 60 q4 -4 8 0" stroke="#204010" stroke-width="2.6" fill="none" stroke-linecap="round"/>
             <path d="M40 72 q10 10 20 0" stroke="#204010" stroke-width="3" fill="none" stroke-linecap="round"/>
             <circle cx="34" cy="70" r="5" fill="#ff9db0" opacity=".55"/><circle cx="66" cy="70" r="5" fill="#ff9db0" opacity=".55"/>`,
      extra: `<path d="M20 78 q-8 -12 4 -16" stroke="#3d6320" stroke-width="5" fill="none" stroke-linecap="round"/>
              <path d="M80 78 q8 -12 -4 -16" stroke="#3d6320" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    },
    shy: {
      face: `<path d="M38 64 q4 3 8 0" stroke="#204010" stroke-width="2.4" fill="none" stroke-linecap="round"/>
             <path d="M54 64 q4 3 8 0" stroke="#204010" stroke-width="2.4" fill="none" stroke-linecap="round"/>
             <path d="M46 74 q4 2 8 0" stroke="#204010" stroke-width="2.2" fill="none" stroke-linecap="round"/>
             <circle cx="34" cy="70" r="6" fill="#ff9db0" opacity=".6"/><circle cx="66" cy="70" r="6" fill="#ff9db0" opacity=".6"/>`,
      extra: `<path d="M22 66 q10 6 20 4" stroke="#3d6320" stroke-width="6" fill="none" stroke-linecap="round"/>
              <path d="M78 66 q-10 6 -20 4" stroke="#3d6320" stroke-width="6" fill="none" stroke-linecap="round"/>`,
    },
    surprise: {
      face: `<circle cx="42" cy="60" r="6" fill="#fff" stroke="#204010" stroke-width="2.4"/><circle cx="42" cy="61" r="3" fill="#204010"/>
             <circle cx="58" cy="60" r="6" fill="#fff" stroke="#204010" stroke-width="2.4"/><circle cx="58" cy="61" r="3" fill="#204010"/>
             <ellipse cx="50" cy="76" rx="5" ry="6" fill="#204010"/>
             <circle cx="34" cy="70" r="4" fill="#ff9db0" opacity=".5"/><circle cx="66" cy="70" r="4" fill="#ff9db0" opacity=".5"/>`,
      extra: `<line x1="50" y1="24" x2="50" y2="16" stroke="#f6d365" stroke-width="2.4" stroke-linecap="round" class="glint"/>
              <line x1="38" y1="28" x2="34" y2="21" stroke="#f6d365" stroke-width="2.4" stroke-linecap="round" class="glint"/>
              <line x1="62" y1="28" x2="66" y2="21" stroke="#f6d365" stroke-width="2.4" stroke-linecap="round" class="glint"/>`,
    },
  };

  const f = faces[type] || faces.happy;
  return `<svg viewBox="0 0 100 130" width="100%" height="100%">${f.extra || ''}${body}${f.face}</svg>`;
}

const AVO_TITLES = {
  sleep: 'una paltita durmiendo', read: 'una paltita leyendo', star: 'una paltita abrazando una estrella',
  scarf: 'una paltita con bufanda', coffee: 'una paltita tomando café', moon: 'una paltita mirando la luna',
  hat: 'una paltita con gorrito', happy: 'una paltita feliz', shy: 'una paltita tímida', surprise: 'una paltita sorprendida',
};

// ---- elementos del paisaje ----
const Art = {
  // ciprés en llama, con pinceladas que suben en espiral (Van Gogh)
  cypress: () => `<svg viewBox="0 0 90 210" width="100%" height="100%">
    <path d="M45 208 C14 156 26 92 45 4 C64 92 76 156 45 208Z" fill="#0e2a17"/>
    <path d="M45 200 C22 156 32 96 45 16 C58 96 68 156 45 200Z" fill="#183d22"/>
    <g stroke-linecap="round" fill="none">
      <path d="M45 12 C36 44 40 60 34 92 C40 120 34 150 40 190" stroke="#2f6b3a" stroke-width="2.4" opacity=".7"/>
      <path d="M45 26 C54 56 48 74 54 104 C48 132 54 160 48 194" stroke="#0c2412" stroke-width="2.2" opacity=".7"/>
      <path d="M40 40 C30 58 38 70 30 92" stroke="#3f7d47" stroke-width="2" opacity=".6"/>
      <path d="M52 60 C62 80 54 96 62 120" stroke="#3f7d47" stroke-width="2" opacity=".55"/>
      <path d="M45 150 C36 168 52 176 45 196" stroke="#245231" stroke-width="2" opacity=".6"/>
    </g>
  </svg>`,

  tree: () => `<svg viewBox="0 0 140 150" width="100%" height="100%">
    <rect x="62" y="90" width="14" height="60" rx="5" fill="#4a3620"/>
    <circle cx="70" cy="66" r="46" fill="#1f4a28"/>
    <circle cx="44" cy="78" r="30" fill="#26592f"/>
    <circle cx="98" cy="80" r="28" fill="#1a4022"/>
    <circle cx="70" cy="60" r="30" fill="#2f6b3a" opacity=".8"/>
    <g fill="#f6d365"><circle cx="52" cy="60" r="2.2"/><circle cx="86" cy="70" r="2.2"/><circle cx="70" cy="46" r="2"/></g>
  </svg>`,

  bush: () => `<svg viewBox="0 0 130 80" width="100%" height="100%">
    <ellipse cx="40" cy="60" rx="34" ry="26" fill="#22522c"/>
    <ellipse cx="80" cy="58" rx="38" ry="30" fill="#1c4525"/>
    <ellipse cx="62" cy="46" rx="30" ry="24" fill="#2c6337"/>
    <g fill="#f6d365"><circle cx="46" cy="48" r="2"/><circle cx="82" cy="52" r="2"/><circle cx="66" cy="40" r="2"/></g>
  </svg>`,

  rock: () => `<svg viewBox="0 0 120 80" width="100%" height="100%">
    <path d="M12 74 Q6 44 36 34 Q54 20 80 30 Q112 40 108 74Z" fill="#3a4a63"/>
    <path d="M12 74 Q6 44 36 34 Q54 20 80 30 Q112 40 108 74Z" fill="none" stroke="#26324a" stroke-width="3"/>
    <path d="M40 40 Q60 48 92 42" stroke="#586a86" stroke-width="2.5" fill="none" opacity=".7"/>
    <path d="M30 58 Q60 66 96 58" stroke="#26324a" stroke-width="2" fill="none" opacity=".6"/>
  </svg>`,

  house: () => `<svg viewBox="0 0 120 110" width="100%" height="100%">
    <rect x="24" y="52" width="72" height="52" rx="3" fill="#243a6a"/>
    <path d="M18 54 L60 22 L102 54Z" fill="#8a3f2a"/>
    <path d="M18 54 L60 22 L102 54Z" fill="none" stroke="#5e2a1c" stroke-width="2"/>
    <rect x="52" y="76" width="16" height="28" rx="2" fill="#3a2a1a"/>
    <rect class="win" x="33" y="62" width="14" height="14" rx="2" fill="#f6d365"/>
    <rect class="win" x="73" y="62" width="14" height="14" rx="2" fill="#f6d365"/>
    <rect x="70" y="30" width="9" height="18" fill="#5e2a1c"/>
  </svg>`,

  // un girasol al estilo Van Gogh: pétalos ocres irregulares + disco de semillas
  sunflower: (cx = 0, cy = 0, r = 16, tilt = 0) => {
    const cols = ['#f6c445', '#f4a825', '#ffd766', '#e69113'];
    let pet = '';
    const N = 16;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 360;
      const c = cols[i % cols.length];
      const len = r * (1.5 + (i % 3 === 0 ? 0.28 : 0));
      pet += `<path d="M0 ${-r * 0.7} C ${-r * 0.32} ${-r * 1.15}, ${-r * 0.18} ${-len}, 0 ${-len} C ${r * 0.18} ${-len}, ${r * 0.32} ${-r * 1.15}, 0 ${-r * 0.7} Z" fill="${c}" transform="rotate(${a})" opacity=".95"/>`;
    }
    // disco de semillas con puntitos
    let seeds = '';
    for (let i = 0; i < 26; i++) { const a = i * 137.5 * Math.PI / 180, rr = Math.sqrt(i / 26) * r * 0.62; seeds += `<circle cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr}" r="1.1" fill="#4a2f14"/>`; }
    return `<g transform="translate(${cx} ${cy}) rotate(${tilt})"><g class="sunhead" style="transform-origin:center">
      ${pet}<circle r="${r * 0.72}" fill="#7a4a1e"/><circle r="${r * 0.66}" fill="#5e3813"/>${seeds}
    </g></g>`;
  },

  // campo de girasoles (tallos + cabezas, alguno cabizbajo)
  sunflowers: () => {
    let s = '<svg viewBox="0 0 180 130" width="100%" height="100%">';
    const spots = [[24, 60, 15, -6], [58, 48, 18, 4], [96, 40, 20, -3], [134, 52, 16, 8], [160, 66, 13, -8]];
    for (const [x, y, r, tilt] of spots) {
      const bend = tilt * 0.6;
      s += `<path d="M${x} 130 C ${x + bend} 100, ${x - bend} ${y + r + 14}, ${x} ${y + r}" stroke="#2f5e2a" stroke-width="3.4" fill="none"/>
            <path d="M${x} ${y + r + 26} q ${18} -6 ${26} 8 q -18 6 -26 -8Z" fill="#356b2c"/>
            <path d="M${x} ${y + r + 40} q ${-18} -4 ${-26} 8 q 18 6 26 -8Z" fill="#2c5a25"/>`;
      s += Art.sunflower(x, y, r, tilt);
    }
    return s + '</svg>';
  },

  cloud: () => `<svg viewBox="0 0 200 90" width="100%" height="100%">
    <g fill="rgba(230,238,255,.92)">
      <ellipse cx="60" cy="55" rx="42" ry="26"/><ellipse cx="105" cy="46" rx="50" ry="32"/>
      <ellipse cx="150" cy="56" rx="38" ry="24"/><ellipse cx="100" cy="66" rx="70" ry="20"/>
    </g>
    <g fill="rgba(255,244,201,.5)"><ellipse cx="105" cy="40" rx="40" ry="18"/></g>
  </svg>`,

  hill: (w, c1, c2) => `<svg viewBox="0 0 ${w} 300" width="100%" height="100%" preserveAspectRatio="none">
    <path d="M0 300 L0 140 Q ${w*0.3} 40 ${w*0.55} 120 Q ${w*0.8} 190 ${w} 90 L${w} 300Z" fill="${c1}"/>
    <path d="M0 300 L0 200 Q ${w*0.35} 130 ${w*0.6} 190 Q ${w*0.85} 240 ${w} 170 L${w} 300Z" fill="${c2}"/>
  </svg>`,

  butterfly: () => `<svg viewBox="0 0 60 50" width="100%" height="100%">
    <g class="bwing-l"><path d="M30 25 Q6 4 4 24 Q6 44 30 27Z" fill="#f6d365" stroke="#c98a2b" stroke-width="1.5"/></g>
    <g class="bwing-r"><path d="M30 25 Q54 4 56 24 Q54 44 30 27Z" fill="#ffb347" stroke="#c98a2b" stroke-width="1.5"/></g>
    <ellipse cx="30" cy="25" rx="2.6" ry="9" fill="#3a2a1a"/>
    <path d="M30 17 q-4 -8 -8 -9 M30 17 q4 -8 8 -9" stroke="#3a2a1a" stroke-width="1.4" fill="none"/>
  </svg>`,

  bird: () => `<svg viewBox="0 0 60 30" width="100%" height="100%">
    <path class="wing-a" d="M30 18 Q16 2 4 12" stroke="#0e1a34" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path class="wing-b" d="M30 18 Q44 2 56 12" stroke="#0e1a34" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  moon: () => {
    // corona de pinceladas girando alrededor de la luna
    let corona = '';
    const cols = ['#ffe9a8', '#f4c860', '#ffd77a'];
    for (let ring = 0; ring < 3; ring++) {
      const rr = 86 + ring * 12, n = 20 + ring * 4;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 360;
        corona += `<path d="M0 ${-rr} q 7 6 0 14" stroke="${cols[ring % 3]}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="${0.32 - ring * 0.08}" transform="rotate(${a})"/>`;
      }
    }
    return `<svg viewBox="-40 -40 280 280" width="100%" height="100%">
    <defs>
      <radialGradient id="mg" cx="42%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#fffdf0"/><stop offset="60%" stop-color="#ffe9a8"/><stop offset="100%" stop-color="#f4c860"/>
      </radialGradient>
    </defs>
    <g class="moon-corona" transform="translate(100 100)" style="transform-origin:100px 100px">${corona}</g>
    <circle class="moon-half moon-l" cx="100" cy="100" r="78" fill="url(#mg)"/>
    <g class="moon-face">
      <circle cx="76" cy="120" r="12" fill="#f0c862" opacity=".5"/>
      <circle cx="128" cy="86" r="8" fill="#f0c862" opacity=".45"/>
      <circle cx="120" cy="132" r="6" fill="#f0c862" opacity=".4"/>
    </g>
  </svg>`;
  },
};

/* ============================================================
   4 · CIELO EN CANVAS  (pinceladas, estrellas, partículas…)
   ============================================================ */
const Sky = (() => {
  const cv = $('#sky'); const ctx = cv.getContext('2d');
  let W, H, dpr, t = 0, wind = 0.5;
  let strokes = [], micro = [], halos = [], parts = [], shooters = [];
  let heart = null, finale = false, spin = 0, ripples = [];
  let vortices = [], hills = [];
  let lakeTop = 0, lakeBottom = 0;
  let moonX = 0.8, moonY = 0.17;

  const LT = () => lakeTop, LB = () => lakeBottom;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    build();
  }

  function build() {
    const w = innerWidth, h = innerHeight, area = w * h;
    lakeTop = h * 0.62; lakeBottom = h * 0.80;

    // — vórtices: los grandes remolinos de "La noche estrellada" —
    const m = Math.min(w, h);
    vortices = [
      { x: w * 0.40, y: h * 0.26, r: m * 0.42, dir: 1, str: 1.5 },
      { x: w * 0.64, y: h * 0.17, r: m * 0.30, dir: -1, str: 1.1 },
      { x: w * 0.16, y: h * 0.14, r: m * 0.24, dir: -1, str: 0.8 },
    ];

    // — pinceladas del cielo (curvas, siguen el flujo) —
    strokes = [];
    const n = clamp(Math.round(area / 2400), 140, reduceMotion ? 240 : 680);
    for (let i = 0; i < n; i++) {
      const y = rand(-6, lakeTop);
      const near = y < h * 0.2 ? 1 : 0.7;
      strokes.push({
        x: rand(0, w), y,
        len: rand(20, 56), ph: rand(0, 6.28), sp: rand(0.5, 1.05),
        // paleta Van Gogh: celestes/azules con toques turquesa y crema
        hue: rand(198, 224), sat: rand(58, 86), light: rand(32, 60) * near + 9, alpha: rand(0.2, 0.52),
        cyan: Math.random() < 0.26,
      });
    }

    // — micro estrellas (parpadeo) —
    micro = [];
    const sn = clamp(Math.round(area / 8000), 50, 190);
    for (let i = 0; i < sn; i++) micro.push({ x: rand(0, w), y: rand(0, lakeTop * 0.98), r: rand(0.5, 1.9), ph: rand(0, 6.28), sp: rand(0.6, 2.4), gold: Math.random() < 0.3 });

    // — estrellas grandes con corona en espiral —
    halos = [];
    const hn = clamp(Math.round(w / 150), 6, 15);
    for (let i = 0; i < hn; i++) {
      halos.push({ x: rand(w * 0.04, w * 0.96), y: rand(h * 0.05, lakeTop * 0.82), r: rand(6, 13), ph: rand(0, 6.28), sp: rand(0.5, 1.4), gold: Math.random() < 0.6, dir: Math.random() < 0.5 ? 1 : -1 });
    }

    // — colinas lejanas (silueta pintada) —
    hills = [
      { base: lakeTop, amp: h * 0.06, freq: 2.1, ph: 1.2, col: '#0c1c40' },
      { base: lakeTop, amp: h * 0.09, freq: 1.4, ph: 3.0, col: '#122a52' },
    ];

    // — partículas flotantes —
    parts = [];
    const pn = clamp(Math.round(area / 26000), 14, 56);
    for (let i = 0; i < pn; i++) parts.push(newPart(w, h));
  }

  function newPart(w, h) {
    return { x: rand(0, w), y: rand(0, lakeTop), r: rand(0.6, 2.2), vy: rand(-0.15, -0.5), ph: rand(0, 6.28), a: rand(0.15, 0.5) };
  }

  // campo de flujo con remolinos → pinceladas en espiral
  function flowAngle(x, y, tt) {
    let ang = Math.sin(x * 0.0021 + tt * 0.12) * 1.1 + Math.cos(y * 0.0028 - tt * 0.1) * 1.0;
    for (const v of vortices) {
      const dx = x - v.x, dy = y - v.y, d = Math.hypot(dx, dy);
      const infl = v.str * Math.exp(-d / v.r);
      ang += (Math.atan2(dy, dx) + Math.PI / 2 * v.dir) * infl;
    }
    return ang;
  }

  // pincelada curva (tipo coma)
  function brush(x, y, ang, len, color, alpha, width) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - dx * len * 0.5, y - dy * len * 0.5);
    ctx.quadraticCurveTo(x - dy * len * 0.32, y + dx * len * 0.32, x + dx * len * 0.5, y + dy * len * 0.5);
    ctx.stroke();
  }

  // estrella grande con glow + corona de pinceladas girando
  function drawHalo(s, tw, alphaMul = 1) {
    const c = s.gold ? '255,214,92' : '176,214,255';
    const R = s.r * (0.9 + tw * 0.4);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R * 3.4);
    g.addColorStop(0, `rgba(255,248,220,${0.95 * tw * alphaMul})`);
    g.addColorStop(0.28, `rgba(${c},${0.5 * tw * alphaMul})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, R * 3.4, 0, 6.28); ctx.fill();
    ctx.fillStyle = `rgba(255,251,235,${0.95 * alphaMul})`;
    ctx.beginPath(); ctx.arc(s.x, s.y, R * 0.5, 0, 6.28); ctx.fill();
    for (let ring = 1; ring <= 2; ring++) {
      const rr = R * (0.9 + ring * 0.85), dn = 8 + ring * 4;
      for (let i = 0; i < dn; i++) {
        const a = (i / dn) * 6.28 + t * (0.4 * s.dir) * (ring % 2 ? 1 : -1) + s.ph;
        brush(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr, a + Math.PI / 2 * s.dir, R * 0.7, `rgba(${c},${0.5 * tw * alphaMul})`, 0.5 * tw * alphaMul, 1.7);
      }
    }
  }

  // ---- API pública ----
  function shootingStar() {
    const w = innerWidth;
    shooters.push({ x: rand(w * 0.1, w * 0.9), y: rand(20, lakeTop * 0.4), vx: rand(-9, -14), vy: rand(5, 9), life: 1 });
  }
  function ripple(x, y) { ripples.push({ x, y, r: 6, a: 0.8 }); }
  function setWind(v) { wind = v; }
  function setMoon(x, y) { moonX = x; moonY = y; }
  function starRain() { for (let i = 0; i < 3; i++) setTimeout(shootingStar, i * 180); }

  function heartConstellation(cb) {
    const w = innerWidth, h = innerHeight, cx = w / 2, cy = h * 0.30, s = Math.min(w, h) * 0.16;
    const pts = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(a), 3);
      const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      pts.push({ x: cx + (x / 16) * s, y: cy - (y / 16) * s, born: t + i * 0.05 });
    }
    heart = { pts, start: t, done: false, cb };
  }
  function startFinale() { finale = true; }

  // ---- terreno y lago ----
  function hillTopY(hl, x, w) {
    return hl.base - hl.amp * (0.5 + 0.5 * Math.sin(x / w * Math.PI * hl.freq + hl.ph))
      - hl.amp * 0.25 * Math.sin(x / w * Math.PI * hl.freq * 3 + hl.ph * 2);
  }

  function drawTerrain() {
    const w = innerWidth, h = innerHeight;
    ctx.globalAlpha = 1;

    // colinas lejanas
    for (const hl of hills) {
      ctx.fillStyle = hl.col; ctx.beginPath(); ctx.moveTo(0, lakeTop);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, hillTopY(hl, x, w));
      ctx.lineTo(w, lakeTop); ctx.closePath(); ctx.fill();
    }

    // agua del lago
    const wg = ctx.createLinearGradient(0, lakeTop, 0, lakeBottom);
    wg.addColorStop(0, '#123457'); wg.addColorStop(0.5, '#0d2748'); wg.addColorStop(1, '#071a34');
    ctx.fillStyle = wg; ctx.fillRect(0, lakeTop, w, lakeBottom - lakeTop);

    drawReflections();

    // brillos horizontales del agua
    ctx.globalAlpha = 1;
    for (let yy = lakeTop + 6; yy < lakeBottom; yy += 13) {
      const a = 0.05 + 0.03 * Math.sin(t * 1.5 + yy);
      ctx.strokeStyle = `rgba(150,195,245,${a})`; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, yy + Math.sin(t * 1.6 + x * 0.04 + yy) * 1.6);
      ctx.stroke();
    }

    // orilla en primer plano (zona oscura pintada)
    const fg = ctx.createLinearGradient(0, lakeBottom - 10, 0, h);
    fg.addColorStop(0, '#0b2a1b'); fg.addColorStop(1, '#04120b');
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 14) {
      const y = lakeBottom + Math.sin(x / w * Math.PI * 3 + 0.5) * 8 + Math.sin(x * 0.03) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    // reflejo de luna en la orilla húmeda
    ctx.strokeStyle = 'rgba(255,224,140,0.10)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, lakeBottom + 2);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, lakeBottom + 2 + Math.sin(t + x * 0.05) * 1.5);
    ctx.stroke();
  }

  // reflejo de estrellas y luna en el lago
  function drawReflections() {
    const w = innerWidth, depth = lakeBottom - lakeTop, boost = finale ? 2 : 1;
    // estrellas reflejadas (comprimidas + onduladas)
    const all = micro.concat(halos.map(hs => ({ x: hs.x, y: hs.y, r: hs.r * 0.6, gold: hs.gold, big: true })));
    for (const s of all) {
      if (s.y > lakeTop) continue;
      const ry = lakeTop + (lakeTop - s.y) * 0.34;
      if (ry > lakeBottom) continue;
      const frac = (ry - lakeTop) / depth;
      const wob = Math.sin(t * 2 + ry * 0.09) * (2 + frac * 10);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + s.x));
      const c = s.gold ? '255,214,110' : '190,220,255';
      const a = (s.big ? 0.5 : 0.32) * tw * boost * (1 - frac * 0.6);
      ctx.globalAlpha = 1; ctx.fillStyle = `rgba(${c},${a})`;
      ctx.beginPath(); ctx.ellipse(s.x + wob, ry, (s.r + (s.big ? 1.4 : 0)) * 1.1, (s.r + (s.big ? 1.4 : 0)) * 0.7, 0, 0, 6.28); ctx.fill();
    }
    // columna reflejada de la luna
    const mx = moonX * w;
    for (let yy = lakeTop; yy < lakeBottom; yy += 5) {
      const f = (yy - lakeTop) / depth;
      const off = Math.sin(t * 2.4 + yy * 0.09) * (5 + f * 22);
      const wdt = 30 * (1 - f * 0.45);
      const a = 0.12 * boost * (1 - f);
      ctx.fillStyle = `rgba(255,222,128,${a})`;
      ctx.fillRect(mx + off - wdt / 2, yy, wdt, 3);
    }
  }

  function frame() {
    t += reduceMotion ? 0.006 : 0.014;
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.scale(dpr, dpr);
    const w = innerWidth, h = innerHeight;
    ctx.lineCap = 'round';

    // ===== CIELO (con giro en el final) =====
    ctx.save();
    if (finale) { spin += 0.0016; ctx.translate(w / 2, lakeTop * 0.45); ctx.rotate(Math.sin(spin) * 0.05 + spin * 0.35); ctx.translate(-w / 2, -lakeTop * 0.45); }

    // pinceladas
    for (const s of strokes) {
      const ang = flowAngle(s.x, s.y, t) * s.sp;
      const a = s.alpha * (0.7 + 0.3 * Math.sin(t * 0.8 + s.ph));
      const col = s.cyan ? `hsla(190, 80%, ${s.light + 16}%, ${a})` : `hsla(${s.hue}, ${s.sat}%, ${s.light}%, ${a})`;
      brush(s.x, s.y, ang, s.len, col, a, s.cyan ? 3.4 : 2.9);
    }

    // micro estrellas
    for (const st of micro) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * st.sp + st.ph));
      const R = st.r * (0.8 + tw * 0.6);
      const col = st.gold ? '255,236,150' : '225,240,255';
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(st.x, st.y, R, 0, 6.28);
      ctx.fillStyle = `rgba(${col},${0.5 + tw * 0.5})`; ctx.fill();
    }

    // estrellas grandes con corona
    for (const s of halos) drawHalo(s, 0.55 + 0.45 * Math.abs(Math.sin(t * s.sp + s.ph)));

    ctx.globalAlpha = 1;
    // partículas
    for (const p of parts) {
      p.y += p.vy; p.x += Math.sin(t + p.ph) * 0.3 + wind * 0.4;
      if (p.y < -6 || p.x > w + 6 || p.x < -6) { Object.assign(p, newPart(w, h), { y: lakeTop }); }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28);
      ctx.fillStyle = `rgba(255,244,201,${p.a * (0.6 + 0.4 * Math.sin(t + p.ph))})`; ctx.fill();
    }

    // corazón de estrellas (momento 5)
    if (heart) {
      let done = true;
      for (const p of heart.pts) {
        const age = t - p.born; if (age < 0) { done = false; continue; }
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + p.x);
        const R = clamp(age * 6, 0, 3.6) * (0.8 + tw * 0.4);
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, 6.28);
        ctx.fillStyle = `rgba(255,180,200,${clamp(age, 0, 1)})`; ctx.shadowBlur = 14; ctx.shadowColor = '#ff9db0'; ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (done && !heart.done && t - heart.start > 2.4) { heart.done = true; heart.cb && heart.cb(); }
      if (t - heart.start > 9) heart = null;
    }
    ctx.restore(); // fin giro del cielo

    // ===== TERRENO + LAGO (reflejos) =====
    drawTerrain();

    // ===== estrellas fugaces (por encima de todo) =====
    ctx.globalAlpha = 1;
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i]; s.x += s.vx; s.y += s.vy; s.life -= 0.012;
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 6, s.y - s.vy * 6);
      g.addColorStop(0, `rgba(255,248,220,${s.life})`); g.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.4; ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, 6.28); ctx.fillStyle = `rgba(255,255,240,${s.life})`; ctx.fill();
      if (s.life <= 0) shooters.splice(i, 1);
    }

    // ondas al tocar el cielo
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.r += 2.4; r.a -= 0.02;
      ctx.strokeStyle = `rgba(255,244,201,${r.a})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.28); ctx.stroke();
      if (r.a <= 0) ripples.splice(i, 1);
    }

    ctx.restore();
    if (!reduceMotion && Math.random() < (finale ? 0.08 : 0.004)) shootingStar();
    requestAnimationFrame(frame);
  }

  cv.addEventListener('pointerdown', (e) => {
    ripple(e.clientX, e.clientY); Audio.sfx('twinkle');
    if (Math.random() < 0.4) shootingStar();
  });

  addEventListener('resize', () => { clearTimeout(Sky._rt); Sky._rt = setTimeout(resize, 150); });
  resize(); requestAnimationFrame(frame);

  return { shootingStar, heartConstellation, startFinale, setWind, setMoon, ripple, starRain, lakeTop: LT, lakeBottom: LB };
})();

/* ============================================================
   5 · INTRO  (starfield + máquina de escribir + flor)
   ============================================================ */
const Intro = (() => {
  const cv = $('#introSky'), ctx = cv.getContext('2d');
  let W, H, dpr, stars = [], t = 0, running = true;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    stars = [];
    const n = clamp(Math.round(innerWidth * innerHeight / 6000), 40, 200);
    for (let i = 0; i < n; i++) stars.push({ x: rand(0, innerWidth), y: rand(0, innerHeight), r: rand(0.5, 2), ph: rand(0, 6.28), sp: rand(0.5, 2), born: rand(0, 3) });
  }
  function loop() {
    if (!running) return;
    t += 0.016; ctx.clearRect(0, 0, W, H); ctx.save(); ctx.scale(dpr, dpr);
    for (const s of stars) {
      const app = clamp((t - s.born) / 2, 0, 1);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * s.sp + s.ph));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.7 + tw * 0.5), 0, 6.28);
      ctx.fillStyle = `rgba(240,246,255,${app * tw})`; ctx.fill();
    }
    ctx.restore(); requestAnimationFrame(loop);
  }
  addEventListener('resize', () => { if (running) resize(); });
  resize(); requestAnimationFrame(loop);
  return { stop() { running = false; } };
})();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runIntro() {
  const typed = $('#typed');
  const lines = [
    'Hay días difíciles...',
    '...pero también existen pequeños lugares donde descansar.',
    'Quise crear uno para ti ❤️',
  ];
  await sleep(1400);
  for (const line of lines) {
    typed.textContent = '';
    await typeWriter(typed, line);
    await sleep(1500);
  }
  await sleep(400);
  typed.style.transition = 'opacity 1s'; typed.style.opacity = '0.35';
  // flor
  $('#flowerSvg').innerHTML = flowerSVG();
  const fw = $('#flower'); fw.classList.add('show');
}

async function typeWriter(el, text) {
  const cur = document.createElement('span'); cur.className = 'cursor'; el.appendChild(cur);
  for (const ch of text) {
    cur.insertAdjacentText('beforebegin', ch);
    let d = 46;
    if ('.,'.includes(ch)) d = 260;
    await sleep(d);
  }
  await sleep(500); cur.remove();
}

// flor de la intro: un girasol Van Gogh grande, con tallo y hojas
function flowerSVG() {
  return `<svg viewBox="0 0 160 200" width="100%" height="100%">
    <path d="M80 200 C70 160 74 120 80 76 C86 120 90 160 80 200Z" fill="#2f5e2a"/>
    <path d="M78 150 q-32 -8 -38 -30 q28 -2 38 22Z" fill="#357a42"/>
    <path d="M84 130 q34 -10 40 -32 q-28 -2 -40 26Z" fill="#357a42"/>
    <g class="fpetals" style="transform-origin:80px 62px">
      <g transform="translate(80 62)">${Art.sunflower(0, 0, 34, 0)}</g>
    </g>
  </svg>`;
}

/* ============================================================
   6 · CONSTRUCCIÓN DE LA ESCENA  (paisaje + escondites)
   ============================================================ */
const scene = $('#scene');

// helper para crear un elemento posicionado (wrapper centra, inner anima)
function makeEl({ html, x, y, w, cls = '', z = 3 }) {
  const pos = document.createElement('div');
  pos.className = 'el-pos';
  pos.style.left = x + '%'; pos.style.top = y + '%';
  pos.style.width = w; pos.style.zIndex = z;
  const inner = document.createElement('div');
  inner.className = 'el ' + cls;
  inner.innerHTML = html;
  pos.appendChild(inner);
  scene.appendChild(pos);
  return inner;
}

// paltita oculta ligada a un "host"
const Game = {
  found: 0, total: 10, seq: [], collected: [], avos: [],
};

function placeAvocado(type, x, y, w) {
  const pos = document.createElement('div');
  pos.className = 'avo-pos';
  pos.style.left = x + '%'; pos.style.top = y + '%';
  pos.style.width = w; pos.style.zIndex = 7;
  const a = document.createElement('div');
  a.className = 'avo hidden-avo';
  a.dataset.type = type;
  a.innerHTML = avocadoSVG(type);
  pos.appendChild(a);
  scene.appendChild(pos);
  a.addEventListener('pointerdown', (e) => { e.stopPropagation(); collectAvocado(a); });
  Game.avos.push(a);
  return a;
}

function revealAvocado(a) {
  if (a.dataset.revealed) return;
  a.dataset.revealed = '1';
  a.classList.remove('hidden-avo');
  a.classList.add('peek');
  Audio.sfx('chime');
  spawnSparkles(a);
}

let hintShownFor = new Set();

function buildScene() {
  scene.innerHTML = '';
  injectPaintFilter();
  const vg = reduceMotion ? '' : 'vg';           // textura pictórica (Van Gogh)
  Sky.setMoon(0.80, 0.16);                        // para el reflejo en el lago

  /* --- LUNA (host "moon"; se abre en el momento 7) --- */
  const moon = makeEl({ html: `<div class="moon-glow"></div>` + Art.moon(), x: 80, y: 16, w: 'clamp(130px, 24vw, 230px)', z: 2, cls: 'moon-el bob' });
  moon.id = 'moonEl';
  const avoMoon = placeAvocado('moon', 88, 26, 'clamp(40px,8vw,66px)');
  hostReveal(moon, avoMoon, () => { moon.classList.add('nudged'); pulseMoon(moon); });

  /* --- estrella grande (host "star") --- */
  const bigStar = makeEl({ html: bigStarSVG(), x: 20, y: 14, w: 'clamp(42px,8vw,74px)', z: 2, cls: 'bob' });
  const avoStar = placeAvocado('star', 27, 22, 'clamp(40px,8vw,64px)');
  hostReveal(bigStar, avoStar, () => { bigStar.classList.add('nudged'); Sky.shootingStar(); });

  /* --- nubes (2 hosts + decorativas) --- */
  const cloud1 = makeEl({ html: Art.cloud(), x: 42, y: 24, w: 'clamp(150px,30vw,280px)', z: 3 });
  const avoHappy = placeAvocado('happy', 42, 35, 'clamp(44px,9vw,70px)');
  hostReveal(cloud1, avoHappy, () => { cloud1.style.transition = 'transform 1.2s var(--ease)'; cloud1.style.transform = 'translateX(-70px)'; whisper(); });

  const cloud2 = makeEl({ html: Art.cloud(), x: 64, y: 33, w: 'clamp(130px,26vw,240px)', z: 3 });
  const avoSurprise = placeAvocado('surprise', 64, 45, 'clamp(42px,9vw,66px)');
  hostReveal(cloud2, avoSurprise, () => { cloud2.style.transition = 'transform 1.2s var(--ease)'; cloud2.style.transform = 'translateX(60px)'; });

  addDriftCloud(18, '200px', 62);
  addDriftCloud(46, '150px', 80);

  /* --- casita junto al lago (host "coffee": enciende la ventana) --- */
  const house = makeEl({ html: Art.house(), x: 30, y: 55, w: 'clamp(78px,14vw,130px)', z: 4, cls: vg });
  const avoCoffee = placeAvocado('coffee', 30, 48, 'clamp(40px,8vw,60px)');
  hostReveal(house, avoCoffee, () => { house.classList.add('nudged'); $$('.win', house).forEach(w => w.style.filter = 'drop-shadow(0 0 12px #f6d365)'); });

  /* --- ciprés en llama (host "read") --- */
  const cyp = makeEl({ html: Art.cypress(), x: 9, y: 62, w: 'clamp(80px,14vw,140px)', z: 7, cls: 'sway ' + vg });
  const avoRead = placeAvocado('read', 15, 72, 'clamp(46px,9vw,72px)');
  hostReveal(cyp, avoRead, () => { cyp.classList.add('nudged'); });

  /* --- árbol frondoso (host "hat") --- */
  const tree = makeEl({ html: Art.tree(), x: 89, y: 68, w: 'clamp(120px,22vw,210px)', z: 7, cls: 'sway2 ' + vg });
  const avoHat = placeAvocado('hat', 89, 58, 'clamp(44px,9vw,68px)');
  hostReveal(tree, avoHat, () => { tree.classList.add('nudged'); shakeLeaves(tree); });

  /* --- girasoles (host "shy": las cabezas giran) --- */
  const sunflowers = makeEl({ html: Art.sunflowers(), x: 20, y: 88, w: 'clamp(130px,24vw,220px)', z: 8, cls: vg });
  const avoShy = placeAvocado('shy', 20, 79, 'clamp(42px,8vw,64px)');
  hostReveal(sunflowers, avoShy, () => { sunflowers.classList.add('nudged'); $$('.sunhead', sunflowers).forEach(s => s.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 1400, easing: 'ease-in-out' })); });
  // girasoles decorativos a la derecha
  makeEl({ html: Art.sunflowers(), x: 82, y: 90, w: 'clamp(120px,22vw,200px)', z: 8, cls: vg });

  /* --- arbusto (host "scarf") --- */
  const bush = makeEl({ html: Art.bush(), x: 48, y: 90, w: 'clamp(110px,20vw,190px)', z: 8, cls: vg });
  const avoScarf = placeAvocado('scarf', 48, 82, 'clamp(44px,9vw,68px)');
  hostReveal(bush, avoScarf, () => { bush.classList.add('nudged'); });

  /* --- piedra (host "sleep": se levanta) --- */
  const rock = makeEl({ html: Art.rock(), x: 66, y: 92, w: 'clamp(90px,16vw,150px)', z: 8, cls: vg });
  const avoSleep = placeAvocado('sleep', 66, 85, 'clamp(46px,9vw,70px)');
  hostReveal(rock, avoSleep, () => { rock.classList.add('lifted'); });

  /* --- mariposas y pájaros decorativos --- */
  addButterfly(35, 44); addButterfly(72, 28);
  addBirds();

  enableParallax();
}

// filtro SVG que da textura de pincel (Van Gogh) a los elementos del paisaje
function injectPaintFilter() {
  if (reduceMotion || document.getElementById('vgpaint')) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0';
  svg.innerHTML = `<defs><filter id="vgpaint" x="-12%" y="-12%" width="124%" height="124%">
    <feTurbulence type="fractalNoise" baseFrequency="0.013 0.021" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>
  </filter></defs>`;
  document.body.appendChild(svg);
}

// vincula un host: primer toque revela la paltita
function hostReveal(host, avo, reaction) {
  host.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    reaction && reaction();
    Audio.sfx('soft');
    if (avo && !avo.dataset.collected) revealAvocado(avo);
  });
}

function bigStarSVG() {
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><g class="glint">
    <path d="M50 6 L59 40 L94 42 L64 62 L74 96 L50 74 L26 96 L36 62 L6 42 L41 40Z" fill="#fff4c9" stroke="#f6d365" stroke-width="2"/>
  </g></svg>`;
}

// wrapper absoluto para elementos móviles decorativos (sin centrado -50%)
function absMover({ html, top, left, w, z, cls = '', anim = '' }) {
  const pos = document.createElement('div');
  pos.className = 'el-pos ' + cls;
  pos.style.position = 'absolute'; pos.style.transform = 'none';
  if (left != null) pos.style.left = left + '%';
  pos.style.top = top + '%'; pos.style.width = w; pos.style.zIndex = z;
  if (anim) pos.style.animation = anim;
  const inner = document.createElement('div');
  inner.className = 'el ' + cls; inner.innerHTML = html;
  pos.appendChild(inner); scene.appendChild(pos);
  return { pos, inner };
}

function addDriftCloud(y, w, dur) {
  const { pos, inner } = absMover({ html: Art.cloud(), top: y, w: `clamp(120px, 26vw, ${w})`, z: 3, anim: `drift ${dur}s linear infinite` });
  pos.style.opacity = '.8';
  inner.addEventListener('pointerdown', (e) => { e.stopPropagation(); Audio.sfx('soft'); whisper(); });
}

function addButterfly(x, y) {
  const { inner } = absMover({ html: Art.butterfly(), top: y, left: x, w: 'clamp(30px,6vw,50px)', z: 7, cls: 'butterfly', anim: `flit ${rand(14, 22)}s ease-in-out infinite` });
  inner.addEventListener('pointerdown', (e) => { e.stopPropagation(); Audio.sfx('twinkle'); spawnSparkles(inner); });
}

function addBirds() {
  absMover({ html: `<div style="display:flex;gap:16px">${Art.bird()}${Art.bird()}${Art.bird()}</div>`, top: 18, w: '120px', z: 3, cls: 'bird-flock', anim: 'drift 46s linear infinite' });
}

let parallaxOn = false;
function enableParallax() {
  if (parallaxOn || reduceMotion) return; parallaxOn = true;
  addEventListener('pointermove', (e) => {
    const cx = (e.clientX / innerWidth - 0.5), cy = (e.clientY / innerHeight - 0.5);
    // solo wrappers estáticos (los móviles llevan animación propia)
    $$('.el-pos', scene).forEach(el => {
      if (el.style.animation && el.style.animation !== 'none') return;
      const z = +el.style.zIndex || 3; const depth = (6 - z) * 2.4;
      el.style.marginLeft = (cx * depth) + 'px';
      el.style.marginTop = (cy * depth * 0.6) + 'px';
    });
  }, { passive: true });
}

/* efectos varios */
function spawnSparkles(anchor) {
  const r = anchor.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const box = document.createElement('div'); box.className = 'sparkle-burst';
  box.style.left = cx + 'px'; box.style.top = cy + 'px';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '160'); svg.setAttribute('height', '160'); svg.setAttribute('viewBox', '-80 -80 160 160');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2, dist = rand(30, 62);
    const s = document.createElementNS(SVGNS, 'circle');
    s.setAttribute('r', rand(1.5, 3.5)); s.setAttribute('fill', pick(['#fff4c9', '#f6d365', '#ffb347']));
    s.setAttribute('cx', 0); s.setAttribute('cy', 0);
    s.animate([
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px)`, opacity: 0 },
    ], { duration: rand(700, 1100), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    svg.appendChild(s);
  }
  box.appendChild(svg); document.body.appendChild(box);
  setTimeout(() => box.remove(), 1200);
}

function pulseMoon(moon) {
  moon.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: 1400, easing: 'ease-in-out' });
}
function shakeLeaves(tree) {
  const s = tree.querySelector('svg');
  s.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }, { transform: 'rotate(0)' }], { duration: 700 });
}

let whisperTimer;
function whisper(text) {
  const el = $('#whisper'); el.textContent = text || pick(WHISPERS);
  el.classList.add('show'); clearTimeout(whisperTimer);
  whisperTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

/* ============================================================
   7 · LÓGICA DEL JUEGO  (colectar + recompensas + momentos)
   ============================================================ */
let msgPool = [];
function nextMessage() {
  if (!msgPool.length) msgPool = [...MESSAGES].sort(() => Math.random() - 0.5);
  return msgPool.pop();
}
let gifIdx = 0;
function nextGif() { const g = GIFS[gifIdx % GIFS.length]; gifIdx++; return g; }

function collectAvocado(a) {
  if (a.dataset.collected) return;
  a.classList.remove('teasing');
  if (!a.dataset.revealed) revealAvocado(a); // por si acaso
  a.dataset.collected = '1';
  a.classList.remove('peek'); a.classList.add('found');
  Audio.sfx('discover');
  spawnSparkles(a);
  Game.found++;
  Game.collected.push(a.dataset.type);
  Hints.mark();               // reinicia el reloj de pistas
  updateCounter();

  // vuela hacia el contador y desaparece
  setTimeout(() => flyToCounter(a), 700);

  // recompensa + posible momento especial
  setTimeout(() => {
    const special = specialMoment(Game.found);
    if (!special) showReward();
  }, 1250);
}

function updateCounter() {
  $('#found').textContent = Game.found;
  $('#counterFill').style.width = (Game.found / Game.total * 100) + '%';
  const c = $('#counter'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
}

function flyToCounter(a) {
  const from = a.getBoundingClientRect();
  const to = $('#counter').getBoundingClientRect();
  const clone = a.cloneNode(true);
  clone.style.position = 'fixed'; clone.style.left = from.left + 'px'; clone.style.top = from.top + 'px';
  clone.style.width = from.width + 'px'; clone.style.margin = '0'; clone.style.zIndex = 30; clone.style.transform = 'none';
  clone.classList.remove('found');
  document.body.appendChild(clone);
  a.style.display = 'none';
  clone.animate([
    { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', opacity: 1 },
    { left: to.left + 20 + 'px', top: to.top + 8 + 'px', width: '24px', opacity: 0.2 },
  ], { duration: 900, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  setTimeout(() => clone.remove(), 950);
}

/* ---- tarjeta de recompensa (blur + gif + frase) ---- */
function showReward(customMsg) {
  blurPainting(true);
  const ov = $('#overlay');
  ov.innerHTML = `
    <div class="card" role="dialog" aria-label="Mensaje">
      <div class="gif-frame"><img src="${nextGif()}" alt="bubu y dudu" loading="eager"/></div>
      <p class="romance">${customMsg || nextMessage()}</p>
      <p class="sub">🥑 ${Game.found} / 10</p>
      <button class="close">seguir explorando</button>
    </div>`;
  ov.classList.add('show');
  ov.querySelector('.close').onclick = closeOverlay;
  ov.onclick = (e) => { if (e.target === ov) closeOverlay(); };
}
function closeOverlay(cb) {
  const ov = $('#overlay'); ov.classList.remove('show'); blurPainting(false);
  setTimeout(() => { ov.innerHTML = ''; ov.onclick = null; if (typeof cb === 'function') cb(); }, 700);
}
function blurPainting(on) { $('#painting').classList.toggle('blurred', on); }

/* ============================================================
   8 · MOMENTOS ESPECIALES
   ============================================================ */
function specialMoment(n) {
  if (n === 3) { momentDialog(); return true; }
  if (n === 5) { momentHeart(); return true; }
  if (n === 7) { momentMoonLetter(); return true; }
  if (n === 9) { momentParade(); return true; }
  if (n === 10) { momentFinale(); return true; }
  return false;
}

// tras la 3ª: conversación flotante
async function momentDialog() {
  blurPainting(true);
  const ov = $('#overlay');
  ov.innerHTML = `<div class="dialog">
      <p class="line q">¿Por qué eres tan bonita?</p>
      <p class="line a">Porque me ves con ojos de amor ❤️</p>
    </div>`;
  ov.classList.add('show');
  const [q, aLine] = $$('.line', ov);
  await sleep(500); q.classList.add('on'); Audio.sfx('soft');
  await sleep(2600); aLine.classList.add('on'); Audio.sfx('chime');
  await sleep(3400);
  q.style.opacity = '0'; aLine.style.opacity = '0';
  await sleep(1200);
  closeOverlay(() => showReward('Sigue buscando, cada rincón guarda algo para ti ✨'));
}

// tras la 5ª: estrellas forman un corazón
async function momentHeart() {
  whisper('mira al cielo… 🌌');
  Sky.heartConstellation(() => {});
  await sleep(3200);
  showFloatingLetter('El cielo tenía algo que decir', ['Creo que hasta el cielo quería decirte algo.'], null, () => showReward());
}

// tras la 7ª: la luna se abre y muestra una carta
async function momentMoonLetter() {
  const moon = $('#moonEl');
  moon.classList.add('opening');
  const l = moon.querySelector('.moon-l'); const face = moon.querySelector('.moon-face');
  if (l) l.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-30px)' }], { duration: 1400, fill: 'forwards', easing: 'ease-in-out' });
  if (face) face.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800, fill: 'forwards' });
  pulseMoon(moon); Audio.sfx('chime');
  await sleep(1600);
  showFloatingLetter('Una carta dentro de la luna 🌙', [
    'Tómate un descanso.',
    'El mundo puede esperar un ratito.',
  ], null, () => { if (l) l.animate([{ transform: 'translateX(-30px)' }, { transform: 'translateX(0)' }], { duration: 1200, fill: 'forwards' }); if (face) face.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, fill: 'forwards' }); showReward(); });
}

// tras la 9ª: todas las paltitas encontradas saludan
async function momentParade() {
  blurPainting(true);
  const ov = $('#overlay');
  const avos = Game.collected.map(t => `<div class="pavo">${avocadoSVG(t)}</div>`).join('');
  ov.innerHTML = `<div class="card letter">
      <p class="kicker">todas quisieron saludarte</p>
      <div class="parade-row">${avos}</div>
      <p class="romance">Nos hiciste muy felices encontrándonos 🥑</p>
      <button class="close">falta solo una…</button>
    </div>`;
  // fila de paltitas animadas dentro de la carta
  const style = document.createElement('style');
  ov.querySelector('.parade-row').style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:6px 0 18px';
  $$('.parade-row .pavo', ov).forEach((p, i) => { p.style.width = 'clamp(40px,10vw,58px)'; p.style.animation = `wave-avo 1.4s ${i * 0.12}s ease-in-out infinite`; });
  ov.classList.add('show');
  Audio.sfx('discover');
  ov.querySelector('.close').onclick = () => closeOverlay(() => showReward('La última te espera… ya casi ❤️'));
}

// carta flotante genérica (para momentos 5 y 7)
function showFloatingLetter(kicker, paras, sign, cb) {
  blurPainting(true);
  const ov = $('#overlay');
  ov.innerHTML = `<div class="card letter">
      <p class="kicker">${kicker}</p>
      <div class="letter-body">${paras.map(p => `<p>${p}</p>`).join('')}</div>
      ${sign ? `<p class="sign">${sign}</p>` : ''}
      <button class="close">continuar</button>
    </div>`;
  ov.classList.add('show');
  ov.querySelector('.close').onclick = () => closeOverlay(cb);
}

/* ============================================================
   9 · FINAL
   ============================================================ */
async function momentFinale() {
  Hints.stop();
  // flash + el cuadro cobra vida
  const flash = document.createElement('div'); flash.className = 'final-flash go'; document.body.appendChild(flash);
  Sky.startFinale(); Sky.starRain(); Sky.setWind(1.2);
  Audio.sfx('discover');
  $('#hint').classList.remove('show');

  // desfile de paltitas corriendo y reuniéndose abajo
  const parade = document.createElement('div'); parade.className = 'avo-parade';
  parade.innerHTML = Game.collected.map(t => `<div class="pavo">${avocadoSVG(t)}</div>`).join('');
  document.body.appendChild(parade);
  requestAnimationFrame(() => parade.classList.add('show'));

  // lluvia de estrellas continua
  const rain = setInterval(() => Sky.shootingStar(), 500);

  await sleep(2600);
  flash.remove();

  blurPainting(true);
  const ov = $('#overlay');
  const gifRow = [GIFS[0], GIFS[4], GIFS[2], GIFS[5]].map(g => `<img src="${g}" alt="abrazo"/>`).join('');
  ov.innerHTML = `<div class="card letter finale-card" role="dialog" aria-label="Carta final">
      <div class="gif-row">${gifRow}</div>
      <p class="title">Amor,</p>
      <div class="letter-body">
        <p>Si llegaste hasta aquí... es porque recorriste este pequeño mundo que preparé para ti.</p>
        <p>Quería regalarte unos minutos donde pudieras olvidarte del cansancio.</p>
        <p>Así como buscaste cada palta escondida... espero que nunca olvides que incluso en los días difíciles siempre existen pequeños motivos para sonreír.</p>
        <p>Si algún día sientes que todo pesa demasiado... recuerda que siempre tendrás un lugar seguro conmigo.</p>
        <p>Y si alguien me preguntara... <em>¿por qué eres tan bonita?</em></p>
        <p>Respondería: <strong>porque la veo con los ojos del amor.</strong></p>
        <p>Te amo muchísimo ❤️</p>
      </div>
      <p class="sign">— Wil</p>
      <button class="close">volver a mi lado 🌙</button>
    </div>`;
  ov.classList.add('show');
  ov.querySelector('.close').onclick = () => { closeOverlay(); whisper('gracias por sonreír 💛'); };
}

/* ============================================================
   9.5 · PISTAS  (una paltita se asoma a mirar cada cierto tiempo)
   ============================================================ */
const Hints = (() => {
  let last = 0, timer = null, active = false;
  function mark() { last = Date.now(); }
  function hidden() { return Game.avos.filter(a => !a.dataset.revealed && !a.dataset.collected); }
  function tease() {
    const pool = hidden(); if (!pool.length) return;
    const a = pick(pool);
    a.classList.add('teasing');
    // bracito que saluda asomando por el borde
    const arm = document.createElementNS(SVGNS, 'svg');
    arm.setAttribute('viewBox', '0 0 30 30'); arm.setAttribute('class', 'tease-arm');
    arm.innerHTML = `<path d="M8 26 C4 16 8 6 16 6 C22 6 24 12 22 16" stroke="#5f8f37" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="22" cy="15" r="5" fill="#6f9e3f"/>`;
    arm.style.left = '62%'; arm.style.top = '6%';
    a.parentElement.appendChild(arm);
    Audio.sfx('soft');
    setTimeout(() => { a.classList.remove('teasing'); arm.remove(); }, 2100);
    mark();
  }
  function loop() {
    if (!active) return;
    const overlayOpen = $('#overlay').classList.contains('show');
    const stuck = Date.now() - last;
    // si lleva un rato sin encontrar nada y no hay carta abierta → pista
    if (!overlayOpen && stuck > 13000 && hidden().length) tease();
  }
  return {
    mark,
    start() { active = true; mark(); clearInterval(timer); timer = setInterval(loop, 4000); },
    stop() { active = false; clearInterval(timer); },
  };
})();

/* ============================================================
   9.6 · INSTRUCCIONES  (cómo explorar el cuadro)
   ============================================================ */
function showInstructions(cb) {
  blurPainting(true);
  const ov = $('#overlay');
  ov.innerHTML = `<div class="card letter" role="dialog" aria-label="Cómo jugar">
      <p class="kicker">un pequeño cuadro para ti</p>
      <p class="title" style="font-family:var(--serif);font-size:clamp(1.5rem,5.5vw,2rem);color:var(--gold);margin-bottom:14px">Cómo explorar</p>
      <ul class="howto">
        <li><span class="ic">👆</span><span>Toca <b>todo</b> lo que veas: nubes, árboles, girasoles, la luna, las estrellas… todo cobra vida.</span></li>
        <li><span class="ic">🥑</span><span>Hay <b>10 paltitas escondidas</b> detrás de las cosas. Mueve o toca los elementos para descubrirlas.</span></li>
        <li><span class="ic">👋</span><span>Si te atascas, una paltita <b>asomará a saludarte</b> para darte una pistita.</span></li>
        <li><span class="ic">🎵</span><span>Arriba a la derecha puedes <b>activar o silenciar</b> la música cuando quieras.</span></li>
      </ul>
      <button class="close">entrar al cuadro ✨</button>
    </div>`;
  ov.classList.add('show');
  ov.querySelector('.close').onclick = () => closeOverlay(cb);
}

/* ============================================================
   10 · ARRANQUE
   ============================================================ */
function startExperience() {
  Intro.stop();
  $('#intro').classList.add('gone');
  buildScene();
  Sky.setWind(0.5);
  // primero: breve instrucción de cómo jugar
  setTimeout(() => showInstructions(() => {
    $('#hud').classList.add('show'); $('#hud').setAttribute('aria-hidden', 'false');
    setTimeout(() => { $('#hint').classList.add('show'); $('#hint').setAttribute('aria-hidden', 'false'); }, 800);
    setTimeout(() => $('#hint').classList.remove('show'), 9000);
    Hints.start();
  }), 900);
}

// botón de sonido
$('#soundBtn').addEventListener('click', () => {
  const on = Audio.toggle();
  const btn = $('#soundBtn');
  btn.classList.toggle('muted', !on);
  btn.classList.toggle('playing', on);
});

// flor → comienza todo
function armFlower() {
  const f = $('#flowerSvg');
  const go = () => {
    Audio.ensureOn(); // primer gesto: activa audio
    $('#soundBtn').classList.add('playing');
    startExperience();
  };
  f.addEventListener('pointerdown', go, { once: true });
  f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') go(); });
}

// añade keyframe de aleteo/flit dinámico
const kf = document.createElement('style');
kf.textContent = `
@keyframes flit { 0%,100%{transform:translate(0,0) rotate(-4deg)} 25%{transform:translate(30px,-20px) rotate(6deg)} 50%{transform:translate(-10px,-40px) rotate(-3deg)} 75%{transform:translate(-30px,-14px) rotate(5deg)} }
.butterfly .bwing-l{transform-origin:30px 25px;animation:flap .28s ease-in-out infinite}
.butterfly .bwing-r{transform-origin:30px 25px;animation:flap .28s ease-in-out infinite reverse}
@keyframes flap{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.4)}}
.bird .wing-a,.bird .wing-b{transform-origin:30px 18px;animation:flapb .5s ease-in-out infinite}
@keyframes flapb{0%,100%{transform:rotate(0)}50%{transform:rotate(-18deg)}}
.moon-el .moon-glow{position:absolute;inset:-40%;border-radius:50%;background:radial-gradient(circle,rgba(255,236,150,.5),transparent 62%);animation:breathe 5s ease-in-out infinite;pointer-events:none}
.fpetals{animation:floaty 4s ease-in-out infinite}
`;
document.head.appendChild(kf);

// GO
runIntro();
armFlower();
