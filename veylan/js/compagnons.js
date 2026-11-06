const Compagnons = (() => {
  const RECUL = { cases: 0.95, plateau: 1.5 };
  const SAUT = { cases: 5, plateau: 9 };
  const VITESSE = { cases: 5, plateau: 4.5 };
  const HAUSSE = { pixels: 13, unites: 0.55 };

  const familierDe = ch => (typeof Familiers !== 'undefined' ? Familiers.actif(ch) : null);
  const montureDe = ch => (typeof Montures !== 'undefined' && Montures.montee(ch) ? Montures.def(ch) : null);
  const figureDe = d => (d && d.famille && DATA.monsters[d.famille[0]]) || null;
  const coteDe = s => (typeof s.facing === 'number' ? s.facing : (s.facing === 'sw' || s.facing === 'nw' ? -1 : 1));

  function suivre(w, dt) {
    const f = familierDe(w.ch);
    if (!f) { w.compagnon = null; return; }
    const p = w.player, sorte = w.plateau ? 'plateau' : 'cases';
    let c = w.compagnon;
    if (!c || c.id !== f.id || c.carte !== w.mapId) {
      c = w.compagnon = { id: f.id, carte: w.mapId, rx: p.rx - RECUL[sorte], ry: p.ry, px: p.rx, py: p.ry, dir: { x: 1, y: 0 }, cote: 1, bouge: false, t: 0 };
    }
    if (c.reste) { c.px = p.rx; c.py = p.ry; c.bouge = false; return; }
    const dx = p.rx - c.px, dy = p.ry - c.py, d = Math.hypot(dx, dy);
    c.px = p.rx; c.py = p.ry;
    if (d > 1e-4) c.dir = { x: dx / d, y: dy / d };
    const tx = p.rx - c.dir.x * RECUL[sorte], ty = p.ry - c.dir.y * RECUL[sorte];
    const ex = tx - c.rx, ey = ty - c.ry, e = Math.hypot(ex, ey);
    if (e > SAUT[sorte]) { c.rx = tx; c.ry = ty; c.bouge = false; }
    else if (e > 0.02) {
      const v = VITESSE[sorte] * (typeof Montures !== 'undefined' ? Montures.vitesse(w.ch, sorte === 'plateau') : 1) * 1.3;
      const pas = Math.min(e, v * dt * Math.min(1.6, 0.4 + e));
      c.rx += ex / e * pas; c.ry += ey / e * pas;
      c.bouge = true;
      const s = ex - ey;
      if (Math.abs(s) > 0.01) c.cote = s > 0 ? 1 : -1;
    } else c.bouge = false;
    c.t += dt;
  }

  function figures2D(w, out, now) {
    if (!w || !w.ch || !out.length) return;
    const heros = out[0], cote = coteDe(heros);
    const m = montureDe(w.ch), fm = figureDe(m);
    if (m && fm) {
      out.unshift({ key: 'monture', kind: 'entity', rx: heros.rx, ry: heros.ry, shape: fm.shape, color: m.couleur || fm.color, glyph: null, name: null, scale: 0.92, alpha: 1, team: 'compagnon', noRing: true, zDecal: -0.02, facing: cote, bob: w.player.moving ? Math.abs(Math.sin(now / 90)) * 2 : 0 });
      heros.bob = (heros.bob || 0) + HAUSSE.pixels;
    }
    const f = familierDe(w.ch), c = w.compagnon, ff = figureDe(f);
    if (f && ff && c && c.carte === w.mapId) {
      out.push({ key: 'familier', kind: 'entity', rx: c.rx, ry: c.ry, shape: ff.shape, color: f.couleur || ff.color, glyph: null, name: null, scale: 0.48, alpha: 1, team: 'compagnon', noRing: true, facing: c.cote, bob: c.bouge ? Math.abs(Math.sin(c.t * 11)) * 4 : 1 + Math.sin(now / 600) });
    }
  }

  function figures3D(w, out, veilleur, now, ctx) {
    if (!w || !w.ch || !veilleur) return;
    const { pos, H, N, fig } = ctx;
    const peindre = s => { s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s); return s; };
    const cote = coteDe(veilleur);
    const m = montureDe(w.ch), fm = figureDe(m);
    if (m && fm) {
      const s = peindre({ kind: 'entity', shape: fm.shape, color: m.couleur || fm.color, glyph: null, team: 'compagnon', facing: cote, scale: 0.92, x: veilleur.x, y: veilleur.y, h: veilleur.h, normale: veilleur.normale, bob: w.player.moving ? Math.abs(Math.sin(now / 90)) * 2 : 0 });
      const i = out.indexOf(veilleur);
      out.splice(i < 0 ? 0 : i, 0, s);
      if (veilleur.heros) veilleur.h += HAUSSE.unites;
      else veilleur.bob = (veilleur.bob || 0) + HAUSSE.unites * 42;
    }
    const f = familierDe(w.ch), c = w.compagnon, ff = figureDe(f);
    if (f && ff && c && c.carte === w.mapId) {
      const [x, y] = pos(c.rx, c.ry);
      out.push(peindre({ kind: 'entity', shape: ff.shape, color: f.couleur || ff.color, glyph: null, team: 'compagnon', facing: c.cote, scale: 0.48, x, y, h: H(x, y), normale: N(x, y), bob: c.bouge ? Math.abs(Math.sin(c.t * 11)) * 4 : 1 + Math.sin(now / 600) }));
    }
  }

  return { RECUL, SAUT, VITESSE, HAUSSE, suivre, figures2D, figures3D, familierDe, montureDe, figureDe };
})();
