const Marche = (() => {
  const GENRES = {
    equipements: { nom: 'le comptoir des équipements', est: d => d.kind === 'equip' || d.kind === 'weapon', bonus: 1.5, achat: 1.0, niveauMax: 12 },
    ressources: { nom: 'le comptoir des ressources', est: d => d.kind === 'resource', bonus: 1.2, achat: 1.6, niveauMax: 99 },
    vivres: { nom: 'le comptoir des vivres', est: d => d.kind === 'consumable' && d.sub !== 'parchemin' && d.sub !== 'monture', bonus: 1.4, achat: 1.0, niveauMax: 20 },
  };
  const aLEtal = d => d.source !== 'drop' && d.sub !== 'parchemin' && d.sub !== 'oeuf';
  const ETAL = 6, BAISSE = 0.05, PLANCHER = 0.5;

  const jour = () => (typeof Veille === 'object' ? Veille.jour() : Math.floor(Date.now() / 86400000));
  const genreDe = npc => { const g = npc && npc.def ? npc.def.marche : npc && npc.marche; return GENRES[g] ? g : null; };

  function graine(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function hasard(g) { let a = g || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function stock(genre) {
    const G = GENRES[genre];
    if (!G) return [];
    return Items.all().filter(d => G.est(d) && aLEtal(d) && d.price > 0 && (d.level || 1) <= G.niveauMax).map(d => d.id).sort();
  }

  function etal(genre, n) {
    const ids = stock(genre);
    const R = hasard(graine(`${n == null ? jour() : n}|${genre}`));
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return ids.slice(0, ETAL).sort((a, b) => (Items.get(a).level - Items.get(b).level) || Items.get(a).name.localeCompare(Items.get(b).name));
  }

  function carnet(ch, n) {
    const j = n == null ? jour() : n;
    if (!ch.marche || ch.marche.jour !== j) ch.marche = { jour: j, vendus: {} };
    return ch.marche;
  }
  const vendus = (ch, id, n) => carnet(ch, n).vendus[id] || 0;

  function prixAchat(id) {
    const d = Items.get(id), g = d && Object.keys(GENRES).find(k => GENRES[k].est(d));
    return d ? Math.max(1, Math.round(d.price * (g ? GENRES[g].achat : 1))) : Infinity;
  }
  function prixVenteA(id, deja) {
    const d = Items.get(id), g = d && Object.keys(GENRES).find(k => GENRES[k].est(d));
    if (!d || !g) return 0;
    const f = Math.max(PLANCHER, 1 - BAISSE * deja);
    return Math.max(1, Math.round(Items.sellPrice(d) * GENRES[g].bonus * f));
  }
  const prixVente = (ch, id) => prixVenteA(id, vendus(ch, id));
  function gain(ch, id, q) { let s = 0; const v = vendus(ch, id); for (let k = 0; k < q; k++) s += prixVenteA(id, v + k); return s; }
  const rachete = (genre, id) => { const d = Items.get(id); return !!(d && GENRES[genre] && GENRES[genre].est(d)); };

  return { GENRES, ETAL, BAISSE, PLANCHER, jour, genreDe, stock, etal, carnet, vendus, prixAchat, prixVente, prixVenteA, gain, rachete };
})();
