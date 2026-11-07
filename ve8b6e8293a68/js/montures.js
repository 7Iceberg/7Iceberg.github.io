const Montures = (() => {
  const PARTS = [0, 10, 20, 30, 50];
  const PART_DEFAUT = 20;
  const XP_PAR_POINT = 10;
  const PLATEAU = 0.8;

  const liste = () => (DATA.content && DATA.content.montures) || [];
  const get = id => liste().find(m => m.id === id) || null;
  const F = () => Familiers;

  const de = ch => (ch && ch.monture && get(ch.monture.id) ? ch.monture : null);
  const def = ch => { const m = de(ch); return m ? get(m.id) : null; };
  const niveau = ch => { const m = de(ch); return m ? F().niveau(m.xp) : 0; };
  const montee = ch => !!(de(ch) && ch.monture.montee && !tropJeune(ch));
  function bonusA(d, n) {
    const out = {};
    if (!d) return out;
    const lisse = {}; for (const k in d.bonus || {}) if (k !== 'pa' && k !== 'pm') lisse[k] = d.bonus[k];
    Object.assign(out, F().bonusA({ bonus: lisse }, n));
    for (const k of ['pa', 'pm']) if (d.bonus && d.bonus[k] && n >= F().NIVEAU_MAX) out[k] = d.bonus[k];
    return out;
  }
  const bonusActif = ch => (montee(ch) ? bonusA(def(ch), niveau(ch)) : {});
  const vitesse = (ch, plateau) => { if (!montee(ch)) return 1; const v = def(ch).vitesse || 1; return plateau ? 1 + (v - 1) * PLATEAU : v; };

  const NIVEAU = () => (typeof DATA !== 'undefined' && DATA.rules && DATA.rules.montureNiveau) || 1;
  const tropJeune = ch => (ch.level || 1) < NIVEAU();
  const RAISON_NIVEAU = () => `Les montures se montent à partir du niveau ${NIVEAU()}.`;

  function donner(ch, id) {
    const d = get(id);
    if (!d) return { ok: false, raison: 'Monture inconnue.' };
    if (tropJeune(ch)) return { ok: false, raison: RAISON_NIVEAU() };
    if (de(ch)) return { ok: false, raison: 'Tu as déjà une monture.' };
    ch.monture = { id, xp: 0, part: PART_DEFAUT, montee: true };
    return { ok: true, monture: d };
  }

  function monter(ch, oui) {
    if (!de(ch)) return { ok: false, raison: 'Tu n\'as pas de monture.' };
    const veut = oui == null ? !ch.monture.montee : !!oui;
    if (veut && tropJeune(ch)) return { ok: false, raison: RAISON_NIVEAU() };
    ch.monture.montee = veut;
    if (ch.hp != null && typeof ch.derived === 'function') ch.hp = Math.min(ch.hp, ch.derived().hpMax);
    return { ok: true, montee: ch.monture.montee, monture: def(ch) };
  }

  function choisirPart(ch, part) {
    if (!de(ch)) return { ok: false, raison: 'Tu n\'as pas de monture.' };
    if (!PARTS.includes(part)) return { ok: false, raison: 'Part inconnue.' };
    ch.monture.part = part;
    return { ok: true };
  }

  function gagner(ch, xp) {
    const m = ch.monture, avant = F().niveau(m.xp);
    const pris = Math.max(0, Math.min(xp, F().XP_MAX - m.xp));
    m.xp += pris;
    return { xp: pris, niveau: F().niveau(m.xp), niveaux: F().niveau(m.xp) - avant };
  }

  function partCombat(ch, xp) {
    const m = de(ch);
    if (!m || !m.montee || !m.part || !(xp > 0) || m.xp >= F().XP_MAX) return null;
    const reste = (F().XP_MAX - m.xp) * XP_PAR_POINT;
    const cede = Math.min(Math.round(xp * m.part / 100), reste);
    const g = gagner(ch, Math.floor(cede / XP_PAR_POINT));
    return g.xp ? { cede: g.xp * XP_PAR_POINT, xp: g.xp, niveau: g.niveau, niveaux: g.niveaux, nom: def(ch).nom } : null;
  }

  function nourrir(ch, itemId, n) {
    const m = de(ch);
    if (!m) return { ok: false, raison: 'Tu n\'as pas de monture.' };
    const par = F().xpRessource(itemId);
    if (!par) return { ok: false, raison: 'Une monture ne mange que des ressources.' };
    if (m.xp >= F().XP_MAX) return { ok: false, raison: `${def(ch).nom} est au niveau ${F().NIVEAU_MAX} : il n'a plus faim.` };
    const q = Math.min(Math.max(1, Math.floor(n || 1)), ch.count(itemId), Math.ceil((F().XP_MAX - m.xp) / par));
    if (q <= 0) return { ok: false, raison: 'Tu n\'en as plus.' };
    ch.removeItem(itemId, q);
    const g = gagner(ch, q * par);
    return { ok: true, mange: q, xp: g.xp, niveau: g.niveau, niveaux: g.niveaux, monture: def(ch) };
  }

  function nettoyer(o) {
    if (o == null) return { monture: null, errors: [] };
    if (typeof o !== 'object' || Array.isArray(o) || !get(o.id)) return { monture: null, errors: ['monture'] };
    const errors = [];
    let xp = o.xp, part = o.part;
    if (!Number.isInteger(xp) || xp < 0 || xp > F().XP_MAX) { errors.push('expérience de la monture'); xp = Math.max(0, Math.min(F().XP_MAX, Math.floor(Number(xp)) || 0)); }
    if (!PARTS.includes(part)) { errors.push('part de la monture'); part = PART_DEFAUT; }
    return { monture: { id: o.id, xp, part, montee: !!o.montee }, errors };
  }

  const types = () => (DATA.content && DATA.content.typesMontures) || [];
  const robes = () => (DATA.content && DATA.content.robesMontures) || [];
  return { PARTS, PART_DEFAUT, XP_PAR_POINT, PLATEAU, liste, get, de, def, niveau, montee, bonusA, bonusActif, types, robes, vitesse, donner, monter, choisirPart, partCombat, nourrir, nettoyer };
})();
