const Son = (() => {
  const CLE = 'veylan.son';
  const DOSSIER = 'assets/son/';
  const FONDU = 1.5;
  const PISTES = { accueil: 'theme', ervane: 'ervane', orsane: 'orsane', kaldum: 'kaldum', donjon: 'donjon', combat: 'combat', boss: 'boss', nuit: 'nuit' };
  const DISPONIBLES = new Set(['accueil', 'ervane', 'combat', 'orsane', 'boss', 'donjon', 'kaldum', 'nuit']);
  const BOUCLES = { accueil: { pause: 3 }, ervane: { pause: 1.5 }, orsane: { pause: 1.5 }, donjon: { pause: 1.5 }, kaldum: { pause: 1.5 }, nuit: { pause: 2 } };
  const JINGLES = { victoire: 'jingle_victoire', defaite: 'jingle_defaite', niveau: 'jingle_niveau', quete: 'jingle_quete', succes: 'jingle_succes' };
  const JINGLES_DISPONIBLES = new Set(['victoire', 'defaite', 'niveau', 'quete', 'succes']);
  const ATTENUES = { victoire: 1.6, defaite: 1.8, niveau: 1.2, quete: 1.2, succes: 1.4 };
  const DEFAUT = { actif: true, musique: 50, bruitages: 80, v: 2 };
  const NIVEAUX = { theme: 0.72, ervane: 0.71, orsane: 0.71, kaldum: 0.71, donjon: 0.71, combat: 0.72, boss: 0.71, nuit: 1 };
  const NIVEAUX_JINGLES = { victoire: 0.53, defaite: 0.57, niveau: 0.59, quete: 0.59, succes: 0.56 };

  let ctx = null, maitre = null, gainMusique = null, gainAttenue = null, gainBruits = null;
  let pret = false;
  let pisteVoulue = null;
  let enCours = null;
  const manquantes = {};
  let attenuation = 1;
  let finAttenuation = 0;

  const reglages = (() => {
    try {
      const lu = JSON.parse(localStorage.getItem(CLE) || '{}') || {};
      if ((lu.v || 1) < 2 && lu.musique === 60) delete lu.musique;
      return Object.assign({}, DEFAUT, lu, { v: 2 });
    } catch (e) { return Object.assign({}, DEFAUT); }
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
    gainAttenue = ctx.createGain(); gainAttenue.connect(gainMusique);
    gainBruits = ctx.createGain(); gainBruits.connect(maitre);
    appliquerVolumes();
    return ctx;
  }

  function appliquerVolumes() {
    if (!ctx) return;
    maitre.gain.value = reglages.actif ? 1 : 0;
    gainMusique.gain.value = reglages.musique / 100;
    gainBruits.gain.value = reglages.bruitages / 100;
    if (enCours && enCours.l.direct) volumeDirect(enCours);
  }

  function deverrouiller() {
    const c = contexte();
    if (!c) return false;
    if (c.state === 'suspended') c.resume().catch(() => {});
    pret = true;
    deverrouillerLecteurs();
    chargerJingles();
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
    quete: (c, o) => { [587, 784, 988].forEach((f, i) => note(c, o, { type: 'triangle', f0: f, t: i === 2 ? 0.5 : 0.16, v: 0.2, delai: i * 0.09 })); note(c, o, { type: 'sine', f0: 1976, t: 0.6, v: 0.06, delai: 0.2 }); },
    succes: (c, o) => { [523, 784, 1046, 1568].forEach((f, i) => note(c, o, { type: 'triangle', f0: f, t: i === 3 ? 0.8 : 0.2, v: 0.2, delai: i * 0.08 })); note(c, o, { type: 'sine', f0: 2093, t: 0.9, v: 0.07, delai: 0.3 }); },
  };
  function jouer(nom) {
    if (!reglages.actif || !pret || !ctx || !BRUITS[nom]) return false;
    let duree = 0;
    try {
      duree = jouerJingle(nom);
      if (!duree) BRUITS[nom](ctx, gainBruits);
    } catch (e) { return false; }
    if (duree >= 0 && ATTENUES[nom]) attenuer(duree > 0 ? duree : ATTENUES[nom]);
    return true;
  }

  const tamponsJingles = {};
  function chargerJingles() {
    if (!ctx || typeof fetch !== 'function' || (typeof location !== 'undefined' && location.protocol === 'file:')) return;
    const ext = format();
    if (!ext) return;
    for (const nom of JINGLES_DISPONIBLES) {
      if (tamponsJingles[nom] !== undefined || !JINGLES[nom]) continue;
      tamponsJingles[nom] = 'charge';
      fetch(DOSSIER + JINGLES[nom] + '.' + ext)
        .then(r => (r.ok ? r.arrayBuffer() : null))
        .then(d => (d ? new Promise((ok, ko) => ctx.decodeAudioData(d, ok, ko)) : null))
        .then(b => { tamponsJingles[nom] = b || null; })
        .catch(() => { tamponsJingles[nom] = null; });
    }
  }
  function jouerJingle(nom) {
    if (!JINGLES_DISPONIBLES.has(nom) || !JINGLES[nom]) return 0;
    const b = tamponsJingles[nom];
    if (b && typeof b === 'object') {
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b; g.gain.value = NIVEAUX_JINGLES[nom] != null ? NIVEAUX_JINGLES[nom] : 1;
      src.connect(g); g.connect(gainBruits); src.start();
      return b.duration;
    }
    const ext = format();
    if (typeof location !== 'undefined' && location.protocol === 'file:' && ext && typeof Audio !== 'undefined') {
      const a = new Audio(DOSSIER + JINGLES[nom] + '.' + ext);
      a.volume = Math.max(0, Math.min(1, reglages.bruitages / 100 * (NIVEAUX_JINGLES[nom] != null ? NIVEAUX_JINGLES[nom] : 1)));
      a.addEventListener('loadedmetadata', () => { if (ATTENUES[nom] && isFinite(a.duration)) attenuer(a.duration); }, { once: true });
      a.play().catch(() => {});
      return -1;
    }
    return 0;
  }

  const DIRECT = typeof location !== 'undefined' && location.protocol === 'file:';
  let formatCache;
  function format() {
    if (formatCache !== undefined) return formatCache;
    formatCache = null;
    if (typeof document === 'undefined' || typeof Audio === 'undefined') return formatCache;
    const a = document.createElement('audio');
    if (a.canPlayType('audio/ogg; codecs="vorbis"')) formatCache = 'ogg';
    else if (a.canPlayType('audio/mp4; codecs="mp4a.40.2"')) formatCache = 'm4a';
    return formatCache;
  }
  const fichier = cle => PISTES[cle] || cle;
  const niveau = cle => (NIVEAUX[fichier(cle)] != null ? NIVEAUX[fichier(cle)] : 1);
  const disponible = cle => !!cle && DISPONIBLES.has(cle) && !manquantes[cle];
  function choisir(cles) {
    const l = (Array.isArray(cles) ? cles : [cles]).filter(c => typeof c === 'string' && c && (PISTES[c] || DISPONIBLES.has(c)));
    if (!l.length) return null;
    return l.find(disponible) || l[l.length - 1];
  }

  const SILENCE = (() => {
    if (typeof btoa !== 'function') return '';
    const n = 800, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
    const ecrire = (o, t) => { for (let k = 0; k < t.length; k++) b[o + k] = t.charCodeAt(k); };
    ecrire(0, 'RIFF'); v.setUint32(4, 36 + n, true); ecrire(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); ecrire(36, 'data'); v.setUint32(40, n, true);
    b.fill(128, 44);
    let t = ''; for (let k = 0; k < b.length; k++) t += String.fromCharCode(b[k]);
    return 'data:audio/wav;base64,' + btoa(t);
  })();
  const lecteurs = [];
  function lecteur() {
    if (lecteurs.length < 2) {
      const audio = new Audio(); audio.preload = 'auto';
      const l = { audio, direct: DIRECT, fondu: 0, e: null };
      if (!DIRECT && ctx) {
        l.noeud = ctx.createMediaElementSource(audio);
        l.gain = ctx.createGain(); l.gain.gain.value = 0.0001;
        l.noeud.connect(l.gain); l.gain.connect(gainAttenue);
      }
      audio.addEventListener('ended', () => { const e = l.e; if (e && !e.arretee && e.apresFin) e.apresFin(); });
      audio.addEventListener('error', () => {
        const e = l.e; if (!e || e.arretee || !audio.getAttribute('src') || audio.getAttribute('src') === SILENCE) return;
        manquantes[e.cle] = true;
        if (enCours === e) enCours = null;
        liberer(e);
      });
      lecteurs.push(l);
      return l;
    }
    return lecteurs.find(l => !l.e) || lecteurs.find(l => !enCours || l !== enCours.l) || lecteurs[0];
  }
  function deverrouillerLecteurs() {
    if (!SILENCE) return;
    while (lecteurs.length < 2) lecteur();
    for (const l of lecteurs) {
      if (l.e) continue;
      l.audio.src = SILENCE;
      l.audio.play().then(() => { if (!l.e) { l.audio.pause(); l.audio.removeAttribute('src'); l.audio.load(); } }).catch(() => {});
    }
  }

  function volumeDirect(e) {
    const v = (reglages.actif ? reglages.musique / 100 : 0) * e.l.fondu * attenuation;
    try { e.l.audio.volume = Math.max(0, Math.min(1, v)); } catch (err) {   }
  }
  function fondre(e, vers, duree, fini) {
    const l = e.l;
    clearTimeout(e.minuterie); clearInterval(e.pas);
    if (!l.direct) {
      const t = ctx.currentTime, g = l.gain.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(vers, t + duree);
      if (fini) e.minuterie = setTimeout(fini, duree * 1000 + 60);
      return;
    }
    const de = l.fondu, t0 = Date.now();
    e.pas = setInterval(() => {
      if (l.e !== e) { clearInterval(e.pas); return; }
      const k = Math.min(1, (Date.now() - t0) / (duree * 1000));
      l.fondu = de + (vers - de) * k; volumeDirect(e);
      if (k >= 1) { clearInterval(e.pas); if (fini) fini(); }
    }, 40);
  }
  function liberer(e) {
    const l = e.l;
    clearTimeout(e.minuterie); clearTimeout(e.relance); clearInterval(e.pas);
    if (l.e !== e) return;
    l.e = null;
    try { l.audio.pause(); l.audio.removeAttribute('src'); l.audio.load(); } catch (err) {   }
  }
  function arreter(fondu) {
    if (!enCours) return;
    const e = enCours; enCours = null;
    e.arretee = true;
    clearTimeout(e.relance);
    fondre(e, e.l.direct ? 0 : 0.0001, fondu ? FONDU : 0.05, () => liberer(e));
  }
  function jouerPiste(cle) {
    if (!ctx || !pret || !reglages.actif) return;
    if (enCours && enCours.cle === cle) return;
    const ext = format();
    if (!disponible(cle) || !ext) { manquantes[cle] = true; arreter(true); return; }
    arreter(true);
    const l = lecteur();
    if (l.e) liberer(l.e);
    const b = BOUCLES[cle] || {};
    const reboucle = !(b.pause > 0) && !(b.reprise > 0);
    const e = { cle, l, arretee: false };
    l.e = e; l.audio.loop = reboucle;
    if (!reboucle) e.apresFin = () => {
      e.relance = setTimeout(() => {
        if (e.arretee) return;
        try { l.audio.currentTime = b.reprise || 0; } catch (err) {   }
        l.audio.play().catch(() => {});
      }, (b.pause || 0) * 1000);
    };
    if (l.direct) { l.fondu = 0; volumeDirect(e); } else { l.gain.gain.cancelScheduledValues(ctx.currentTime); l.gain.gain.setValueAtTime(0.0001, ctx.currentTime); }
    l.audio.src = DOSSIER + fichier(cle) + '.' + ext;
    enCours = e;
    l.audio.play().then(() => { if (!e.arretee) fondre(e, niveau(cle), FONDU); }).catch(() => {
      if (enCours === e) enCours = null;
      liberer(e);
    });
  }
  function attenuer(duree) {
    finAttenuation = Math.max(finAttenuation, Date.now() + duree * 1000);
    attenuation = 0.35;
    if (ctx && gainAttenue) {
      const t = ctx.currentTime, g = gainAttenue.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.35, t + 0.08);
      g.setValueAtTime(0.35, t + duree); g.linearRampToValueAtTime(1, t + duree + 0.8);
    }
    if (enCours && enCours.l.direct) volumeDirect(enCours);
    setTimeout(() => {
      if (Date.now() < finAttenuation) return;
      attenuation = 1;
      if (enCours && enCours.l.direct) volumeDirect(enCours);
    }, duree * 1000 + 800);
  }
  function musique(cles) {
    const cle = choisir(cles);
    pisteVoulue = cle;
    if (!cle) { if (ctx) arreter(true); return; }
    if (!disponible(cle)) manquantes[cle] = true;
    if (pret) jouerPiste(cle);
  }

  return {
    PISTES, DISPONIBLES, BOUCLES, JINGLES, JINGLES_DISPONIBLES, BRUITS: Object.keys(BRUITS), DOSSIER,
    jingleCharge: nom => !!(tamponsJingles[nom] && typeof tamponsJingles[nom] === 'object'),
    reglages, regler, jouer, musique, deverrouiller, contexte,
    actif: () => reglages.actif, pret: () => pret,
    piste: () => (enCours ? enCours.cle : null), voulue: () => pisteVoulue, manquante: cle => !!manquantes[cle],
    attenuee: () => attenuation < 1, choisir,
    lecture: () => (enCours ? { cle: enCours.cle, temps: enCours.l.audio.currentTime, enPause: enCours.l.audio.paused, direct: enCours.l.direct, boucle: enCours.l.audio.loop, lecteurs: lecteurs.length } : null),
  };
})();
