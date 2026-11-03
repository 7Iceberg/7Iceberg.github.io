const Son = (() => {
  const CLE = 'veylan.son';
  const DOSSIER = 'assets/son/';
  const FONDU = 1.5;
  const PISTES = { accueil: 'theme', ervane: 'ervane', orsane: 'orsane', kaldum: 'kaldum', donjon: 'donjon', combat: 'combat', boss: 'boss', nuit: 'nuit' };
  const DISPONIBLES = new Set([]);
  const DEFAUT = { actif: true, musique: 60, bruitages: 80 };

  let ctx = null, maitre = null, gainMusique = null, gainBruits = null;
  let pret = false;
  let pisteVoulue = null;
  let enCours = null;
  const buffers = {};
  const manquantes = {};
  const chargements = {};

  const reglages = (() => {
    try { return Object.assign({}, DEFAUT, JSON.parse(localStorage.getItem(CLE) || '{}')); } catch (e) { return Object.assign({}, DEFAUT); }
  })();
  for (const k of ['musique', 'bruitages']) reglages[k] = Math.max(0, Math.min(100, Number(reglages[k]) || 0));
  reglages.actif = reglages.actif !== false;

  function enregistrer() { try { localStorage.setItem(CLE, JSON.stringify(reglages)); } catch (e) {   } }

  function contexte() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    maitre = ctx.createGain(); maitre.connect(ctx.destination);
    gainMusique = ctx.createGain(); gainMusique.connect(maitre);
    gainBruits = ctx.createGain(); gainBruits.connect(maitre);
    appliquerVolumes();
    return ctx;
  }

  function appliquerVolumes() {
    if (!ctx) return;
    maitre.gain.value = reglages.actif ? 1 : 0;
    gainMusique.gain.value = reglages.musique / 100;
    gainBruits.gain.value = reglages.bruitages / 100;
  }

  function deverrouiller() {
    const c = contexte();
    if (!c) return false;
    if (c.state === 'suspended') c.resume().catch(() => {});
    pret = true;
    if (pisteVoulue) jouerPiste(pisteVoulue);
    return true;
  }
  if (typeof document !== 'undefined') {
    const premier = () => deverrouiller();
    document.addEventListener('pointerdown', premier, { once: true, passive: true });
    document.addEventListener('keydown', premier, { once: true });
  }

  function regler(nom, valeur) {
    if (nom === 'actif') reglages.actif = !!valeur;
    else if (nom === 'musique' || nom === 'bruitages') reglages[nom] = Math.max(0, Math.min(100, Math.round(Number(valeur) || 0)));
    else return;
    enregistrer();
    appliquerVolumes();
    if (nom === 'actif' && reglages.actif && pisteVoulue && pret) jouerPiste(pisteVoulue);
  }

  function note(c, sortie, { type = 'sine', f0 = 440, f1 = null, t = 0.15, v = 0.4, delai = 0, attaque = 0.005 } = {}) {
    const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + delai;
    o.type = type; o.frequency.setValueAtTime(f0, t0);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + t);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + attaque);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(g); g.connect(sortie);
    o.start(t0); o.stop(t0 + t + 0.02);
  }
  function souffle(c, sortie, { t = 0.12, v = 0.5, freq = 1200, q = 0.7, delai = 0, type = 'bandpass' } = {}) {
    const n = Math.floor(c.sampleRate * t), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); const t0 = c.currentTime + delai;
    g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(f); f.connect(g); g.connect(sortie);
    s.start(t0); s.stop(t0 + t + 0.02);
  }
  const BRUITS = {
    toucher: (c, o) => note(c, o, { type: 'triangle', f0: 880, f1: 660, t: 0.06, v: 0.12 }),
    tour: (c, o) => { note(c, o, { type: 'sine', f0: 523, t: 0.12, v: 0.2 }); note(c, o, { type: 'sine', f0: 784, t: 0.18, v: 0.2, delai: 0.08 }); },
    coup: (c, o) => { souffle(c, o, { t: 0.14, v: 0.6, freq: 700, q: 0.8 }); note(c, o, { type: 'square', f0: 160, f1: 60, t: 0.14, v: 0.25 }); },
    sort: (c, o) => { note(c, o, { type: 'sawtooth', f0: 300, f1: 1400, t: 0.22, v: 0.15 }); souffle(c, o, { t: 0.25, v: 0.2, freq: 2400, q: 1.5, delai: 0.05 }); },
    soin: (c, o) => { note(c, o, { type: 'sine', f0: 660, f1: 990, t: 0.25, v: 0.2 }); note(c, o, { type: 'sine', f0: 990, f1: 1320, t: 0.3, v: 0.15, delai: 0.1 }); },
    butin: (c, o) => { note(c, o, { type: 'triangle', f0: 1046, t: 0.1, v: 0.18 }); note(c, o, { type: 'triangle', f0: 1568, t: 0.16, v: 0.18, delai: 0.07 }); },
    niveau: (c, o) => [523, 659, 784, 1046].forEach((f, i) => note(c, o, { type: 'triangle', f0: f, t: 0.25, v: 0.22, delai: i * 0.1 })),
    victoire: (c, o) => [392, 523, 659, 784, 1046].forEach((f, i) => note(c, o, { type: 'triangle', f0: f, t: i === 4 ? 0.7 : 0.22, v: 0.24, delai: i * 0.12 })),
    defaite: (c, o) => [440, 415, 370, 311].forEach((f, i) => note(c, o, { type: 'sawtooth', f0: f, t: i === 3 ? 0.9 : 0.3, v: 0.14, delai: i * 0.22 })),
  };
  function jouer(nom) {
    if (!reglages.actif || !pret || !ctx || !BRUITS[nom]) return false;
    try { BRUITS[nom](ctx, gainBruits); } catch (e) { return false; }
    return true;
  }

  function format() {
    if (typeof Audio === 'undefined') return null;
    const a = document.createElement('audio');
    if (a.canPlayType('audio/ogg; codecs="vorbis"')) return 'ogg';
    if (a.canPlayType('audio/mp4; codecs="mp4a.40.2"')) return 'm4a';
    return null;
  }
  function charger(cle) {
    if (buffers[cle]) return Promise.resolve(buffers[cle]);
    if (!DISPONIBLES.has(cle)) manquantes[cle] = true;
    if (manquantes[cle]) return Promise.resolve(null);
    if (chargements[cle]) return chargements[cle];
    const ext = format();
    if (!ext || !PISTES[cle] || typeof fetch !== 'function') { manquantes[cle] = true; return Promise.resolve(null); }
    chargements[cle] = fetch(DOSSIER + PISTES[cle] + '.' + ext)
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .then(data => (data ? ctx.decodeAudioData(data) : null))
      .then(b => { if (b) buffers[cle] = b; else manquantes[cle] = true; return b; })
      .catch(() => { manquantes[cle] = true; return null; });
    return chargements[cle];
  }
  function arreter(fondu) {
    if (!enCours) return;
    const e = enCours; enCours = null;
    const t = ctx.currentTime;
    e.gain.gain.cancelScheduledValues(t);
    e.gain.gain.setValueAtTime(e.gain.gain.value, t);
    e.gain.gain.linearRampToValueAtTime(0.0001, t + (fondu ? FONDU : 0.05));
    try { e.source.stop(t + (fondu ? FONDU : 0.05) + 0.05); } catch (err) {   }
  }
  function jouerPiste(cle) {
    if (!ctx || !pret || !reglages.actif) return;
    if (enCours && enCours.cle === cle) return;
    charger(cle).then(b => {
      if (pisteVoulue !== cle) return;
      if (!b) { arreter(true); return; }
      if (enCours && enCours.cle === cle) return;
      arreter(true);
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
      const g = ctx.createGain(); const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + FONDU);
      s.connect(g); g.connect(gainMusique); s.start(t);
      enCours = { cle, source: s, gain: g };
    });
  }
  function musique(cle) {
    if (!PISTES[cle]) cle = null;
    pisteVoulue = cle;
    if (!cle) { if (ctx) arreter(true); return; }
    if (pret) jouerPiste(cle);
  }

  return {
    PISTES, DISPONIBLES, BRUITS: Object.keys(BRUITS), DOSSIER,
    reglages, regler, jouer, musique, deverrouiller, contexte,
    actif: () => reglages.actif, pret: () => pret,
    piste: () => (enCours ? enCours.cle : null), voulue: () => pisteVoulue, manquante: cle => !!manquantes[cle],
  };
})();
