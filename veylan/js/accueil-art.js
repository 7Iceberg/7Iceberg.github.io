// Peintures de l'accueil et de la création de personnage : illustrations des actualités, monde,
// portraits, socle tournant, grande illustration de classe. Tout est dessiné par le code dans la
// palette de la charte (nuit, or ancien, bleu cristal, violet des Voiles) ; les Veilleurs viennent
// du peintre du jeu (js/render.js, drawBody), le même qu'en exploration et en combat. Une
// illustration d'artiste remplace la grande illustration de classe dès qu'elle existe :
// assets/classes/<id>.webp (docs/PIPELINE-IMAGES.md).
const AccueilArt = (() => {
  const OR = '#c9a66b', OR_CLAIR = '#e2c690', OR_SOMBRE = '#8e7144', CRISTAL = '#00c2ff', ECLAT = '#a66cff';
  const mix = (a, b, t) => Util.mixHex(a, b, t);
  const rgba = (hex, a) => { const v = parseInt(hex.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
  let painter = null;

  // Prépare une toile à la taille de sa boîte (densité de l'écran, 2 au plus) ; rend { c, w, h }.
  function prepare(cv, w, h) {
    const r = cv.getBoundingClientRect();
    w = Math.max(1, Math.round(w || r.width)); h = Math.max(1, Math.round(h || r.height));
    const d = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
    const c = cv.getContext('2d');
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, w, h);
    c.lineJoin = 'round'; c.lineCap = 'round';
    return { c, w, h };
  }

  // Une scène dessinée sur un plan de 960 × 540, posée en « couvrir » dans la toile.
  function plan(c, w, h, fn) {
    const k = Math.max(w / 960, h / 540);
    c.save(); c.translate((w - 960 * k) / 2, (h - 540 * k) / 2); c.scale(k, k);
    fn(c);
    c.restore();
  }

  // Un Veilleur, les pieds en (x, y), à l'échelle k. s : { color, glyph, look, gender, facing, trait }.
  // Le trait d'encre s'affine quand la figure grandit (il garde 3 à 4 pixels à l'écran), sauf si
  // s.trait est donné.
  function veilleur(c, x, y, k, s) {
    if (!painter) return;
    const trait = s.trait != null ? s.trait : Math.max(0.1, Math.min(1, 1.5 / k));
    c.save(); c.translate(x, y); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
    try { painter.drawBody(c, { x: 0, y: 0 }, Object.assign({ shape: 'player', team: 'player' }, s, { trait })); } catch (e) { /* peintre pas prêt */ }
    c.restore();
  }

  // La même figure en ombre chinoise, d'une seule couleur (une figure en retrait, un liseré).
  // Peinte à part puis posée, pour ne pas teinter ce qui est déjà sur la toile.
  function ombre(c, x, y, k, s, col, alpha) {
    const cv = c.canvas, off = document.createElement('canvas');
    off.width = cv.width; off.height = cv.height;
    const o = off.getContext('2d');
    o.setTransform(c.getTransform());
    veilleur(o, x, y, k, s);
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.globalCompositeOperation = 'source-in';
    o.fillStyle = col; o.fillRect(0, 0, off.width, off.height);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alpha == null ? 1 : alpha; c.drawImage(off, 0, 0); c.restore();
  }

  // L'apparence à peindre pour une classe (couleur, glyphe) et un brouillon de personnage.
  function figure(classId, o) {
    const cl = DATA.classes[classId] || DATA.futureClasses && DATA.futureClasses[classId] || DATA.classes[DATA.defaultClass];
    return Object.assign({ classId, color: cl.color || '#8a93a6', glyph: cl.glyph || (cl.name ? cl.name[0] : 'V'), facing: 'se' }, o || {});
  }

  // Les vues du socle tournant d'une classe modelée dans Blender (assets/classes/<id>_tour.webp :
  // quatre vues côte à côte, se, sw, nw, ne, 512 × 768 chacune, fond transparent ; le modèle de
  // 1,75 m dans un cadre de 2,02 m : les pieds à 734 px du haut, le visage à 125 px, les épaules
  // larges de 160 px ; docs/PIPELINE-IMAGES.md). Seules les classes listées sont demandées, une fois.
  const TOURNANTES = ['lyssar'];
  const tours = new Map();
  const VUE_L = 512, VUE_H = 768, VUES = ['se', 'sw', 'nw', 'ne'], PIEDS = 734, VISAGE = 125, EPAULES = 160;
  function imageTour(id, quand) {
    if (!TOURNANTES.includes(id)) { quand({ etat: 'absente' }); return null; }
    let e = tours.get(id);
    if (!e) {
      e = { etat: 'attente', img: new Image(), suite: [] };
      tours.set(id, e);
      e.img.decoding = 'async';
      e.img.onload = () => { e.etat = 'ok'; for (const f of e.suite.splice(0)) f(e); };
      e.img.onerror = () => { e.etat = 'absente'; for (const f of e.suite.splice(0)) f(e); };
      e.img.src = `assets/classes/${id}_tour.webp`;
    }
    if (e.etat === 'attente') e.suite.push(quand); else quand(e);
    return e;
  }
  // La feuille des vues si elle est prête, sinon null ; `fn` est rappelé quand elle arrive (pour
  // redessiner). Sans classe modelée, la figure peinte reste.
  function vueTour(s, fn) {
    const id = s && s.classId;
    if (!id || !TOURNANTES.includes(id)) return null;
    const e = tours.get(id);
    if (e && e.etat === 'ok') return e.img;
    if (!e || e.etat === 'attente') imageTour(id, r => { if (r.etat === 'ok' && fn) fn(); });
    return null;
  }
  // Une vue de la feuille, les pieds en (x, y), le cadre haut de `hauteur` px.
  function dessinerVue(c, img, facing, x, y, hauteur) {
    const i = Math.max(0, VUES.indexOf(facing)), sc = hauteur / VUE_H;
    c.drawImage(img, i * VUE_L, 0, VUE_L, VUE_H, x - VUE_L * sc / 2, y - PIEDS * sc, VUE_L * sc, VUE_H * sc);
  }

  // Lueur douce, en mode additif.
  function lueur(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(0.45, rgba(col, a * 0.35)); g.addColorStop(1, rgba(col, 0));
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }

  // Un éclat de cristal (losange taillé, face claire et face sombre).
  function eclat(c, x, y, s, col, a) {
    c.save(); c.globalAlpha = a == null ? 1 : a;
    c.fillStyle = mix(col, '#000814', 0.35);
    c.beginPath(); c.moveTo(x, y - s * 1.6); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s * 1.1); c.lineTo(x - s * 0.6, y); c.closePath(); c.fill();
    c.fillStyle = mix(col, '#ffffff', 0.45);
    c.beginPath(); c.moveTo(x, y - s * 1.6); c.lineTo(x + s * 0.7, y); c.lineTo(x, y); c.closePath(); c.fill();
    c.restore();
  }

  // Le fond d'une case de portrait : la couleur de la classe qui monte de la nuit.
  function fondClasse(c, w, h, col) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix(col, '#0a1220', 0.55)); g.addColorStop(1, mix(col, '#05080f', 0.88));
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = c.createRadialGradient(w * 0.5, h * 0.42, 1, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    r.addColorStop(0, rgba(mix(col, '#ffffff', 0.2), 0.55)); r.addColorStop(0.55, rgba(col, 0.12)); r.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  }

  // Buste : la tête et les épaules, cadrées dans la toile. o.fond : 'classe' (défaut) ou 'neutre'.
  function buste(cv, s, o) {
    o = o || {};
    const { c, w, h } = prepare(cv, o.w, o.h);
    if (o.fond === 'neutre') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1d2a3c'); g.addColorStop(1, '#0c131e');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    } else fondClasse(c, w, h, s.color);
    const k = Math.min(w, h * 1.05) * (o.zoom || 0.5) / 19;
    const hx = w * 0.5, hy = h * (o.haut || 0.44);
    // o.peint : la figure peinte quoi qu'il arrive (les têtes à choisir de l'écran d'apparence).
    const img = o.peint ? null : vueTour(s, () => buste(cv, s, o));
    if (img) {
      // Le modèle : le visage en (hx, hy), les épaules sur la moitié de la largeur.
      const sc = w * 0.52 / EPAULES;
      c.drawImage(img, 0, 0, VUE_L, VUE_H, hx - VUE_L * sc / 2, hy - VISAGE * sc, VUE_L * sc, VUE_H * sc);
    } else veilleur(c, hx - (s.facing === 'sw' ? -0.9 : 0.9) * k, hy + 40 * k, k, s);
    if (o.verrou) {
      c.fillStyle = 'rgba(6,9,16,0.62)'; c.fillRect(0, 0, w, h);
    }
  }

  // Le socle : la dalle du Veilleur et les huit qui l'entourent, de plus en plus effacées, comme
  // un morceau du plateau de combat ; une couture d'or sur la dalle choisie, la lueur de la classe
  // dessous. o.seule : la dalle du Veilleur sans ses voisines.
  function socle(c, cx, cy, k, col, o) {
    o = o || {};
    const TW = 64 * k, TH = 32 * k, ep = 7 * k;
    const dalle = (x, y, alpha, main) => {
      c.beginPath(); c.moveTo(x - TW / 2, y); c.lineTo(x, y + TH / 2); c.lineTo(x, y + TH / 2 + ep); c.lineTo(x - TW / 2, y + ep); c.closePath();
      c.fillStyle = rgba('#1b2536', alpha); c.fill();
      c.beginPath(); c.moveTo(x + TW / 2, y); c.lineTo(x, y + TH / 2); c.lineTo(x, y + TH / 2 + ep); c.lineTo(x + TW / 2, y + ep); c.closePath();
      c.fillStyle = rgba('#0e1520', alpha); c.fill();
      c.beginPath(); c.moveTo(x, y - TH / 2); c.lineTo(x + TW / 2, y); c.lineTo(x, y + TH / 2); c.lineTo(x - TW / 2, y); c.closePath();
      const g = c.createLinearGradient(x - TW / 2, y - TH / 2, x + TW / 2, y + TH / 2);
      g.addColorStop(0, rgba(main ? '#6c7891' : '#4d5870', alpha)); g.addColorStop(1, rgba(main ? '#353f55' : '#262f42', alpha));
      c.fillStyle = g; c.fill();
      c.lineWidth = Math.max(1, 1.2 * k); c.strokeStyle = rgba(main ? OR_CLAIR : OR, alpha * (main ? 0.95 : 0.5)); c.stroke();
      // une fissure, comme les dalles du jeu
      c.strokeStyle = rgba('#0a0f18', alpha * 0.45); c.lineWidth = Math.max(0.6, 0.8 * k);
      c.beginPath(); c.moveTo(x - TW * 0.18, y - TH * 0.12); c.lineTo(x - TW * 0.04, y + TH * 0.04); c.lineTo(x + TW * 0.1, y + TH * 0.02); c.stroke();
    };
    // de l'arrière vers l'avant : les dalles du fond d'abord
    const autour = o.seule ? [[0, 0]] : [[-1, -1], [0, -1], [-1, 0], [1, -1], [0, 0], [-1, 1], [1, 0], [0, 1], [1, 1]];
    for (const [i, j] of autour) {
      const main = !i && !j;
      dalle(cx + (i - j) * TW / 2, cy + (i + j) * TH / 2, main ? 1 : (i && j ? 0.2 : 0.5), main);
    }
    // lueur de la classe et ombre au pied
    c.save(); c.beginPath(); c.moveTo(cx, cy - TH / 2); c.lineTo(cx + TW / 2, cy); c.lineTo(cx, cy + TH / 2); c.lineTo(cx - TW / 2, cy); c.closePath(); c.clip();
    const r = c.createRadialGradient(cx, cy, 0, cx, cy, TW * 0.5);
    r.addColorStop(0, rgba(col, 0.55)); r.addColorStop(1, rgba(col, 0));
    c.fillStyle = r; c.fillRect(cx - TW / 2, cy - TH / 2, TW, TH);
    c.restore();
    c.fillStyle = 'rgba(4,6,12,0.45)'; c.beginPath(); c.ellipse(cx + 2 * k, cy + k, 17 * k, 7 * k, 0, 0, Math.PI * 2); c.fill();
  }

  // Ce qui est déjà peint s'efface en ellipse autour de (cx, cy), de rayon r (deux fois plus large
  // que haute, comme une dalle) : les dalles du socle ne butent jamais sur le bord de la toile.
  function fondu(c, cx, cy, r, w, h) {
    c.save(); c.globalCompositeOperation = 'destination-in';
    c.translate(cx, cy); c.scale(1, 0.5);
    const m = c.createRadialGradient(0, 0, r * 0.45, 0, 0, r);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m; c.fillRect(-w * 2, -h * 4, w * 4, h * 8);
    c.restore();
  }

  // Le Veilleur sur son socle, cadré dans une toile : la figure prend o.part de la hauteur (0,6 par
  // défaut) sans que sa dalle déborde. `t` en millisecondes fait respirer la figure.
  function tournant(cv, s, o) {
    o = o || {};
    const { c, w, h } = prepare(cv);
    const k = Math.max(0.5, Math.min(h * (o.part || 0.6) / 64, w / 72));
    const cx = w * 0.5, cy = h - 22 * k;
    socle(c, cx, cy, k, s.color);
    fondu(c, cx, cy, Math.min(w * 0.5, 104 * k), w, h);
    const souffle = o.t != null && !o.calme ? Math.sin(o.t / 700) : 0;
    lueur(c, cx, cy - 24 * k, 36 * k, s.color, 0.16 + 0.05 * souffle);
    c.save(); c.translate(cx, cy); c.scale(1, 1 + 0.012 * souffle); c.translate(-cx, -cy);
    const img = vueTour(s, o.redessiner);
    if (img) dessinerVue(c, img, s.facing, cx, cy + 2 * k, 80 * k);
    else veilleur(c, cx, cy, k, s);
    c.restore();
    return { k, cx, cy };
  }

  // Portrait en pied pour un emplacement de personnage : fond de classe, emblème, socle, figure.
  function enPied(cv, s) {
    const { c, w, h } = prepare(cv);
    const k = Math.max(0.5, Math.min(h * 0.56 / 64, w / 62));
    const cx = w * 0.5, cy = h - 20 * k;
    // le socle d'abord, effacé vers les bords ; l'emblème et le fond se glissent ensuite dessous
    socle(c, cx, cy, k * 0.9, s.color);
    fondu(c, cx, cy, Math.min(w * 0.62, 96 * k), w, h);
    c.save(); c.globalCompositeOperation = 'destination-over';
    embleme(c, cx, cy - 40 * k, Math.min(w * 0.4, 30 * k), s.color, null, 0.32);
    fondClasse(c, w, h, s.color);
    c.restore();
    lueur(c, cx, cy - 24 * k, 32 * k, s.color, 0.16);
    const img = vueTour(s, () => enPied(cv, s));
    if (img) dessinerVue(c, img, 'se', cx, cy + 2 * k, 78 * k);
    else veilleur(c, cx, cy, k, s);
  }

  // L'emblème d'une classe : un losange d'or serti, la couleur de la classe dedans, le glyphe au
  // milieu, une couronne de fil d'or autour.
  function embleme(c, x, y, r, col, glyph, a) {
    c.save(); c.globalAlpha = a == null ? 1 : a;
    c.lineWidth = r * 0.012; c.strokeStyle = rgba(OR_CLAIR, 0.5);
    c.setLineDash([r * 0.03, r * 0.05]);
    c.beginPath(); c.arc(x, y, r * 1.08, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    c.lineWidth = r * 0.02; c.strokeStyle = rgba(OR, 0.6);
    c.beginPath(); c.arc(x, y, r * 0.96, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 8; i++) {
      const a2 = i * Math.PI / 4, px = x + Math.cos(a2) * r * 0.96, py = y + Math.sin(a2) * r * 0.96, s = r * 0.035;
      c.fillStyle = i % 2 ? OR : CRISTAL;
      c.beginPath(); c.moveTo(px, py - s * 1.4); c.lineTo(px + s, py); c.lineTo(px, py + s * 1.4); c.lineTo(px - s, py); c.closePath(); c.fill();
    }
    const L = r * 0.72;
    const dia = () => { c.beginPath(); c.moveTo(x, y - L); c.lineTo(x + L, y); c.lineTo(x, y + L); c.lineTo(x - L, y); c.closePath(); };
    dia();
    const g = c.createLinearGradient(x - L, y - L, x + L, y + L);
    g.addColorStop(0, mix(col, '#ffffff', 0.25)); g.addColorStop(0.5, mix(col, '#0a1220', 0.35)); g.addColorStop(1, mix(col, '#05080f', 0.75));
    c.fillStyle = g; c.fill();
    c.lineWidth = r * 0.07; c.strokeStyle = '#5c4628'; c.stroke();
    c.lineWidth = r * 0.04; c.strokeStyle = OR_CLAIR; c.stroke();
    // facettes
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.beginPath(); c.moveTo(x, y - L); c.lineTo(x + L, y); c.lineTo(x, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(x, y + L); c.lineTo(x - L, y); c.lineTo(x, y); c.closePath(); c.fill();
    if (glyph) {
      c.font = `700 ${Math.round(r * (glyph.length > 1 ? 0.62 : 0.8))}px Cinzel, Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tg = c.createLinearGradient(0, y - r * 0.4, 0, y + r * 0.4);
      tg.addColorStop(0, '#fff3d2'); tg.addColorStop(0.5, OR_CLAIR); tg.addColorStop(1, OR_SOMBRE);
      c.lineWidth = r * 0.05; c.strokeStyle = 'rgba(10,8,4,0.7)'; c.strokeText(glyph, x, y + r * 0.04);
      c.fillStyle = tg; c.fillText(glyph, x, y + r * 0.04);
      c.textBaseline = 'alphabetic';
    }
    c.restore();
  }

  // La grande illustration d'une classe : sa lumière et ses rayons, son emblème derrière la tête,
  // la figure de l'autre genre en ombre chinoise liserée, le Veilleur en grand devant, éclats et
  // poussières des éléments de ses sorts, et un fondu vers le décor. o : { gender, look, autre }
  // (autre : l'apparence de la figure en retrait). Une toile plus large que haute (téléphone
  // debout, où le socle passe par-dessus) ne garde que le décor, sans les figures.
  function illustration(cv, classId, o) {
    o = o || {};
    const cl = DATA.classes[classId];
    const { c, w, h } = prepare(cv);
    const col = cl.color, R = rng(classId.length * 977 + 13);
    const figures = w <= h * 1.05;
    // la lumière de la classe, haute et un peu à gauche
    lueur(c, w * 0.46, h * 0.38, Math.max(w, h) * 0.8, col, 0.4);
    // rayons depuis le haut
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const x0 = w * (0.18 + i * 0.12), ang = -0.3 + i * 0.1;
      c.save(); c.translate(x0, -h * 0.05); c.rotate(ang);
      const g = c.createLinearGradient(0, 0, 0, h * 1.1);
      g.addColorStop(0, rgba(mix(col, '#ffffff', 0.4), i % 2 ? 0.1 : 0.17)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(-w * 0.012, 0); c.lineTo(w * 0.012, 0); c.lineTo(w * 0.08, h * 1.1); c.lineTo(-w * 0.08, h * 1.1); c.fill();
      c.restore();
    }
    c.restore();
    // l'emblème, derrière la tête du Veilleur (sans glyphe : le Veilleur le porte déjà sur lui)
    const kBig = Math.min(h * 0.8 / 64, w * 0.8 / 44), fx = w * 0.5, fy = h * 0.985;
    const ex = w * 0.5, ey = figures ? fy - 46 * kBig : h * 0.45, er = Math.min(w * 0.44, figures ? 30 * kBig : h * 0.36);
    lueur(c, ex, ey, er * 1.5, col, 0.32);
    embleme(c, ex, ey, er, col, figures ? null : cl.glyph, figures ? 0.7 : 0.62);
    if (figures) {
      const g0 = o.gender === 'm' ? 'm' : 'f', autre = g0 === 'm' ? 'f' : 'm';
      // l'autre genre en retrait, à gauche : un liseré de la couleur de la classe, puis l'ombre
      // (pas sur une petite toile, où il encombrerait)
      if (h >= 420) {
        const sb = figure(classId, { gender: autre, look: o.autre || null, facing: 'se' });
        const bx = w * 0.14, by = h * 0.9, kb = kBig * 0.7;
        ombre(c, bx + kb * 0.9, by - kb * 0.7, kb, sb, mix(col, '#ffffff', 0.4), 0.55);
        ombre(c, bx, by, kb, sb, mix(col, '#04070d', 0.82), 0.95);
      }
      // le sol qui luit sous le Veilleur, son ombre, puis lui
      lueur(c, fx, fy - 6 * kBig, w * 0.4, col, 0.3);
      c.fillStyle = 'rgba(3,5,10,0.5)'; c.beginPath(); c.ellipse(fx + kBig, fy, 21 * kBig, 5.5 * kBig, 0, 0, Math.PI * 2); c.fill();
      veilleur(c, fx, fy, kBig, figure(classId, { gender: g0, look: o.look || null, facing: 'se' }));
    }
    // éclats et poussières des éléments de la classe
    const els = [...new Set(cl.spells.map(id => DATA.spells[id] && DATA.spells[id].element).filter(e => e && e !== 'neutre'))];
    const cols = els.map(e => DATA.elements[e].color).concat([col]);
    for (let i = 0; i < 30; i++) {
      const x = R() * w, y = R() * h * 0.9, s = 1.5 + R() * 4, cc = cols[Math.floor(R() * cols.length)];
      if (R() < 0.5) eclat(c, x, y, s, cc, 0.75); else lueur(c, x, y, s * 3, cc, 0.5);
    }
    // fondu vers le décor, à droite
    c.save(); c.globalCompositeOperation = 'destination-in';
    const f = c.createLinearGradient(0, 0, w, 0); f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(0.8, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = f; c.fillRect(0, 0, w, h);
    c.restore();
  }

  // Les particules qui montent devant la scène de la classe (dessinées à chaque image).
  function particules(n, seed) {
    const R = rng(seed || 7);
    return Array.from({ length: n }, () => ({ x: R(), y: R(), v: 0.02 + R() * 0.05, s: 0.6 + R() * 1.8, p: R() * 6.28, d: R() < 0.3 }));
  }
  function dessinerParticules(c, w, h, list, cols, t) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const q of list) {
      const y = ((q.y - t * q.v / 1000) % 1 + 1) % 1, x = q.x + Math.sin(t / 1300 + q.p) * 0.01;
      const a = 0.35 + 0.35 * Math.sin(t / 500 + q.p), col = cols[Math.floor(q.p * 10) % cols.length];
      if (q.d) eclat(c, x * w, y * h, q.s * 1.6, col, Math.max(0, a));
      else { c.fillStyle = rgba(col, Math.max(0, a)); c.beginPath(); c.arc(x * w, y * h, q.s, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }

  // ----- Le monde (écran « Choix du monde ») -----
  // Un globe de nuit tenu par sept Voiles : les continents tournent, les anneaux passent devant et
  // derrière, le cristal de la fente luit au pôle.
  const TERRES = (() => {
    const R = rng(4242), out = [];
    for (let i = 0; i < 7; i++) {
      const lon0 = R() * Math.PI * 2, lat0 = (R() - 0.5) * 1.6, pts = [];
      const n = 14, rad = 0.25 + R() * 0.35;
      for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2, rr = rad * (0.6 + R() * 0.6); pts.push([lon0 + Math.cos(a) * rr * 1.3, lat0 + Math.sin(a) * rr]); }
      out.push({ pts, col: [OR_SOMBRE, '#62865e', '#8db585', '#7a6a5e', '#b9c7b4', '#5c5466', '#62865e'][i] });
    }
    return out;
  })();
  function monde(cv, t, o) {
    o = o || {};
    const { c, w, h } = prepare(cv);
    // le globe et ses anneaux tiennent dans la toile, et les lueurs s'éteignent avant ses bords
    const cx = w * 0.5, cy = h * 0.52, Rr = Math.max(10, Math.min(w / 2 / 1.95, h * 0.3)), rot = (t || 0) / 9000;
    lueur(c, cx, cy, Math.min(Rr * 2.3, w / 2, h / 2), CRISTAL, 0.22);
    lueur(c, cx, cy, Math.min(Rr * 1.5, w / 2, h / 2), ECLAT, 0.12);
    const anneaux = [[1.32, 0.28, -0.35, OR], [1.49, 0.22, 0.25, CRISTAL], [1.66, 0.3, -0.12, ECLAT], [1.17, 0.18, 0.5, OR_CLAIR], [1.83, 0.2, 0.05, OR], [1.4, 0.34, 0.78, CRISTAL], [1.95, 0.16, -0.6, ECLAT]];
    const anneau = (i, devant) => {
      const [rx, ry, tilt, col] = anneaux[i];
      c.save(); c.translate(cx, cy); c.rotate(tilt + Math.sin((t || 0) / 7000 + i) * 0.03);
      c.beginPath(); c.ellipse(0, 0, Rr * rx, Rr * rx * ry, 0, devant ? 0 : Math.PI, devant ? Math.PI : Math.PI * 2);
      c.lineWidth = Math.max(1, Rr * 0.012); c.strokeStyle = rgba(col, devant ? 0.75 : 0.35); c.stroke();
      // une perle qui court sur l'anneau
      const a = ((t || 0) / (2600 + i * 700) + i) % (Math.PI * 2);
      const px = Math.cos(a) * Rr * rx, py = Math.sin(a) * Rr * rx * ry;
      if ((py > 0) === devant) { c.fillStyle = rgba(mix(col, '#ffffff', 0.4), 0.9); c.beginPath(); c.arc(px, py, Math.max(1.2, Rr * 0.02), 0, Math.PI * 2); c.fill(); }
      c.restore();
    };
    for (let i = 0; i < anneaux.length; i++) anneau(i, false);
    // le globe
    const g = c.createRadialGradient(cx - Rr * 0.35, cy - Rr * 0.4, Rr * 0.1, cx, cy, Rr);
    g.addColorStop(0, '#2a5f86'); g.addColorStop(0.55, '#123553'); g.addColorStop(1, '#071a2c');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rr, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.arc(cx, cy, Rr, 0, Math.PI * 2); c.clip();
    for (const terre of TERRES) {
      c.beginPath(); let vis = 0;
      terre.pts.forEach(([lon, lat], j) => {
        const l = lon + rot, x = cx + Rr * Math.cos(lat) * Math.sin(l), y = cy - Rr * Math.sin(lat), z = Math.cos(lat) * Math.cos(l);
        if (z > 0) vis++;
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      });
      if (vis < terre.pts.length * 0.6) continue;
      c.closePath(); c.fillStyle = rgba(terre.col, 0.85); c.fill();
      c.lineWidth = Math.max(1, Rr * 0.008); c.strokeStyle = rgba(OR_CLAIR, 0.35); c.stroke();
    }
    // nuit sur le bord droit, liseré de lumière à gauche
    const ombre = c.createLinearGradient(cx - Rr, cy, cx + Rr, cy);
    ombre.addColorStop(0, 'rgba(0,0,0,0)'); ombre.addColorStop(0.55, 'rgba(2,6,14,0.15)'); ombre.addColorStop(1, 'rgba(2,6,14,0.75)');
    c.fillStyle = ombre; c.fillRect(cx - Rr, cy - Rr, Rr * 2, Rr * 2);
    c.restore();
    c.lineWidth = Math.max(1.5, Rr * 0.025); c.strokeStyle = rgba('#8fe6ff', 0.55);
    c.beginPath(); c.arc(cx, cy, Rr, Math.PI * 0.6, Math.PI * 1.45); c.stroke();
    // la fente, au pôle : un cristal qui luit
    const pulse = 0.75 + 0.25 * Math.sin((t || 0) / 800);
    lueur(c, cx, cy - Rr * 1.02, Rr * 0.5 * pulse, CRISTAL, 0.6);
    eclat(c, cx, cy - Rr * 1.02, Rr * 0.09, CRISTAL, 1);
    for (let i = 0; i < anneaux.length; i++) anneau(i, true);
  }

  // ----- « As-tu déjà joué à Veylan ? » : les deux moitiés -----
  function moitie(cv, kind) {
    const { c, w, h } = prepare(cv);
    const debut = kind === 'debut';
    // le sol : les figures s'y tiennent, au-dessus du texte et du bouton posés en bas de la moitié
    const sol = h - Math.min(h * 0.45, 158);
    const k = Math.max(0.5, Math.min((sol - 14) / 68, w * 0.8 / 66));
    const g = c.createLinearGradient(0, 0, 0, h);
    if (debut) { g.addColorStop(0, '#0d1f3a'); g.addColorStop(sol / h * 0.85, '#2b3a5a'); g.addColorStop(sol / h, '#8a6a4a'); g.addColorStop(1, '#2a2018'); }
    else { g.addColorStop(0, '#160f2a'); g.addColorStop(sol / h * 0.8, '#2a1d4a'); g.addColorStop(1, '#0c0818'); }
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const R = rng(debut ? 31 : 77);
    for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(220,235,255,${0.2 + R() * 0.5})`; c.fillRect(R() * w, R() * sol * 0.8, 1 + R(), 1 + R()); }
    if (debut) {
      // l'aube sur l'horizon, un chemin de lanternes vers un Relais
      lueur(c, w * 0.62, sol - 20, w * 0.7, '#ffcf8a', 0.38);
      c.fillStyle = 'rgba(12,16,28,0.8)';
      c.beginPath(); c.moveTo(0, sol + 8); c.quadraticCurveTo(w * 0.3, sol - 22, w * 0.55, sol - 6); c.quadraticCurveTo(w * 0.8, sol + 6, w, sol - 14); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      const L = Math.max(0.6, k / 3);
      for (let i = 0; i < 5; i++) {
        const f = i / 4, x = w * (0.55 + f * 0.33), y = sol - 8 - f * 22 * L, s2 = (1 - f * 0.55) * L;
        c.strokeStyle = 'rgba(30,24,20,0.9)'; c.lineWidth = 2 * s2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 24 * s2); c.stroke();
        lueur(c, x, y - 26 * s2, 26 * s2, '#f2b134', 0.7); c.fillStyle = '#ffe7a3'; c.fillRect(x - 2.5 * s2, y - 29 * s2, 5 * s2, 6 * s2);
      }
      lueur(c, w * 0.88, sol * 0.62, 60 * L, CRISTAL, 0.55); eclat(c, w * 0.88, sol * 0.62, 9 * L, CRISTAL, 1);
      veilleur(c, w * 0.32, sol + 4, k, figure('oriel', { gender: 'f', facing: 'se', look: { tete: 1, couleurs: ['#f0cfae', '#b5542c', '#ffd166', '#3a4060', '#5b4a2a', '#ffd166'] } }));
    } else {
      // une grille tactique qui s'éloigne, deux Veilleurs aguerris, des éclats des Voiles
      const T = Math.max(14, k * 7);
      c.save(); c.globalAlpha = 0.5;
      for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 7; gx++) {
        const x = w * 0.5 + (gx - gy) * T, y = sol - 6 * T + (gx + gy) * T / 2;
        c.beginPath(); c.moveTo(x, y - T / 2); c.lineTo(x + T, y); c.lineTo(x, y + T / 2); c.lineTo(x - T, y); c.closePath();
        c.strokeStyle = 'rgba(166,108,255,0.45)'; c.lineWidth = 1; c.stroke();
        if ((gx * 3 + gy) % 7 === 2) { c.fillStyle = 'rgba(0,194,255,0.18)'; c.fill(); }
        if ((gx + gy * 5) % 11 === 4) { c.fillStyle = 'rgba(240,122,92,0.2)'; c.fill(); }
      }
      c.restore();
      lueur(c, w * 0.5, sol * 0.6, w * 0.6, ECLAT, 0.35);
      for (let i = 0; i < 9; i++) eclat(c, R() * w, R() * sol * 0.8, 3 + R() * 6, R() < 0.5 ? ECLAT : CRISTAL, 0.8);
      veilleur(c, w * 0.67, sol - 6, k * 0.82, figure('nerith', { gender: 'f', facing: 'sw', look: { tete: 6, couleurs: ['#f2d9bf', '#1c1410', '#9b59d0', '#2b3048', '#4d2c68', '#9b59d0'] } }));
      veilleur(c, w * 0.36, sol + 6, k, figure('sarkan', { gender: 'm', facing: 'se', look: { tete: 2, couleurs: ['#d8a982', '#2c2420', '#c9a35c', '#2b3048', '#4a3820', '#c9a35c'] } }));
    }
    // la nuit monte sous le sol : le texte et le bouton se lisent dessus
    const v = c.createLinearGradient(0, sol - 40, 0, sol + 50);
    v.addColorStop(0, 'rgba(5,8,15,0)'); v.addColorStop(1, 'rgba(5,8,15,0.9)');
    c.fillStyle = v; c.fillRect(0, sol - 40, w, h - sol + 40);
  }

  // ----- Illustrations des actualités -----
  function ciel(c, haut, bas) {
    const g = c.createLinearGradient(0, 0, 0, 540); g.addColorStop(0, haut); g.addColorStop(1, bas);
    c.fillStyle = g; c.fillRect(0, 0, 960, 540);
    const R = rng(haut.length * 31 + bas.charCodeAt(2));
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(210,230,255,${0.15 + R() * 0.45})`; c.fillRect(R() * 960, R() * 330, 1 + R() * 1.4, 1 + R() * 1.4); }
  }
  function texte(c, s, x, y, taille, col, opts) {
    c.font = `${(opts && opts.poids) || 600} ${taille}px ${(opts && opts.police) || 'Inter, system-ui, sans-serif'}`;
    c.textAlign = (opts && opts.align) || 'center'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(2, taille * 0.18); c.strokeStyle = 'rgba(5,8,15,0.85)'; c.strokeText(s, x, y);
    c.fillStyle = col; c.fillText(s, x, y);
    c.textBaseline = 'alphabetic';
  }

  const ACTUS = {
    // Les factions : la bannière blanche et or du Fil devant les flèches d'Orsane, la bannière noire
    // et pourpre de la Déchirure au bord du gouffre de Kessane, et entre les deux le médaillon de
    // cuivre riveté des Francs-Marcheurs, qui ne choisissent pas.
    factions(c) {
      ciel(c, '#121a30', '#22182c');
      lueur(c, 230, 230, 430, '#ffd98a', 0.3);
      lueur(c, 740, 470, 430, '#c0266e', 0.4);
      lueur(c, 740, 500, 230, ECLAT, 0.32);
      // Orsane : des flèches de calcaire dans l'aube
      for (let i = 0; i < 10; i++) {
        const x = 30 + i * 40, hh = 80 + ((i * 53) % 90) + (i === 4 ? 90 : 0) + (i === 6 ? 50 : 0);
        c.fillStyle = `rgba(232,225,211,${0.1 + (i % 3) * 0.04})`;
        c.beginPath(); c.moveTo(x, 470); c.lineTo(x + 6, 470 - hh * 0.8); c.lineTo(x + 13, 470 - hh); c.lineTo(x + 20, 470 - hh * 0.8); c.lineTo(x + 26, 470); c.fill();
      }
      // le gouffre de Kessane : deux lèvres de roche et la lueur qui monte d'en bas
      c.fillStyle = '#0e0a16';
      c.beginPath(); c.moveTo(560, 540); c.lineTo(585, 430); c.lineTo(640, 400); c.lineTo(690, 430); c.lineTo(700, 540); c.fill();
      c.beginPath(); c.moveTo(810, 540); c.lineTo(805, 440); c.lineTo(860, 380); c.lineTo(960, 370); c.lineTo(960, 540); c.fill();
      c.strokeStyle = 'rgba(255,125,176,0.55)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(690, 430); c.lineTo(700, 540); c.moveTo(810, 540); c.lineTo(805, 440); c.stroke();
      for (let i = 0; i < 7; i++) eclat(c, 720 + i * 14, 520 - i * 22, 4 + (i % 3), i % 2 ? '#ff7db0' : ECLAT, 0.8);
      // une bannière : la hampe, le drap, sa couture ; le Fil a sa pointe, la Déchirure son accroc
      const banniere = (x, fil) => {
        const W = 150, H = 250, y = 70;
        c.strokeStyle = '#3a2c18'; c.lineWidth = 9; c.beginPath(); c.moveTo(x - W / 2 - 18, y); c.lineTo(x + W / 2 + 18, y); c.stroke();
        c.strokeStyle = OR; c.lineWidth = 5; c.stroke();
        for (const dx of [-W / 2 - 22, W / 2 + 22]) { c.fillStyle = OR_CLAIR; c.beginPath(); c.moveTo(x + dx, y - 9); c.lineTo(x + dx + 7, y); c.lineTo(x + dx, y + 9); c.lineTo(x + dx - 7, y); c.fill(); }
        const drap = new Path2D();
        drap.moveTo(x - W / 2, y + 4); drap.lineTo(x + W / 2, y + 4);
        if (fil) { drap.lineTo(x + W / 2, y + H); drap.lineTo(x, y + H - 34); drap.lineTo(x - W / 2, y + H); }
        else {
          drap.lineTo(x + W / 2, y + H - 10);
          const dents = [[0.38, 22], [0.24, -8], [0.1, 30], [-0.06, 4], [-0.2, 26], [-0.34, -6], [-0.5, 18]];
          for (const [f, d] of dents) drap.lineTo(x + W * f, y + H + d - 14);
        }
        drap.closePath();
        const g = c.createLinearGradient(x - W / 2, 0, x + W / 2, 0);
        if (fil) { g.addColorStop(0, '#d9d2c3'); g.addColorStop(0.45, '#f4efe4'); g.addColorStop(1, '#bcb2a0'); }
        else { g.addColorStop(0, '#0e0a16'); g.addColorStop(0.5, '#24142e'); g.addColorStop(1, '#0e0a16'); }
        c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = g; c.fill(drap); c.restore();
        // couture : serrée et d'or pour le Fil, ouverte et pourpre pour la Déchirure
        c.save(); c.clip(drap);
        c.strokeStyle = fil ? '#e0a63a' : '#c0266e'; c.lineWidth = fil ? 3 : 2.4; c.setLineDash(fil ? [7, 4] : [10, 14]);
        c.strokeRect(x - W / 2 + 12, y + 16, W - 24, H - 40);
        c.setLineDash([]);
        c.restore();
        if (fil) {
          // l'auréole de fil d'or et l'aiguille qui la traverse
          lueur(c, x, y + 112, 70, '#ffd98a', 0.55);
          c.strokeStyle = '#e0a63a'; c.lineWidth = 5; c.beginPath(); c.arc(x, y + 112, 40, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = '#fff3d2'; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.arc(x, y + 112, 40, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
          c.strokeStyle = '#8e7144'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 46, y + 160); c.lineTo(x + 46, y + 64); c.stroke();
          c.fillStyle = '#e0a63a'; c.beginPath(); c.arc(x + 40, y + 76, 4, 0, Math.PI * 2); c.fill();
        } else {
          // l'accroc : la lumière pourpre passe par la déchirure du drap
          const t = new Path2D();
          t.moveTo(x - 18, y + 60); t.lineTo(x + 6, y + 92); t.lineTo(x - 8, y + 112); t.lineTo(x + 20, y + 150); t.lineTo(x + 2, y + 176);
          t.lineTo(x + 10, y + 150); t.lineTo(x - 16, y + 114); t.lineTo(x - 2, y + 94); t.closePath();
          lueur(c, x, y + 118, 90, '#c0266e', 0.75);
          c.fillStyle = '#ff7db0'; c.fill(t);
          c.strokeStyle = 'rgba(255,220,240,0.9)'; c.lineWidth = 1.5; c.stroke(t);
          c.strokeStyle = 'rgba(255,125,176,0.7)'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(x - W / 2 + 6, y + H - 22); c.lineTo(x + W / 2 - 6, y + H - 22); c.stroke();
        }
      };
      banniere(240, true);
      banniere(740, false);
      // le médaillon des Francs-Marcheurs : cuivre riveté, émail vert, une balance
      const mx = 490, my = 300;
      lueur(c, mx, my, 110, '#3e8a6a', 0.45);
      c.fillStyle = '#b9713c'; c.beginPath(); c.arc(mx, my, 52, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#6e3f1c'; c.lineWidth = 3; c.stroke();
      const em = c.createRadialGradient(mx - 10, my - 12, 4, mx, my, 40);
      em.addColorStop(0, '#5fb08c'); em.addColorStop(1, '#2a6650');
      c.fillStyle = em; c.beginPath(); c.arc(mx, my, 38, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2; c.fillStyle = '#e8b98a'; c.beginPath(); c.arc(mx + Math.cos(an) * 45, my + Math.sin(an) * 45, 2.6, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#f2d2a8'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(mx, my - 22); c.lineTo(mx, my + 20); c.moveTo(mx - 22, my - 12); c.lineTo(mx + 22, my - 12); c.moveTo(mx - 12, my + 20); c.lineTo(mx + 12, my + 20); c.stroke();
      for (const d of [-22, 22]) { c.beginPath(); c.moveTo(mx + d - 9, my + 2); c.quadraticCurveTo(mx + d, my + 12, mx + d + 9, my + 2); c.lineTo(mx + d, my - 12); c.closePath(); c.stroke(); }
      texte(c, 'Serment au niveau 20', 490, 42, 18, '#e2c690', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'Le Fil', 240, 372, 26, '#fff3d2', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'La Déchirure', 740, 372, 26, '#ffb3d1', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'Francs-Marcheurs', 490, 382, 17, '#a9dcc3', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'neutres', 490, 406, 14, '#d8b48a', { poids: 600 });
    },

    // La carte du monde peinte : prés, chemins, lac et forêts vus du ciel, la lave de Kaldum, un
    // quadrillage fin, des nuages sur l'inexploré, des pastilles, l'épingle « toi » et sa bulle ;
    // à droite, le continent en 3D : une île flottante et sa falaise, qu'on fait tourner.
    carte(c) {
      ciel(c, '#0a1626', '#14223a');
      const X = 46, Y = 52, W = 600, H = 440, CW = 100, CH = 88;
      const R = rng(29);
      const feuille = new Path2D(); feuille.rect(X, Y, W, H);
      c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 26; c.shadowOffsetY = 10; c.fillStyle = '#4f7c40'; c.fill(feuille); c.restore();
      c.save(); c.clip(feuille);
      // les prés, et leur grain
      const pre = c.createLinearGradient(X, Y, X + W, Y + H); pre.addColorStop(0, '#5f8f4a'); pre.addColorStop(1, '#46723b');
      c.fillStyle = pre; c.fillRect(X, Y, W, H);
      for (let i = 0; i < 260; i++) { c.fillStyle = R() < 0.5 ? 'rgba(20,40,16,0.12)' : 'rgba(200,230,140,0.08)'; c.beginPath(); c.ellipse(X + R() * W, Y + R() * H, 4 + R() * 10, 2 + R() * 5, R() * 3, 0, Math.PI * 2); c.fill(); }
      // Kaldum, en bas à droite : basalte et coulées de lave
      const kal = new Path2D();
      kal.moveTo(X + 360, Y + H); kal.lineTo(X + 380, Y + 330); kal.lineTo(X + 430, Y + 300); kal.lineTo(X + 470, Y + 250); kal.lineTo(X + 540, Y + 236); kal.lineTo(X + W, Y + 210); kal.lineTo(X + W, Y + H); kal.closePath();
      c.fillStyle = '#3e3230'; c.fill(kal);
      c.save(); c.clip(kal);
      for (let i = 0; i < 70; i++) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(X + 360 + R() * 240, Y + 210 + R() * 230, 3 + R() * 9, 0, Math.PI * 2); c.fill(); }
      c.lineCap = 'round';
      for (const [w2, col, a2] of [[16, '#ff6a2b', 0.35], [7, '#ff8a3c', 0.9], [2.5, '#ffe2a8', 0.9]]) {
        c.strokeStyle = rgba(col, a2); c.lineWidth = w2;
        c.beginPath(); c.moveTo(X + 600, Y + 260); c.bezierCurveTo(X + 520, Y + 300, X + 520, Y + 360, X + 450, Y + 440); c.stroke();
        c.beginPath(); c.moveTo(X + 560, Y + 330); c.quadraticCurveTo(X + 590, Y + 390, X + 600, Y + 420); c.stroke();
      }
      c.restore();
      c.strokeStyle = 'rgba(20,14,10,0.6)'; c.lineWidth = 3; c.stroke(kal);
      // le lac et sa rivière, l'écume au bord
      const lac = new Path2D(); lac.ellipse(X + 120, Y + 120, 78, 50, -0.3, 0, Math.PI * 2);
      c.strokeStyle = '#2f6f96'; c.lineWidth = 14; c.lineCap = 'round';
      c.beginPath(); c.moveTo(X + 160, Y + 160); c.bezierCurveTo(X + 200, Y + 250, X + 120, Y + 300, X + 150, Y + H); c.stroke();
      c.fillStyle = '#2f6f96'; c.fill(lac);
      const eau = c.createRadialGradient(X + 110, Y + 110, 6, X + 120, Y + 120, 80); eau.addColorStop(0, '#5fb3d8'); eau.addColorStop(1, 'rgba(47,111,150,0)');
      c.fillStyle = eau; c.fill(lac);
      c.strokeStyle = 'rgba(240,250,255,0.75)'; c.lineWidth = 2; c.setLineDash([5, 4]); c.stroke(lac); c.setLineDash([]);
      // les chemins
      const chemin = pts => { for (const [w2, col] of [[13, '#8a7444'], [8, '#d8c08a']]) { c.strokeStyle = col; c.lineWidth = w2; c.lineCap = 'round'; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(X + x, Y + y) : c.moveTo(X + x, Y + y))); c.stroke(); } };
      chemin([[300, 0], [292, 90], [300, 200], [250, 260], [180, 300], [0, 330]]);
      chemin([[300, 200], [380, 230], [440, 290], [470, 360], [480, 440]]);
      chemin([[300, 200], [420, 160], [600, 150]]);
      // la place du Relais et le village
      c.fillStyle = '#cfc6b4'; c.beginPath(); c.arc(X + 300, Y + 200, 30, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(80,70,50,0.6)'; c.lineWidth = 2; c.stroke();
      const toit = (x, y, w2, h2, col) => { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(X + x + 4, Y + y + 5, w2, h2); c.fillStyle = col; c.fillRect(X + x, Y + y, w2, h2); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(X + x, Y + y, w2, h2 / 2); c.strokeStyle = 'rgba(40,20,10,0.6)'; c.lineWidth = 1.5; c.strokeRect(X + x, Y + y, w2, h2); };
      toit(232, 140, 34, 24, '#a8553a'); toit(340, 130, 28, 30, '#8a4a34'); toit(352, 228, 38, 22, '#a8553a'); toit(220, 220, 26, 26, '#7a4a3a');
      // les forêts : chaque arbre, son ombre, sa lumière
      const arbre = (x, y, r) => {
        c.fillStyle = 'rgba(10,25,10,0.35)'; c.beginPath(); c.ellipse(X + x + r * 0.5, Y + y + r * 0.6, r, r * 0.75, 0, 0, Math.PI * 2); c.fill();
        const g = c.createRadialGradient(X + x - r * 0.35, Y + y - r * 0.35, 1, X + x, Y + y, r);
        g.addColorStop(0, '#7fb35c'); g.addColorStop(1, '#2c5a2a');
        c.fillStyle = g; c.beginPath(); c.arc(X + x, Y + y, r, 0, Math.PI * 2); c.fill();
      };
      for (let i = 0; i < 46; i++) arbre(20 + R() * 200, 230 + R() * 190, 9 + R() * 7);
      for (let i = 0; i < 30; i++) arbre(400 + R() * 190, 20 + R() * 100, 8 + R() * 7);
      for (let i = 0; i < 14; i++) arbre(330 + R() * 60, 300 + R() * 60, 8 + R() * 5);
      // le quadrillage fin des cartes
      c.strokeStyle = 'rgba(255,255,255,0.13)'; c.lineWidth = 1;
      for (let x = X + CW; x < X + W; x += CW) { c.beginPath(); c.moveTo(x, Y); c.lineTo(x, Y + H); c.stroke(); }
      for (let y = Y + CH; y < Y + H; y += CH) { c.beginPath(); c.moveTo(X, y); c.lineTo(X + W, y); c.stroke(); }
      // des nuages sur ce qui n'est pas encore exploré
      const nuage = (x, y, k) => {
        for (const [dx, dy, r] of [[-30, 6, 26], [0, -8, 34], [32, 4, 28], [12, 16, 24], [-12, 18, 22]]) {
          const g = c.createRadialGradient(X + x + dx * k, Y + y + dy * k - r * k * 0.3, 2, X + x + dx * k, Y + y + dy * k, r * k);
          g.addColorStop(0, 'rgba(250,252,255,0.97)'); g.addColorStop(1, 'rgba(205,215,232,0.94)');
          c.fillStyle = g; c.beginPath(); c.arc(X + x + dx * k, Y + y + dy * k, r * k, 0, Math.PI * 2); c.fill();
        }
      };
      c.fillStyle = 'rgba(214,222,236,0.92)'; c.fillRect(X + 500, Y, 100, 176); c.fillRect(X + 400, Y, 100, 88);
      nuage(548, 46, 1.3); nuage(452, 40, 1); nuage(552, 132, 1.1);
      c.restore();
      c.strokeStyle = OR; c.lineWidth = 3; c.strokeRect(X, Y, W, H);
      // les noms de zones, en grand
      texte(c, 'Cimes d\'Orsane', X + 210, Y + 54, 30, '#fff3d2', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'Kaldum', X + 520, Y + 400, 26, '#ffd0b0', { police: 'Cinzel, Georgia, serif', poids: 700 });
      // les pastilles : Relais, donjon, quête, atelier
      const pastille = (x, y, col, fn) => {
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.arc(X + x + 2, Y + y + 3, 15, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#14202e'; c.beginPath(); c.arc(X + x, Y + y, 15, 0, Math.PI * 2); c.fill();
        c.strokeStyle = col; c.lineWidth = 3; c.stroke();
        c.save(); c.translate(X + x, Y + y); fn(); c.restore();
      };
      pastille(300, 200, CRISTAL, () => { c.fillStyle = '#8fe6ff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 0); c.lineTo(0, 9); c.lineTo(-6, 0); c.closePath(); c.fill(); });
      pastille(110, 330, '#a66cff', () => { c.fillStyle = '#d6c0ff'; c.beginPath(); c.moveTo(-6, 8); c.lineTo(-6, -2); c.arc(0, -2, 6, Math.PI, 0); c.lineTo(6, 8); c.closePath(); c.fill(); });
      pastille(380, 120, OR, () => { c.fillStyle = '#ffe2a0'; c.fillRect(-2, -9, 4, 11); c.fillRect(-2, 5, 4, 4); });
      pastille(520, 290, '#ff7a45', () => { c.fillStyle = '#ffc7a8'; c.fillRect(-8, -2, 16, 5); c.fillRect(-3, 3, 6, 6); c.fillRect(-6, -7, 6, 5); });
      // l'épingle « toi » et sa bulle
      lueur(c, X + 300, Y + 170, 40, CRISTAL, 0.6);
      c.fillStyle = CRISTAL; c.beginPath(); c.moveTo(X + 300, Y + 186); c.bezierCurveTo(X + 284, Y + 168, X + 284, Y + 148, X + 300, Y + 146); c.bezierCurveTo(X + 316, Y + 148, X + 316, Y + 168, X + 300, Y + 186); c.fill();
      c.strokeStyle = '#e8fbff'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(X + 300, Y + 160, 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(10,16,26,0.92)'; c.strokeStyle = OR; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(X + 318, Y + 96, 236, 40, 8) : c.rect(X + 318, Y + 96, 236, 40); c.fill(); c.stroke();
      texte(c, '0,0 · Cimes d\'Orsane · niv. 1', X + 436, Y + 116, 16, '#f2e2c9', { poids: 600 });
      // la vue 3D : une île flottante, sa falaise, sa cascade, et l'orbite de la caméra
      const ix = 806, iy = 236;
      lueur(c, ix, iy + 40, 200, CRISTAL, 0.18);
      const ile = (x, y, rx, ry, a2) => {
        c.save(); c.globalAlpha = a2;
        const roc = new Path2D();
        roc.moveTo(x - rx, y); roc.bezierCurveTo(x - rx * 0.9, y + ry * 2.2, x - rx * 0.3, y + ry * 3.4, x - rx * 0.05, y + ry * 4.6);
        roc.bezierCurveTo(x + rx * 0.3, y + ry * 3.3, x + rx * 0.9, y + ry * 2.1, x + rx, y); roc.closePath();
        const rg = c.createLinearGradient(x - rx, y, x + rx, y + ry * 4); rg.addColorStop(0, '#8a7462'); rg.addColorStop(0.5, '#5a4a40'); rg.addColorStop(1, '#241c26');
        c.fillStyle = rg; c.fill(roc);
        c.save(); c.clip(roc); c.strokeStyle = 'rgba(20,14,10,0.35)'; c.lineWidth = 2;
        for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(x - rx, y + ry * i * 0.7); c.quadraticCurveTo(x, y + ry * i * 0.7 + ry * 0.5, x + rx, y + ry * i * 0.7); c.stroke(); }
        c.restore();
        const dessus = new Path2D(); dessus.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        const tg = c.createLinearGradient(x - rx, y - ry, x + rx, y + ry); tg.addColorStop(0, '#7fb35c'); tg.addColorStop(1, '#3e6a34');
        c.fillStyle = tg; c.fill(dessus);
        c.strokeStyle = 'rgba(226,198,144,0.6)'; c.lineWidth = 1.5; c.stroke(dessus);
        c.restore();
      };
      ile(890, 120, 40, 15, 0.55);
      ile(712, 150, 30, 11, 0.45);
      ile(ix, iy, 112, 44, 1);
      // arbres en relief, une maison et la cascade qui tombe du bord
      for (const [dx, dy, r] of [[-60, -6, 13], [-38, 12, 11], [40, -14, 12], [62, 4, 10], [10, -24, 9], [-14, 16, 8]]) {
        c.fillStyle = 'rgba(10,25,10,0.35)'; c.beginPath(); c.ellipse(ix + dx + 4, iy + dy + 4, r, r * 0.45, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#5a3a24'; c.fillRect(ix + dx - 1.5, iy + dy - r * 0.8, 3, r * 0.8);
        const g = c.createRadialGradient(ix + dx - r * 0.3, iy + dy - r * 1.6, 1, ix + dx, iy + dy - r * 1.2, r);
        g.addColorStop(0, '#8fc46a'); g.addColorStop(1, '#2c5a2a');
        c.fillStyle = g; c.beginPath(); c.arc(ix + dx, iy + dy - r * 1.2, r, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = '#cfc6b4'; c.fillRect(ix - 14, iy - 14, 24, 16); c.fillStyle = '#a8553a'; c.beginPath(); c.moveTo(ix - 18, iy - 14); c.lineTo(ix - 2, iy - 26); c.lineTo(ix + 14, iy - 14); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(190,235,255,0.85)'; c.lineWidth = 6; c.beginPath(); c.moveTo(ix + 84, iy + 26); c.quadraticCurveTo(ix + 92, iy + 90, ix + 88, iy + 170); c.stroke();
      lueur(c, ix + 88, iy + 170, 30, '#bfeaff', 0.5);
      // l'orbite de la caméra
      c.strokeStyle = rgba(OR_CLAIR, 0.75); c.lineWidth = 2.5; c.setLineDash([8, 7]);
      c.beginPath(); c.ellipse(ix, iy + 10, 150, 58, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); c.setLineDash([]);
      c.fillStyle = OR_CLAIR; c.beginPath(); c.moveTo(ix - 138, iy + 46); c.lineTo(ix - 124, iy + 30); c.lineTo(ix - 118, iy + 50); c.closePath(); c.fill();
      c.fillStyle = 'rgba(10,16,26,0.9)'; c.strokeStyle = CRISTAL; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(ix - 30, 52, 60, 34, 17) : c.rect(ix - 30, 52, 60, 34); c.fill(); c.stroke();
      texte(c, '3D', ix, 69, 18, '#bff3ff', { poids: 700 });
      // la rose des vents, nord en haut
      c.save(); c.translate(886, 470);
      c.strokeStyle = rgba(OR_CLAIR, 0.8); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 4; i++) { c.fillStyle = i === 0 ? CRISTAL : OR; c.beginPath(); c.moveTo(0, -42); c.lineTo(7, 0); c.lineTo(-7, 0); c.closePath(); c.fill(); c.rotate(Math.PI / 2); }
      c.restore();
    },

    // Les sept Grands Dragons : la boucle de Ruhani dans l'aube, et les sept Écailles, chacune sa forme.
    dragons(c) {
      ciel(c, '#1a1236', '#c98a5a');
      lueur(c, 480, 470, 520, '#ffcf8a', 0.35);
      // la boucle de Ruhani : un ruban d'écailles qui change de couleur selon l'élément
      const pts = [];
      for (let i = 0; i <= 80; i++) { const f = i / 80; pts.push([60 + f * 840, 210 + Math.sin(f * Math.PI * 2.2) * 90 - f * 40]); }
      const cols = ['#6dbb4f', '#ff5a36', '#22b8cf', '#dde4ec'];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x, y] = pts[i], [x2, y2] = pts[i + 1], f = i / pts.length;
        const col = cols[Math.floor(f * 4) % 4], r = 26 - Math.abs(f - 0.5) * 22;
        c.fillStyle = mix(col, '#1a1220', 0.35); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = rgba(mix(col, '#ffffff', 0.4), 0.5); c.lineWidth = 2; c.beginPath(); c.arc(x, y - r * 0.2, r * 0.7, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
        if (i % 6 === 0) lueur(c, x2, y2 - r, r * 1.4, '#fff3d2', 0.35);
      }
      // crinière de lumière
      c.strokeStyle = 'rgba(255,240,200,0.6)'; c.lineWidth = 3;
      for (let i = 0; i < 12; i++) { const [x, y] = pts[Math.floor(i * 6.5)]; c.beginPath(); c.moveTo(x, y - 22); c.quadraticCurveTo(x - 10, y - 55, x - 26, y - 62); c.stroke(); }
      // les sept Écailles
      const E = [['plume', '#cfd6e6'], ['losange', '#62865e'], ['goutte', '#3fc8e9'], ['bouclier', '#2a1d1a'], ['papier', '#1d2a5a'], ['disque', '#e2c690'], ['perdue', '#ffffff']];
      E.forEach(([forme, col], i) => {
        const x = 150 + i * 110, y = 430 + Math.abs(i - 3) * 12, s = 30;
        lueur(c, x, y, 60, forme === 'bouclier' ? '#ff7a45' : col, 0.35);
        c.save(); c.translate(x, y);
        c.lineWidth = 3; c.strokeStyle = OR_CLAIR; c.fillStyle = col;
        c.beginPath();
        if (forme === 'plume') { c.moveTo(0, -s * 1.4); c.quadraticCurveTo(s * 0.8, 0, 0, s * 1.3); c.quadraticCurveTo(-s * 0.5, 0, 0, -s * 1.4); }
        else if (forme === 'losange') { c.moveTo(0, -s * 1.2); c.lineTo(s * 0.9, 0); c.lineTo(0, s * 1.2); c.lineTo(-s * 0.9, 0); }
        else if (forme === 'goutte') { c.moveTo(0, -s * 1.3); c.bezierCurveTo(s * 1.1, 0, s * 0.8, s * 1.1, 0, s * 1.1); c.bezierCurveTo(-s * 0.8, s * 1.1, -s * 1.1, 0, 0, -s * 1.3); }
        else if (forme === 'bouclier') { c.moveTo(-s, -s); c.lineTo(s, -s); c.lineTo(s * 0.8, s * 0.4); c.lineTo(0, s * 1.3); c.lineTo(-s * 0.8, s * 0.4); }
        else if (forme === 'papier') { c.moveTo(-s * 0.8, -s); c.lineTo(s * 0.9, -s * 0.8); c.lineTo(s * 0.7, s); c.lineTo(-s, s * 0.8); }
        else if (forme === 'disque') { c.arc(0, 0, s * 1.05, 0, Math.PI * 2); }
        else { c.setLineDash([5, 5]); c.arc(0, 0, s, 0, Math.PI * 2); }
        c.closePath();
        if (forme !== 'perdue') c.fill();
        c.stroke(); c.setLineDash([]);
        if (forme === 'plume') { c.strokeStyle = '#7fdcf2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -s); c.lineTo(4, -2); c.lineTo(-3, 4); c.lineTo(2, s * 0.8); c.stroke(); }
        if (forme === 'losange') { c.strokeStyle = '#a9cf9f'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.4, -s * 0.3); c.lineTo(s * 0.2, s * 0.4); c.stroke(); lueur(c, 0, 0, 16, '#8db585', 0.6); }
        if (forme === 'goutte') { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-s * 0.5, s * 0.3); c.quadraticCurveTo(0, 0, s * 0.5, s * 0.35); c.stroke(); }
        if (forme === 'bouclier') { c.strokeStyle = '#ff7a45'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -s); c.lineTo(3, -2); c.lineTo(-2, 6); c.lineTo(0, s * 1.2); c.stroke(); }
        if (forme === 'papier') { c.strokeStyle = OR_CLAIR; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, s * 0.45, 0, Math.PI * 2); c.moveTo(0, 0); c.lineTo(s * 0.3, -s * 0.2); c.stroke(); for (let k = 0; k < 6; k++) { c.fillStyle = '#fff3d2'; c.fillRect(Math.cos(k) * s * 0.6, Math.sin(k * 1.3) * s * 0.6, 2, 2); } }
        if (forme === 'disque') { c.strokeStyle = '#fff3d2'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, s * 0.55, 0, Math.PI * 2); c.stroke(); lueur(c, 0, 0, 22, '#fff3d2', 0.7); }
        c.restore();
      });
    },

    // La route des quêtes : un chemin qui monte de région en région, jalons 1, 30, 50, 100.
    quetes(c) {
      ciel(c, '#0c1830', '#3a2e4a');
      const bandes = [['#2a2440', 300], ['#3a2c3a', 350], ['#2c3a3a', 400], ['#3a3226', 450], ['#262a20', 500]];
      bandes.forEach(([col, y], i) => {
        c.fillStyle = col; c.beginPath(); c.moveTo(0, 540);
        for (let x = 0; x <= 960; x += 40) c.lineTo(x, y - 60 + Math.sin(x / 90 + i * 1.7) * 26 - (4 - i) * 20);
        c.lineTo(960, 540); c.closePath(); c.fill();
      });
      const path = [[70, 500], [220, 450], [330, 470], [450, 380], [560, 400], [660, 300], [760, 250], [860, 130]];
      c.strokeStyle = 'rgba(226,198,144,0.85)'; c.lineWidth = 4; c.setLineDash([2, 10]);
      c.beginPath(); path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.setLineDash([]);
      const jalons = [[0, '1', OR], [2, '30', '#ff7a45'], [4, '50', CRISTAL], [7, '100', '#fff3d2']];
      for (const [i, n, col] of jalons) {
        const [x, y] = path[i];
        lueur(c, x, y - 34, 46, col, 0.55);
        c.strokeStyle = 'rgba(20,14,8,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 40); c.stroke();
        c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + 26, y - 34); c.lineTo(x, y - 27); c.closePath(); c.fill();
        texte(c, n, x, y - 62, 24, '#fff3d2', { police: 'Cinzel, Georgia, serif', poids: 700 });
      }
      // l'Écaille d'Aube au sommet
      lueur(c, 860, 80, 110, '#ffd98a', 0.65);
      c.fillStyle = '#e2c690'; c.beginPath(); c.arc(860, 80, 24, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#fff3d2'; c.lineWidth = 2; c.beginPath(); c.arc(860, 80, 14, 0, Math.PI * 2); c.stroke();
      texte(c, 'Orsane', 150, 520, 16, '#e8e1d3'); texte(c, 'Kaldum', 380, 505, 16, '#ffb37a'); texte(c, 'Thessa', 560, 440, 16, '#9ff0e6'); texte(c, 'Lisière', 720, 330, 16, '#f0d6ff');
    },

    // Les trois classes de l'alpha, sur leurs dalles, devant leurs emblèmes.
    classes(c) {
      ciel(c, '#0e1628', '#1c2236');
      const trio = [['sarkan', 'm', 250], ['lyssar', 'f', 480], ['nerith', 'f', 710]];
      for (const [id, , x] of trio) {
        const cl = DATA.classes[id];
        lueur(c, x, 200, 210, cl.color, 0.4);
        embleme(c, x, 186, 108, cl.color, null, 0.75);
      }
      for (const [id, g, x] of trio) {
        const cl = DATA.classes[id];
        const look = typeof Accueil === 'function' && Accueil.apparenceDeClasse ? Accueil.apparenceDeClasse(id, g) : null;
        socle(c, x, 440, 2.4, cl.color, { seule: true });
        veilleur(c, x, 440, 4.6, figure(id, { gender: g, look, facing: id === 'nerith' ? 'sw' : 'se' }));
        texte(c, cl.name, x, 486, 22, '#fff3d2', { police: 'Cinzel, Georgia, serif', poids: 700 });
      }
    },

    // Les caractéristiques : six axes, la répartition, les paliers et un parchemin.
    caracs(c) {
      ciel(c, '#101a2c', '#1a1430');
      const ax = [['Vitalité', '#f07a5c'], ['Sagesse', '#bf95ff'], ['Terra', '#6dbb4f'], ['Ignis', '#ff5a36'], ['Aqua', '#22b8cf'], ['Aer', '#dde4ec']];
      const cx = 330, cy = 280, R = 170, val = [0.55, 0.3, 0.85, 0.4, 0.65, 0.5];
      for (let r = 1; r <= 4; r++) {
        c.beginPath(); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; const x = cx + Math.cos(a) * R * r / 4, y = cy + Math.sin(a) * R * r / 4; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath();
        c.strokeStyle = rgba(OR, 0.25 + r * 0.08); c.lineWidth = 1.5; c.stroke();
      }
      c.beginPath(); val.forEach((v, i) => { const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * R * v, y = cy + Math.sin(a) * R * v; i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath();
      c.fillStyle = 'rgba(0,194,255,0.22)'; c.fill(); c.strokeStyle = CRISTAL; c.lineWidth = 3; c.stroke();
      ax.forEach(([n, col], i) => {
        const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * (R + 38), y = cy + Math.sin(a) * (R + 30);
        lueur(c, cx + Math.cos(a) * R * val[i], cy + Math.sin(a) * R * val[i], 22, col, 0.8);
        texte(c, n, x, y, 20, col, { poids: 700 });
      });
      // +5 par niveau
      lueur(c, 700, 150, 90, OR, 0.5);
      texte(c, '+5', 700, 150, 72, '#fff3d2', { police: 'Cinzel, Georgia, serif', poids: 700 });
      texte(c, 'points par niveau', 700, 205, 20, '#e2c690');
      // les paliers
      [1, 2, 3, 4].forEach((n, i) => {
        const x = 600 + i * 62, hgt = 30 + i * 30;
        c.fillStyle = rgba(mix(OR, '#ffffff', i * 0.1), 0.85); c.fillRect(x, 440 - hgt, 40, hgt);
        c.strokeStyle = '#5c4628'; c.lineWidth = 2; c.strokeRect(x, 440 - hgt, 40, hgt);
        texte(c, String(n), x + 20, 460, 18, '#f2e2c9', { poids: 700 });
      });
      texte(c, 'coût par palier', 693, 495, 16, '#a79f8f');
      // un parchemin roulé
      c.save(); c.translate(880, 340); c.rotate(-0.3);
      c.fillStyle = '#e8dcc0'; c.fillRect(-26, -50, 52, 100);
      c.fillStyle = '#c9b48a'; c.beginPath(); c.ellipse(0, -50, 30, 9, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(0, 50, 30, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#c9472f'; c.beginPath(); c.arc(0, 8, 9, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    // L'interface en fenêtres : trois fenêtres empilées, la barre de menus.
    fenetres(c) {
      ciel(c, '#0d1726', '#152131');
      const fen = (x, y, w, h, titre, fn) => {
        c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x + 8, y + 10, w, h);
        c.fillStyle = '#121c29'; c.fillRect(x, y, w, h);
        c.fillStyle = '#1c2a3d'; c.fillRect(x, y, w, 36);
        c.strokeStyle = OR; c.lineWidth = 2; c.strokeRect(x, y, w, h);
        c.fillStyle = OR_CLAIR; c.font = '700 17px Cinzel, Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(titre, x + 14, y + 19);
        c.textBaseline = 'alphabetic';
        fn(x, y + 36);
      };
      fen(90, 70, 330, 300, 'Caractéristiques', (x, y) => {
        [['Vitalité', '#f07a5c', 0.6], ['Sagesse', '#bf95ff', 0.25], ['Terra', '#6dbb4f', 0.8], ['Ignis', '#ff5a36', 0.35], ['Aqua', '#22b8cf', 0.5], ['Aer', '#dde4ec', 0.45]].forEach(([n, col, v], i) => {
          c.fillStyle = col; c.font = '600 15px Inter, system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(n, x + 16, y + 34 + i * 40);
          c.fillStyle = '#0a0f17'; c.fillRect(x + 110, y + 22 + i * 40, 190, 14);
          c.fillStyle = col; c.fillRect(x + 110, y + 22 + i * 40, 190 * v, 14);
        });
      });
      fen(360, 150, 330, 280, 'Sac', (x, y) => {
        const rar = ['#8a8478', '#62865e', '#3fc8e9', '#a66cff', '#c9a66b'];
        for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) {
          const xx = x + 16 + q * 50, yy = y + 16 + r * 52, col = rar[(r * 7 + q * 3) % 5];
          c.fillStyle = '#172334'; c.fillRect(xx, yy, 42, 42);
          c.strokeStyle = col; c.lineWidth = 2; c.strokeRect(xx, yy, 42, 42);
          if ((r + q) % 3) { c.fillStyle = rgba(col, 0.6); c.beginPath(); c.moveTo(xx + 21, yy + 8); c.lineTo(xx + 34, yy + 21); c.lineTo(xx + 21, yy + 34); c.lineTo(xx + 8, yy + 21); c.closePath(); c.fill(); }
        }
      });
      fen(640, 60, 250, 200, 'Carte', (x, y) => {
        for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) {
          if ((r * 3 + q) % 5 === 0) continue;
          c.fillStyle = (q + r) % 4 ? '#3a4a3a' : '#5a4a2a'; c.fillRect(x + 16 + q * 31, y + 12 + r * 28, 27, 24);
        }
        c.strokeStyle = CRISTAL; c.lineWidth = 3; c.strokeRect(x + 16 + 3 * 31, y + 12 + 2 * 28, 27, 24);
      });
      // barre de menus
      for (let i = 0; i < 9; i++) {
        const x = 250 + i * 54, y = 490;
        c.fillStyle = '#16212f'; c.beginPath(); c.arc(x, y, 21, 0, Math.PI * 2); c.fill();
        c.strokeStyle = i === 2 ? CRISTAL : OR; c.lineWidth = 2; c.stroke();
        c.fillStyle = i === 2 ? '#bff3ff' : OR_CLAIR; c.font = '700 13px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('CPIQUBMJO'[i], x, y + 1); c.textBaseline = 'alphabetic';
      }
    },
  };

  function actu(cv, art) {
    const { c, w, h } = prepare(cv);
    plan(c, w, h, cc => (ACTUS[art] || ACTUS.carte)(cc));
    // vignettage
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(3,6,12,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  // Petit aléa déterministe : une illustration est la même à chaque dessin.
  function rng(seed) { return Util.mulberry32(seed); }

  // Les illustrations d'artiste des classes (assets/classes/<id>.webp, docs/PIPELINE-IMAGES.md) :
  // seules les classes listées ici sont demandées, une fois chacune. Un fichier absent coûterait
  // une erreur dans la console à chaque classe ; on ajoute l'id quand l'image arrive.
  const ILLUSTREES = ['lyssar'];
  const images = new Map();
  function imageClasse(id, quand) {
    if (!ILLUSTREES.includes(id)) { quand({ etat: 'absente' }); return null; }
    let e = images.get(id);
    if (!e) {
      e = { etat: 'attente', img: new Image(), suite: [] };
      images.set(id, e);
      e.img.decoding = 'async';
      e.img.onload = () => { e.etat = 'ok'; for (const f of e.suite.splice(0)) f(e); };
      e.img.onerror = () => { e.etat = 'absente'; for (const f of e.suite.splice(0)) f(e); };
      e.img.src = `assets/classes/${id}.webp`;
    }
    if (e.etat === 'attente') e.suite.push(quand); else quand(e);
    return e;
  }

  return {
    set painter(p) { painter = p; }, get painter() { return painter; },
    prepare, veilleur, figure, buste, enPied, socle, tournant, embleme, illustration, particules, dessinerParticules, monde, moitie, actu, imageClasse, imageTour, lueur, eclat, rgba,
  };
})();
