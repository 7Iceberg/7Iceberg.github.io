(() => {
  const app = document.getElementById('app');
  const m = /[?&]perso=([a-z0-9]+)/i.exec(location.search);
  let v = m ? (m[1] === 'charte' ? 'charte' : '0') : null;
  if (m) { try { localStorage.setItem('veylan.perso', v); } catch (e) {   } }
  if (v == null) { try { v = localStorage.getItem('veylan.perso'); } catch (e) { v = null; } }
  Renderer.charte = v === 'charte';
  if (app) app.classList.toggle('vy-perso-charte', Renderer.charte);

  const SEUIL = 0.58;
  function aplats(c) {
    const proto = Object.getPrototypeOf(c);
    const dFill = Object.getOwnPropertyDescriptor(proto, 'fillStyle'), dStroke = Object.getOwnPropertyDescriptor(proto, 'strokeStyle');
    const lin = proto.createLinearGradient, rad = proto.createRadialGradient;
    if (!dFill || !lin) return () => {};
    const faux = (fn, args) => ({ __cel: true, stops: [], addColorStop(o, col) { this.stops.push([o, col]); },
      vrai(ctx) {
        const g = fn.apply(ctx, args), s = this.stops.slice().sort((a, b) => a[0] - b[0]);
        if (!s.length) return g;
        const clair = s.length > 2 ? s[1][1] : s[0][1], ombre = s[s.length - 1][1];
        g.addColorStop(0, clair); g.addColorStop(SEUIL, clair); g.addColorStop(Math.min(1, SEUIL + 0.001), ombre); g.addColorStop(1, ombre);
        return g;
      } });
    const reel = v => (v && v.__cel ? v.vrai(c) : v);
    Object.defineProperty(c, 'fillStyle', { configurable: true, get() { return dFill.get.call(this); }, set(x) { dFill.set.call(this, reel(x)); } });
    if (dStroke) Object.defineProperty(c, 'strokeStyle', { configurable: true, get() { return dStroke.get.call(this); }, set(x) { dStroke.set.call(this, reel(x)); } });
    c.createLinearGradient = (...a) => faux(lin, a);
    c.createRadialGradient = (...a) => faux(rad, a);
    return () => { delete c.fillStyle; delete c.strokeStyle; delete c.createLinearGradient; delete c.createRadialGradient; };
  }

  const R = Renderer.prototype;
  const mix = (a, b, t) => Renderer.mix(a, b, t);
  const TETE = 1.2;

  R.drawHeroCharte = function (c, p, s, color, ink, rim, top) {
    const fin = aplats(c);
    try { this.heroCharte(c, p, s, color, ink, rim, top); } finally { fin(); }
  };

  R.heroCharte = function (c, p, s, color, ink, rim, top) {
    const L = Renderer.heroLook(s);
    const [skin, , tenue, tenue2, capeC, lantern] = L.couleurs;
    const facing = Renderer.FACINGS.includes(s.facing) ? s.facing : 'se';
    const back = facing === 'ne' || facing === 'nw', flip = facing === 'sw' || facing === 'nw';
    const T = s.trait || 1, lw = w => w * T;
    const fem = s.gender !== 'm';
    const body = s.flash ? '#ffffff' : tenue;
    ink = mix(tenue, '#120a14', 0.72);
    const X = p.x, Y = p.y, by = top + 11;
    const hx = X + (back ? 0 : 0.9), hy = top + 1;
    const sig = SIGNATURES[s.glyph] || {};
    const sw = fem ? 10 : 11.6, ww = fem ? 7.4 : 9, hw = fem ? 10.8 : 10.2;
    const o = { X, Y, top, by, hx, hy, ink, back, L, s, lw, sw, peintre: this };
    c.save();
    if (flip) { c.translate(2 * X, 0); c.scale(-1, 1); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    const arm = (x0, y0, x1, y1, x2, y2, col) => {
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x1, y1, x2, y2);
      c.lineWidth = 4.2 + lw(2.2); c.strokeStyle = ink; c.stroke();
      c.lineWidth = 4.2; c.strokeStyle = col; c.stroke();
    };
    const rMain = sig.poings ? 4.2 : 3;
    const hand = (x, y) => { c.beginPath(); c.arc(x, y, rMain, 0, Math.PI * 2); c.lineWidth = lw(1.8); c.strokeStyle = ink; c.stroke(); c.fillStyle = skin; c.fill();
      c.fillStyle = mix(skin, '#6a3424', 0.35); c.beginPath(); c.arc(x + rMain * 0.35, y + rMain * 0.3, rMain * 0.55, 0, Math.PI * 2); c.fill(); };
    const sleeve = mix(body, '#0a0d18', 0.22);
    if (sig.dos) sig.dos(c, o);
    if (!back) {
      this.heroCape(c, X, Y, top, capeC, ink, rim, lw);
      if (!sig.coiffe) tete(c, hx, hy, () => this.heroHair(c, 'arriere', L, hx, hy, ink, rim, T));
    }
    const boot = mix(tenue2, '#07080e', 0.55);
    for (const x of [X - 9, X + 3.4]) {
      Util.roundRect(c, x, Y - 13, 5.6, 12, 2.2);
      c.fillStyle = tenue2; c.fill(); c.lineWidth = lw(1.8); c.strokeStyle = ink; c.stroke();
      c.fillStyle = mix(tenue2, '#000000', 0.25); c.fillRect(x + 3.2, Y - 12, 1.8, 10);
      const b = new Path2D(), w = 7.2, x0 = x - 0.8;
      b.moveTo(x0, Y - 7.2); b.lineTo(x0 + w, Y - 7.2);
      if (back) { b.lineTo(x0 + w, Y - 1); b.quadraticCurveTo(x0 + w, Y + 0.6, x0 + w - 1.4, Y + 0.6); }
      else { b.lineTo(x0 + w, Y - 3.6); b.quadraticCurveTo(x0 + w + 3.4, Y - 3.4, x0 + w + 3.6, Y - 1.2); b.quadraticCurveTo(x0 + w + 3.6, Y + 0.6, x0 + w + 1.6, Y + 0.6); }
      b.lineTo(x0 + 1, Y + 0.6); b.quadraticCurveTo(x0, Y + 0.6, x0, Y - 0.6); b.closePath();
      c.fillStyle = boot; c.fill(b); c.lineWidth = lw(1.8); c.strokeStyle = ink; c.stroke(b);
      c.fillStyle = mix(boot, '#ffffff', 0.22); c.fillRect(x0, Y - 7.2, w, 1.6);
    }
    if (!back) { arm(X - 8.6, by + 3, X - 12.4, by + 9.5, X - 12, by + 16, sleeve); hand(X - 12, by + 16.8); }
    const tp = new Path2D();
    tp.moveTo(X - sw + 2.8, by); tp.lineTo(X + sw - 2.8, by);
    tp.quadraticCurveTo(X + sw, by, X + sw, by + 3.2);
    tp.quadraticCurveTo(X + sw, by + 9, X + ww, by + 13.5);
    tp.quadraticCurveTo(X + hw, by + 17, X + hw, by + 19.6);
    tp.quadraticCurveTo(X + hw, by + 22, X + hw - 2.6, by + 22);
    tp.lineTo(X - hw + 2.6, by + 22);
    tp.quadraticCurveTo(X - hw, by + 22, X - hw, by + 19.6);
    tp.quadraticCurveTo(X - hw, by + 17, X - ww, by + 13.5);
    tp.quadraticCurveTo(X - sw, by + 9, X - sw, by + 3.2);
    tp.quadraticCurveTo(X - sw, by, X - sw + 2.8, by);
    tp.closePath();
    const half = Math.max(sw, hw);
    this.shadeBody(c, tp, [X - half, by, X + half, by + 22], body, ink, rim, T);
    if (back) {
      this.heroCapeDos(c, X, Y, by, capeC, ink, rim, lw);
      arm(X - 9, by + 3.4, X - 12.6, by + 9.5, X - 12.6, by + 15.6, sleeve); hand(X - 12.6, by + 16.4);
      arm(X + 9, by + 3.4, X + 12.6, by + 9.5, X + 12.8, by + 15.2, sleeve); hand(X + 12.8, by + 16);
    } else {
      arm(X + 8.6, by + 3, X + 12.6, by + 8.5, X + 13.6, by + 13.6, body);
      c.fillStyle = mix(body, '#ffffff', 0.25);
      c.beginPath(); c.moveTo(X - 5.4, by + 0.5); c.lineTo(X + 0.6, by + 4.6); c.lineTo(X + 6.4, by + 0.5); c.closePath(); c.fill();
      c.fillStyle = '#3a2a20'; c.fillRect(X - ww - 0.6, by + 12.6, 2 * ww + 1.2, 3.4);
      c.fillStyle = '#e2c690'; c.fillRect(X - 1.4, by + 12.2, 4, 4.2);
    }
    if (sig.corps) sig.corps(c, o);
    c.fillStyle = mix(skin, '#6a3424', 0.3); c.fillRect(hx - 2.6, hy + 7, 5.2, 5);
    tete(c, hx, hy, () => {
      if (!back) { c.beginPath(); c.ellipse(hx - 8.4, hy + 1.8, 1.7, 2.3, -0.2, 0, Math.PI * 2); c.lineWidth = lw(1.5); c.strokeStyle = ink; c.stroke(); c.fillStyle = skin; c.fill(); }
      const hg = c.createRadialGradient(hx - 3, hy - 3, 1, hx, hy, 10);
      hg.addColorStop(0, skin); hg.addColorStop(0.7, skin); hg.addColorStop(1, mix(skin, '#6a3424', 0.3));
      c.beginPath(); c.arc(hx, hy, 9, 0, Math.PI * 2);
      c.lineWidth = lw(3); c.strokeStyle = ink; c.stroke(); c.fillStyle = hg; c.fill();
      if (back) { if (!sig.coiffe) this.heroHair(c, 'dos', L, hx, hy, ink, rim, T); }
      else { yeux(c, hx, hy, L, fem, sig); if (!sig.coiffe) this.heroHair(c, 'avant', L, hx, hy, ink, rim, T); }
      if (sig.coiffe) sig.coiffe(c, o);
    });
    this.drawProp(c, p, s, top, by, ink, lantern, T, back);
    if (!back) hand(X + 13.6, by + 14.4);
    c.restore();
  };

  function tete(c, hx, hy, fn) { c.save(); c.translate(hx, hy); c.scale(TETE, TETE); c.translate(-hx, -hy); fn(); c.restore(); }

  function yeux(c, hx, hy, L, fem, sig) {
    const skin = L.couleurs[0], hair = L.couleurs[1], ex = hx + 0.6, ey = hy + 1.8;
    c.fillStyle = 'rgba(236,120,104,0.28)';
    c.beginPath(); c.ellipse(ex - 5, hy + 5, 1.7, 1, 0, 0, Math.PI * 2); c.ellipse(ex + 4.7, hy + 5, 1.7, 1, 0, 0, Math.PI * 2); c.fill();
    if (sig.masque) return sig.masque(c, ex, ey, hy, L);
    c.fillStyle = '#1a1220';
    c.beginPath(); c.ellipse(ex - 3.5, ey, 1.35, 2.1, 0, 0, Math.PI * 2); c.ellipse(ex + 3.3, ey, 1.5, 2.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    for (const dx of [-3.4, 3.4]) { c.beginPath(); c.arc(ex + dx - 0.3, ey - 0.8, 0.65, 0, Math.PI * 2); c.fill(); }
    const fronce = sig.fronce ? 0.9 : 0;
    c.strokeStyle = mix(hair, '#0a0810', 0.45); c.lineWidth = fem ? 0.9 : 1.25;
    c.beginPath(); c.moveTo(ex - 5, ey - 3.1 - fronce * 0.4); c.quadraticCurveTo(ex - 3.6, ey - 4.2, ex - 2.1, ey - 3.3 + fronce);
    c.moveTo(ex + 1.8, ey - 3.3 + fronce); c.quadraticCurveTo(ex + 3.4, ey - 4.3, ex + 4.9, ey - 3.1 - fronce * 0.4); c.stroke();
    c.strokeStyle = mix(skin, '#4a1c1c', 0.55); c.lineWidth = 0.8;
    c.beginPath();
    if (sig.fronce) { c.moveTo(ex - 1.4, hy + 6.4); c.lineTo(ex + 1.4, hy + 6.1); }
    else { c.moveTo(ex - 1.4, hy + 5.9); c.quadraticCurveTo(ex, hy + 6.7, ex + 1.4, hy + 5.9); }
    c.stroke();
  }

  function piece(c, k, col, ink, lw, epais) {
    c.lineWidth = lw(epais || 2.2); c.strokeStyle = ink; c.stroke(k);
    c.fillStyle = col; c.fill(k);
    const bb = k.__bb;
    if (bb) { c.save(); c.clip(k); c.fillStyle = mix(col, '#0a0d18', 0.32); c.fillRect(bb[0] + (bb[2] - bb[0]) * 0.58, bb[1], bb[2] - bb[0], bb[3] - bb[1]); c.restore(); }
  }
  const chemin = (pts, bb) => { const k = new Path2D(); pts.forEach(([a, b], i) => (i ? k.lineTo(a, b) : k.moveTo(a, b))); k.closePath(); k.__bb = bb; return k; };

  const SIGNATURES = {
    S: {
      fronce: true,
      corps(c, o) {
        if (o.back) return;
        const { X, by, ink, lw, sw } = o;
        const k = new Path2D(); k.moveTo(X + sw - 6, by - 1.2); k.quadraticCurveTo(X + sw + 3, by - 4.5, X + sw + 6.2, by + 2.2);
        k.quadraticCurveTo(X + sw + 3.4, by + 6.4, X + sw - 3.2, by + 5.6); k.closePath(); k.__bb = [X + sw - 6, by - 4.5, X + sw + 6.2, by + 6.4];
        piece(c, k, '#e0b552', ink, lw, 2.4);
        c.fillStyle = '#fff0c2'; c.beginPath(); c.arc(X + sw + 1, by + 1, 1, 0, Math.PI * 2); c.fill();
      },
      coiffe(c, o) {
        const { hx, hy, ink, lw, back, L, s: fig } = o;
        o.peintre.heroHair(c, back ? 'dos' : 'avant', L, hx, hy, ink, '#9cecff', fig.trait || 1);
        c.lineWidth = lw(3.6); c.strokeStyle = ink; c.beginPath(); c.moveTo(hx - 9.2, hy - 2.6); c.quadraticCurveTo(hx, hy - 6, hx + 9.2, hy - 2.6); c.stroke();
        c.lineWidth = 2.4; c.strokeStyle = '#c23a2e'; c.stroke();
        const k = chemin([[hx - 8.6, hy - 2.8], [hx - 16.5, hy + 0.2], [hx - 15, hy + 3.4], [hx - 8.4, hy - 1]], [hx - 16.5, hy - 2.8, hx - 8.4, hy + 3.4]);
        piece(c, k, '#c23a2e', ink, lw, 1.6);
      },
    },
    L: {
      dos(c, o) {
        const { X, by, ink, lw } = o;
        const q = chemin([[X - 10, by - 6], [X - 6, by - 7], [X - 2, by + 14], [X - 6.5, by + 15]], [X - 10, by - 7, X - 2, by + 15]);
        piece(c, q, '#7a5232', ink, lw, 2);
        for (const [dx, col] of [[-8.6, '#f2f0e6'], [-6.4, '#d9452b'], [-4.4, '#f2f0e6']]) { c.fillStyle = col; c.beginPath(); c.moveTo(X + dx, by - 7); c.lineTo(X + dx - 1.4, by - 11); c.lineTo(X + dx + 1.4, by - 11); c.closePath(); c.fill(); }
      },
      coiffe(c, o) {
        const { hx, hy, ink, lw, L, back } = o, capeC = L.couleurs[4];
        const k = new Path2D();
        k.moveTo(hx - 10.4, hy + 5); k.quadraticCurveTo(hx - 12, hy - 8, hx - 2, hy - 11.6);
        k.quadraticCurveTo(hx + 3, hy - 12.4, hx - 13.5, hy - 17.5);
        k.quadraticCurveTo(hx + 10, hy - 14, hx + 10.6, hy - 1); k.quadraticCurveTo(hx + 10.6, hy + 4.4, hx + 8.6, hy + 6);
        if (!back) { k.quadraticCurveTo(hx + 6, hy - 6.4, hx - 0.5, hy - 6.8); k.quadraticCurveTo(hx - 7, hy - 6.6, hx - 8.2, hy + 5.8); }
        k.closePath(); k.__bb = [hx - 13.5, hy - 17.5, hx + 10.6, hy + 6];
        piece(c, k, capeC, ink, lw, 2.4);
        if (!back) { c.fillStyle = L.couleurs[1]; c.beginPath(); c.moveTo(hx - 4, hy - 6.4); c.quadraticCurveTo(hx + 1, hy - 3.4, hx + 5.6, hy - 5.6); c.quadraticCurveTo(hx + 1, hy - 7, hx - 4, hy - 6.4); c.fill(); }
      },
    },
    Kr: {
      fronce: true,
      coiffe(c, o) {
        const { hx, hy, ink, lw, L, back } = o, hair = L.couleurs[1];
        const pics = [[-9, 1, -14, -9], [-6, -6, -8.5, -18], [0, -8.5, 1, -21], [5.5, -7, 9.5, -17.5], [9, -1, 14.5, -9]];
        const k = new Path2D(); k.moveTo(hx - 9.4, hy + 3.6);
        for (const [a, b, d, e] of pics) { k.lineTo(hx + d, hy + e); k.lineTo(hx + a + 2.6, hy + b); }
        k.lineTo(hx + 9.6, hy + 2.6);
        if (!back) { k.quadraticCurveTo(hx + 5, hy - 5, hx, hy - 4.6); k.quadraticCurveTo(hx - 6, hy - 4.4, hx - 9.4, hy + 3.6); }
        else k.quadraticCurveTo(hx, hy + 9, hx - 9.4, hy + 3.6);
        k.closePath(); k.__bb = [hx - 14.5, hy - 21, hx + 14.5, hy + 4];
        piece(c, k, hair, ink, lw, 2.4);
        for (const [, , d, e] of pics) { c.fillStyle = '#ff8a3a'; c.beginPath(); c.arc(hx + d * 0.92, hy + e * 0.9 + 1, 1.5, 0, Math.PI * 2); c.fill(); }
      },
    },
    O: {
      dos(c, o) {
        const { hx, hy, back } = o;
        if (back) return;
        const cx = hx, cy = hy - 2 * TETE;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55; c.drawImage(Renderer.dot('#ffd166'), cx - 22, cy - 22, 44, 44); c.restore();
        c.fillStyle = '#ffe08a'; c.strokeStyle = mix('#ffd166', '#3a2a08', 0.7); c.lineWidth = 1.4;
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (1.05 + i * 0.1125), r0 = 12.6, r1 = 18.5 + (i % 2) * 2.4;
          c.beginPath(); c.moveTo(cx + Math.cos(a - 0.07) * r0, cy + Math.sin(a - 0.07) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a + 0.07) * r0, cy + Math.sin(a + 0.07) * r0); c.closePath(); c.stroke(); c.fill();
        }
      },
    },
    N: {
      fronce: true,
      masque(c, ex, ey, hy, L) {
        c.fillStyle = '#1a1220';
        c.beginPath(); c.ellipse(ex - 3.5, ey - 0.2, 1.6, 1.2, 0.2, 0, Math.PI * 2); c.ellipse(ex + 3.3, ey - 0.2, 1.7, 1.2, -0.2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex - 3.8, ey - 0.6, 0.5, 0, Math.PI * 2); c.arc(ex + 3, ey - 0.6, 0.5, 0, Math.PI * 2); c.fill();
        const k = new Path2D(); k.moveTo(ex - 9.4, ey + 1.6); k.quadraticCurveTo(ex, ey + 0.6, ex + 9, ey + 1.4); k.quadraticCurveTo(ex + 8, hy + 9, ex, hy + 9.6); k.quadraticCurveTo(ex - 8, hy + 9, ex - 9.4, ey + 1.6); k.closePath();
        c.fillStyle = mix(L.couleurs[4], '#0a0a14', 0.25); c.fill(k);
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(ex - 4, ey + 3.6); c.quadraticCurveTo(ex, ey + 4.6, ex + 4, ey + 3.6); c.stroke();
      },
      dos(c, o) {
        const { hx, hy, ink, lw, L } = o, col = mix(L.couleurs[4], '#0a0a14', 0.25);
        const k1 = chemin([[hx - 6, hy + 8], [hx - 22, hy + 6], [hx - 25, hy + 11], [hx - 7, hy + 11]], [hx - 25, hy + 6, hx - 6, hy + 11]);
        const k2 = chemin([[hx - 6, hy + 9], [hx - 18, hy + 14], [hx - 19, hy + 18], [hx - 6, hy + 12]], [hx - 19, hy + 9, hx - 6, hy + 18]);
        piece(c, k1, col, ink, lw, 1.8); piece(c, k2, col, ink, lw, 1.8);
      },
    },
    T: {
      fronce: true, poings: true,
      corps(c, o) {
        const { X, by, ink, lw, sw } = o;
        for (const d of o.back ? [-1, 1] : [1, -1]) {
          const x = X + d * (sw - 1);
          const k = chemin([[x - 7.4, by + 3], [x - 6, by - 7.6], [x - 1, by - 12.4], [x + 5.4, by - 9.6], [x + 8.6, by - 1.4], [x + 6, by + 6.4], [x - 3, by + 7.2]], [x - 7.4, by - 12.4, x + 8.6, by + 7.2]);
          piece(c, k, '#9a8f7e', ink, lw, 2.4);
          c.strokeStyle = 'rgba(40,30,20,0.55)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x - 2.4, by - 8); c.lineTo(x + 0.6, by - 2); c.lineTo(x + 4.2, by - 2.6); c.moveTo(x - 4.6, by + 1); c.lineTo(x - 1.4, by + 3.4); c.stroke();
        }
      },
    },
  };

  Object.assign(SIGNATURES, {
    V: {
      dos(c, o) {
        const { X, by, ink, lw, L } = o, col = mix(L.couleurs[4], '#ffffff', 0.12);
        for (const d of [-1, 1]) {
          const k = chemin([[X + d * 3, by + 3], [X + d * 12.4, by - 15], [X + d * 11.4, by + 3]], [Math.min(X + d * 3, X + d * 12.4), by - 15, Math.max(X + d * 3, X + d * 12.4), by + 3]);
          piece(c, k, col, ink, lw, 2);
        }
        c.save(); c.lineCap = 'round';
        for (const [d, a] of [[-1, 0.75], [1, 0.55]]) {
          c.globalAlpha = a; c.strokeStyle = '#d6ecff'; c.lineWidth = lw(3);
          c.beginPath(); c.moveTo(X + d * 2, by + 21); c.bezierCurveTo(X + d * 20, by + 20, X + d * 21, by + 2, X + d * 14, by - 2); c.stroke();
          c.lineWidth = lw(1.6); c.beginPath(); c.arc(X + d * 15.5, by + 1.5, 2.6, 0, Math.PI * 1.6); c.stroke();
        }
        c.restore();
      },
    },
    K: {
      dos(c, o) {
        const { X, by, ink, lw } = o;
        const k = chemin([[X - 9, by - 2], [X + 9, by - 2], [X + 10, by + 15], [X - 10, by + 15]], [X - 10, by - 2, X + 10, by + 15]);
        piece(c, k, '#7a5a3a', ink, lw, 2.2);
        c.save(); c.translate(X - 9, by - 2);
        c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 6.4 : 8; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath();
        c.lineWidth = lw(2); c.strokeStyle = ink; c.stroke(); c.fillStyle = '#c98a3a'; c.fill();
        c.fillStyle = '#5a3a1a'; c.beginPath(); c.arc(0, 0, 2.4, 0, Math.PI * 2); c.fill(); c.restore();
        Util.roundRect(c, X + 4, by - 11, 4, 10, 1); c.fillStyle = '#5c5f6a'; c.fill(); c.lineWidth = lw(1.6); c.strokeStyle = ink; c.stroke();
      },
      coiffe(c, o) {
        const { hx, hy, ink, lw, back, L, s: fig } = o;
        o.peintre.heroHair(c, back ? 'dos' : 'avant', L, hx, hy, ink, '#9cecff', fig.trait || 1);
        c.lineWidth = lw(3); c.strokeStyle = ink; c.beginPath(); c.moveTo(hx - 9.4, hy - 3); c.quadraticCurveTo(hx, hy - 6.6, hx + 9.4, hy - 3); c.stroke();
        c.lineWidth = 1.8; c.strokeStyle = '#4a3a2a'; c.stroke();
        if (back) return;
        for (const dx of [-3.6, 3.8]) { c.beginPath(); c.arc(hx + dx, hy - 5.6, 3.3, 0, Math.PI * 2); c.lineWidth = lw(2.2); c.strokeStyle = ink; c.stroke(); c.fillStyle = '#c98a3a'; c.fill(); c.fillStyle = '#9fe3f0'; c.beginPath(); c.arc(hx + dx, hy - 5.6, 2, 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(hx + dx - 0.7, hy - 6.3, 0.6, 0, Math.PI * 2); c.fill(); }
      },
    },
    M: {
      coiffe(c, o) {
        const { hx, hy, ink, lw, back, L, s: fig } = o, col = L.couleurs[4];
        o.peintre.heroHair(c, back ? 'dos' : 'avant', L, hx, hy, ink, '#9cecff', fig.trait || 1);
        const plume = new Path2D(); plume.moveTo(hx + 4, hy - 11); plume.bezierCurveTo(hx + 14, hy - 22, hx + 20, hy - 18, hx + 17, hy - 12); plume.quadraticCurveTo(hx + 11, hy - 13, hx + 4, hy - 11); plume.closePath(); plume.__bb = [hx + 4, hy - 22, hx + 20, hy - 11];
        piece(c, plume, '#f2f0e6', ink, lw, 1.6);
        const k = new Path2D(); k.moveTo(hx - 7, hy - 7); k.quadraticCurveTo(hx - 6, hy - 16, hx, hy - 16); k.quadraticCurveTo(hx + 6, hy - 16, hx + 7, hy - 7); k.closePath(); k.__bb = [hx - 7, hy - 16, hx + 7, hy - 7];
        piece(c, k, col, ink, lw, 2.2);
        const bord = new Path2D(); bord.ellipse(hx, hy - 6.6, 15, 3.6, 0, 0, Math.PI * 2); bord.__bb = [hx - 15, hy - 10.2, hx + 15, hy - 3];
        piece(c, bord, col, ink, lw, 2.2);
        c.fillStyle = '#a8e6d8'; c.fillRect(hx - 6.8, hy - 9.4, 13.6, 2);
      },
    },
    F: {
      coiffe(c, o) {
        const { hx, hy, ink, lw, back } = o, fur = '#8a6a4a';
        for (const d of [-1, 1]) { const k = chemin([[hx + d * 3, hy - 9], [hx + d * 9.5, hy - 19.5], [hx + d * 10, hy - 6]], [Math.min(hx + d * 3, hx + d * 10), hy - 19.5, Math.max(hx + d * 3, hx + d * 10), hy - 6]); piece(c, k, fur, ink, lw, 2.2); c.fillStyle = '#e8b9a0'; c.beginPath(); c.moveTo(hx + d * 5, hy - 10); c.lineTo(hx + d * 8.8, hy - 16); c.lineTo(hx + d * 8.8, hy - 9); c.closePath(); c.fill(); }
        const k = new Path2D(); k.moveTo(hx - 10.6, hy + 5); k.quadraticCurveTo(hx - 12, hy - 11, hx, hy - 11.4); k.quadraticCurveTo(hx + 12, hy - 11, hx + 10.6, hy + 5);
        if (!back) { k.quadraticCurveTo(hx + 7, hy - 6.6, hx, hy - 6.8); k.quadraticCurveTo(hx - 7, hy - 6.6, hx - 10.6, hy + 5); }
        k.closePath(); k.__bb = [hx - 12, hy - 11.4, hx + 12, hy + 5];
        piece(c, k, fur, ink, lw, 2.4);
      },
      corps(c, o) {
        const { X, by, ink, lw } = o;
        const k = new Path2D(); k.moveTo(X - 13, by + 3); k.quadraticCurveTo(X, by - 5, X + 13, by + 3); k.quadraticCurveTo(X + 8, by + 7, X + 4, by + 5); k.quadraticCurveTo(X, by + 8, X - 4, by + 5); k.quadraticCurveTo(X - 8, by + 7, X - 13, by + 3); k.closePath(); k.__bb = [X - 13, by - 5, X + 13, by + 8];
        piece(c, k, '#a98564', ink, lw, 2);
      },
    },
    Vm: {
      coiffe(c, o) {
        const { hx, hy, ink, lw, back } = o, col = '#2aa6b8';
        const crete = new Path2D(); crete.moveTo(hx - 6, hy - 9); crete.quadraticCurveTo(hx - 2, hy - 22, hx + 10, hy - 20); crete.quadraticCurveTo(hx + 6, hy - 14, hx + 7, hy - 8); crete.closePath(); crete.__bb = [hx - 6, hy - 22, hx + 10, hy - 8];
        piece(c, crete, mix(col, '#ffffff', 0.35), ink, lw, 2);
        const k = new Path2D(); k.moveTo(hx - 10.4, hy + 2); k.quadraticCurveTo(hx - 11, hy - 11.4, hx, hy - 11.6); k.quadraticCurveTo(hx + 11, hy - 11.4, hx + 10.4, hy + 2);
        if (!back) { k.lineTo(hx + 8, hy + 1); k.quadraticCurveTo(hx + 6, hy - 5, hx, hy - 5.2); k.quadraticCurveTo(hx - 6, hy - 5, hx - 8, hy + 1); }
        k.closePath(); k.__bb = [hx - 11, hy - 11.6, hx + 11, hy + 2];
        piece(c, k, col, ink, lw, 2.4);
        c.strokeStyle = mix(col, '#0a2030', 0.5); c.lineWidth = 0.8; c.beginPath();
        for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) { c.moveTo(hx, hy - 5.4); c.lineTo(hx + Math.sin(a) * 10, hy - 5.4 - Math.cos(a) * 5.8); } c.stroke();
      },
    },
    Ov: {
      dos(c, o) {
        const { X, by, ink, lw } = o;
        c.lineWidth = lw(4.4); c.strokeStyle = ink; c.beginPath(); c.moveTo(X + 10, by + 22); c.lineTo(X - 12, by - 12); c.stroke();
        c.lineWidth = 3; c.strokeStyle = '#8a6a46'; c.stroke();
        const k = new Path2D(); k.moveTo(X - 24, by - 6); k.quadraticCurveTo(X - 18, by - 17, X - 4, by - 19); k.quadraticCurveTo(X - 12, by - 13, X - 15, by - 7); k.quadraticCurveTo(X - 19, by - 9, X - 24, by - 6); k.closePath(); k.__bb = [X - 24, by - 19, X - 4, by - 6];
        piece(c, k, '#aab0bc', ink, lw, 2);
      },
      coiffe(c, o) {
        const { hx, hy, ink, lw, back, L, s: fig } = o, col = '#c9a24a';
        o.peintre.heroHair(c, back ? 'dos' : 'arriere', L, hx, hy, ink, '#9cecff', fig.trait || 1);
        const k = new Path2D(); k.moveTo(hx - 11, hy - 1.6); k.quadraticCurveTo(hx - 10, hy - 13, hx, hy - 13); k.quadraticCurveTo(hx + 10, hy - 13, hx + 11, hy - 1.6); k.closePath(); k.__bb = [hx - 11, hy - 13, hx + 11, hy - 1.6];
        piece(c, k, col, ink, lw, 2.4);
        c.fillStyle = mix(col, '#3a2a08', 0.5); c.fillRect(hx - 12.6, hy - 2.6, 25.2, 2.4);
        if (back) return;
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7; c.drawImage(Renderer.dot('#ffe08a'), hx - 11, hy - 20, 22, 22); c.restore();
        c.beginPath(); c.arc(hx + 0.5, hy - 9, 3, 0, Math.PI * 2); c.lineWidth = lw(1.8); c.strokeStyle = ink; c.stroke(); c.fillStyle = '#fff3c4'; c.fill();
      },
    },
  });
  Renderer.SIGNATURES_CHARTE = SIGNATURES;
})();
