const CartePlateaux = (() => {
  const donnees = new Map();
  let cleAtlas = null, places = new Map();

  const decoder = s => {
    if (typeof atob === 'function') { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
    return new Uint8Array(Buffer.from(s, 'base64'));
  };

  function de(pid) {
    if (donnees.has(pid)) return donnees.get(pid);
    const D = typeof DATA === 'object' && DATA.cartePlateaux && DATA.cartePlateaux[pid];
    if (!D) return null;
    const pl = decoder(D.plages), ids = new Uint8Array(D.l * D.h);
    let o = 0;
    for (let i = 0; i + 1 < pl.length; i += 2) { ids.fill(pl[i], o, Math.min(ids.length, o + pl[i + 1])); o += pl[i + 1]; }
    const d = Object.assign({}, D, { ids, haut: decoder(D.haut), index: new Map(D.cartes.map((id, i) => [id, i + 1])) });
    donnees.set(pid, d);
    return d;
  }

  function placer() {
    const A = typeof Atlas === 'object' ? Atlas.get() : null;
    if (!A) return places;
    if (cleAtlas === A) return places;
    cleAtlas = A; places = new Map();
    const parPlateau = new Map();
    for (const z of (DATA.content && DATA.content.zones) || []) for (const m of z.maps || []) if (m.plateau && A.coords.has(m.id)) (parPlateau.get(m.plateau) || parPlateau.set(m.plateau, []).get(m.plateau)).push(m.id);
    for (const [pid, cartes] of parPlateau) {
      const d = de(pid);
      if (!d || !cartes.every(id => d.centres[id])) continue;
      const pts = cartes.map(id => ({ u: d.centres[id][0], v: d.centres[id][1], x: A.coords.get(id)[0], y: A.coords.get(id)[1] }));
      const n = pts.length, mu = pts.reduce((s, p) => s + p.u, 0) / n, mv = pts.reduce((s, p) => s + p.v, 0) / n, mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
      let num = 0, den = 0;
      for (const p of pts) { num += (p.u - mu) * (p.x - mx) + (p.v - mv) * (p.y - my); den += (p.u - mu) ** 2 + (p.v - mv) ** 2; }
      const s = den > 0 && num > 0 ? num / den : 0.02;
      places.set(pid, { pid, d, s, ox: mx - s * mu, oy: my - s * mv, cartes: new Set(cartes) });
    }
    return places;
  }

  const place = pid => placer().get(pid) || null;
  const liste = () => [...placer().values()];
  const estPosee = id => { for (const P of placer().values()) if (P.cartes.has(id)) return P; return null; };
  const versMonde = (P, u, v) => [P.s * u + P.ox, P.s * v + P.oy];
  const versPlateau = (P, x, y) => [(x - P.ox) / P.s, (y - P.oy) / P.s];
  const bornes = P => { const [x0, y0] = versMonde(P, 0, 0), [x1, y1] = versMonde(P, P.d.taille[0], P.d.taille[1]); return { x0, y0, x1, y1 }; };

  function carteA(P, u, v) {
    const d = P.d, i = Math.floor(u / d.pas), j = Math.floor(v / d.pas);
    if (i < 0 || j < 0 || i >= d.l || j >= d.h) return null;
    const k = d.ids[j * d.l + i];
    return k ? d.cartes[k - 1] : null;
  }
  function hauteurA(P, u, v) {
    const d = P.d, fi = u / d.pasH, fj = v / d.pasH, i0 = Math.max(0, Math.min(d.lh - 2, Math.floor(fi))), j0 = Math.max(0, Math.min(d.hh - 2, Math.floor(fj)));
    const tu = Math.max(0, Math.min(1, fi - i0)), tv = Math.max(0, Math.min(1, fj - j0));
    let s = 0, w = 0;
    for (const [a, b, p] of [[0, 0, (1 - tu) * (1 - tv)], [1, 0, tu * (1 - tv)], [0, 1, (1 - tu) * tv], [1, 1, tu * tv]]) {
      const q = d.haut[(j0 + b) * d.lh + i0 + a];
      if (q && p > 0) { s += (d.hMin + (q - 1) / 254 * (d.hMax - d.hMin)) * p; w += p; }
    }
    return w > 0.25 ? s / w : NaN;
  }
  function sous(x, y) {
    for (const P of placer().values()) {
      const [u, v] = versPlateau(P, x, y);
      if (u < 0 || v < 0 || u > P.d.taille[0] || v > P.d.taille[1]) continue;
      const id = carteA(P, u, v);
      if (id && P.cartes.has(id)) return { P, id, u, v };
    }
    return null;
  }
  const centre = id => { const P = estPosee(id); return P ? versMonde(P, P.d.centres[id][0], P.d.centres[id][1]) : null; };
  const point = (id, u, v) => { const P = estPosee(id); return P ? versMonde(P, u, v) : null; };

  const images = new Map();
  function image(P, pret) {
    let e = images.get(P.pid);
    if (!e) {
      if (typeof Image !== 'function') return null;
      const img = new Image(); e = { img, ok: false, attente: [] };
      images.set(P.pid, e);
      img.onload = () => { e.ok = true; for (const f of e.attente.splice(0)) f(); };
      img.onerror = () => { e.echec = true; };
      img.src = P.d.image;
    }
    if (e.ok) return e.img;
    if (pret && !e.echec) e.attente.push(pret);
    return null;
  }

  function couche(P, teinte, bord) {
    if (typeof document === 'undefined') return null;
    const d = P.d, cv = document.createElement('canvas'); cv.width = d.l; cv.height = d.h;
    const g = cv.getContext('2d'), img = g.createImageData(d.l, d.h), px = img.data, memo = new Map(), memoB = new Map();
    const t = k => { if (!memo.has(k)) memo.set(k, teinte ? teinte(d.cartes[k - 1]) : null); return memo.get(k); };
    const b = (k, kk) => { const c = k * 256 + kk; if (!memoB.has(c)) memoB.set(c, bord(d.cartes[k - 1], kk ? d.cartes[kk - 1] : null)); return memoB.get(c); };
    const kA = (i, j) => (i < 0 || j < 0 || i >= d.l || j >= d.h ? 0 : d.ids[j * d.l + i]);
    for (let j = 0; j < d.h; j++) for (let i = 0; i < d.l; i++) {
      const k = d.ids[j * d.l + i];
      if (!k) continue;
      let c = t(k);
      if (bord) for (const [a, e] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) { const kk = kA(a, e); if (kk !== k) { const cb = b(k, kk); if (cb) { c = cb; break; } } }
      if (c) { const o = (j * d.l + i) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = c[3]; }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  const oublier = () => { cleAtlas = null; places = new Map(); };

  return { de, place, liste, estPosee, versMonde, versPlateau, bornes, carteA, hauteurA, sous, centre, point, image, couche, oublier };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CartePlateaux;
