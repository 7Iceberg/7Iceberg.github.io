// Factions : le Fil et la Déchirure, le serment, les rangs, l'ordre, le reniement, et la confiance
// des Francs-Marcheurs, qui restent neutres (docs/MONDE.md, « Les deux factions »). Ne touche pas
// au DOM : chaque changement rend des événements, que le monde transmet à l'interface.
// L'état vit dans character.faction = { id, points, rank, order, sworn, renounced, marcheurs } :
//  - id : 'fil', 'dechirure', ou null (pas de serment) ;
//  - points : gagnés par les quêtes de faction ; le rang s'en déduit (rankFor) ;
//  - order : l'ordre choisi au rang 3 ; sworn : le niveau du serment ;
//  - renounced : le nombre de reniements ; marcheurs : la confiance des Francs-Marcheurs.
// Une faction ne donne jamais de puissance de combat : des titres, des apparences, des services.
const Factions = (() => {
  const SWEAR_LEVEL = 20;      // le serment, à la Passe de Kaldum
  const ORDER_RANK = 3;        // le choix de l'ordre
  const MAX_RANK = 10;
  const PER_RANK = 30;         // environ trois quêtes de faction par rang, 10 points chacune
  const RENOUNCE_RANKS = 2;    // ce que coûte un reniement
  const NEUTRAL_BONUS = 1.5;   // les neutres sont bien reçus chez les Francs-Marcheurs

  const LIST = {
    fil: {
      id: 'fil', nom: 'le Fil', Nom: 'Le Fil', au: 'au Fil', du: 'du Fil',
      capitale: 'Orsane, sur les Cimes', couleurs: 'blanc et or', teinte: '#e2c690',
      veut: 'Recoudre les Voiles, protéger les Grands Dragons, retrouver Ithren.',
      juste: 'La Déchirure a déjà libéré des monstres : le Fil protège les vivants.',
      sombre: 'Il contrôle le Tissage, enferme ce qui gêne, et cache ce qu\'il sait d\'Ithren.',
      insigne: 'Un fil d\'or cousu en auréole, qui brille plus fort à chaque rang.',
      contact: 'Okrel, capitaine du Fil, à la Porte de Kaldum',
      orders: [
        { id: 'gardes_fil', name: 'les Gardes-Fil', role: 'le combat' },
        { id: 'couseurs', name: 'les Couseurs', role: 'le soin et la réparation des Voiles' },
        { id: 'gardiens_ecailles', name: 'les Gardiens d\'Écailles', role: 'le savoir, les dragons' },
      ],
      ranks: ['Bout de fil', 'Couseur', 'Point', 'Ourlet', 'Trame', 'Navette', 'Fuseau', 'Métier', 'Grand Tisserand', 'Main du Fil'],
      // Ce que chaque rang ouvre ; `venir` : promis, pas encore construit.
      unlocks: [
        { text: 'Le titre, l\'insigne d\'or et les quêtes d\'Okrel.' },
        { text: 'Une couture d\'or au bord de la cape.', venir: true },
        { text: 'Le choix de l\'ordre : Gardes-Fil, Couseurs ou Gardiens d\'Écailles.' },
        { text: 'Le comptoir du Fil, à Orsane.', venir: true },
        { text: 'La tour des Tisseurs : un raccourci vers les hauts d\'Orsane.', venir: true },
        { text: 'Une cape blanche brodée d\'or.', venir: true },
        { text: 'Les archives du Fil : ce qu\'on sait vraiment d\'Ithren.', venir: true },
        { text: 'Une lanterne d\'or qui suit le Veilleur.', venir: true },
        { text: 'Un Relais du Fil confié à ta garde.', venir: true },
        { text: 'Une place au conseil du Fil.', venir: true },
      ],
    },
    dechirure: {
      id: 'dechirure', nom: 'la Déchirure', Nom: 'La Déchirure', au: 'à la Déchirure', du: 'de la Déchirure',
      capitale: 'Kessane, au bord d\'un gouffre de la Lisière ; en attendant, la Fosse, au-dessus des Éboulis', couleurs: 'pourpre et noir', teinte: '#bf95ff',
      veut: 'Ouvrir les Voiles, réveiller les ères endormies, lier les dragons par leurs Écailles.',
      juste: 'Le monde a le droit de savoir ce qui dort dessous : elle refuse le secret.',
      sombre: 'Elle joue avec le feu, et on la soupçonne d\'avoir l\'Écaille Perdue.',
      insigne: 'Une cape déchirée d\'où sort une lueur violette, plus vive à chaque rang.',
      contact: 'Kethril, maîtresse de la Fosse, à la Gueule du Terrier',
      orders: [
        { id: 'effileurs', name: 'les Effileurs', role: 'le combat' },
        { id: 'lieurs', name: 'les Lieurs', role: 'le contrôle, les dragons' },
        { id: 'descendeurs', name: 'les Descendeurs', role: 'l\'exploration des Bas-Voiles' },
      ],
      ranks: ['Accroc', 'Éraflure', 'Entaille', 'Fêlure', 'Fente', 'Lézarde', 'Brèche', 'Faille', 'Gouffre', 'Voix de la Déchirure'],
      unlocks: [
        { text: 'Le titre, l\'insigne violet et les quêtes de la Fosse.' },
        { text: 'Une déchirure pourpre au bord de la cape.', venir: true },
        { text: 'Le choix de l\'ordre : Effileurs, Lieurs ou Descendeurs.' },
        { text: 'Le marché de la Fosse.', venir: true },
        { text: 'Une descente anticipée vers les Bas-Voiles.', venir: true },
        { text: 'Une cape noire fendue de pourpre.', venir: true },
        { text: 'Les cartes des Descendeurs : ce qui dort sous la fente.', venir: true },
        { text: 'Une lueur violette qui suit le Veilleur.', venir: true },
        { text: 'Une place à Kessane, quand elle sera bâtie.', venir: true },
        { text: 'Une voix au cercle de la Déchirure.', venir: true },
      ],
    },
  };
  const IDS = Object.keys(LIST);

  // Les Francs-Marcheurs : une confiance, pas un rang.
  const MARCHEURS = {
    nom: 'les Francs-Marcheurs',
    texte: 'La guilde de Thessa commerce avec tout le monde, loue ses lames et vend de fausses Écailles très bien faites. Ils ne prennent pas parti : on gagne leur confiance, pas un rang.',
    neutres: 'Les neutres y sont bien reçus : sans serment, chaque service compte moitié plus.',
    tiers: [{ at: 0, name: 'Inconnu' }, { at: 10, name: 'Client' }, { at: 25, name: 'Habitué' }, { at: 50, name: 'Associé' }, { at: 100, name: 'Compagnon de route' }],
  };

  const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  const def = id => LIST[id] || null;
  const empty = () => ({ id: null, points: 0, rank: 0, order: null, sworn: null, renounced: 0, marcheurs: 0 });
  // L'état du personnage, créé au besoin (une sauvegarde d'avant les factions n'en a pas).
  function of(ch) {
    if (!ch.faction || typeof ch.faction !== 'object') ch.faction = empty();
    return ch.faction;
  }

  // ----- Rangs -----
  const MAX_POINTS = PER_RANK * (MAX_RANK - 1);
  const pointsFor = rank => PER_RANK * (Math.max(1, rank) - 1);
  const rankFor = points => Math.max(1, Math.min(MAX_RANK, 1 + Math.floor(Math.max(0, points) / PER_RANK)));
  const title = (id, rank) => (def(id) && rank >= 1 ? def(id).ranks[Math.min(MAX_RANK, rank) - 1] : null);
  // Les titres de rang que le serment en cours justifie (rangs 1 à rang).
  const titles = f => (f && def(f.id) ? def(f.id).ranks.slice(0, f.rank) : []);
  const isSworn = ch => !!(ch.faction && def(ch.faction.id));
  // Où en est le rang : points, seuil suivant, part accomplie.
  function progress(f) {
    if (!f || !def(f.id)) return null;
    const next = f.rank < MAX_RANK ? pointsFor(f.rank + 1) : null;
    const from = pointsFor(f.rank);
    return { rank: f.rank, title: title(f.id, f.rank), points: f.points, from, next, nextTitle: next != null ? title(f.id, f.rank + 1) : null, ratio: next == null ? 1 : (f.points - from) / (next - from) };
  }
  const orderDef = (id, order) => (def(id) ? def(id).orders.find(o => o.id === order) || null : null);

  // Donne les titres des rangs atteints ; le titre affiché suit le rang s'il était déjà un titre
  // de rang de cette faction.
  function grantTitles(ch, f, from) {
    const out = [];
    for (let r = from + 1; r <= f.rank; r++) {
      const t = title(f.id, r);
      if (!ch.titles.includes(t)) ch.titles.push(t);
      out.push({ type: 'rang', faction: f.id, rank: r, title: t });
    }
    if (out.length && ch.title && def(f.id).ranks.includes(ch.title)) ch.title = title(f.id, f.rank);
    return out;
  }

  // ----- Serment, points, ordre, reniement -----

  function canSwear(ch, id) {
    if (!def(id)) return { ok: false, reason: 'Faction inconnue.' };
    if (isSworn(ch)) return { ok: false, reason: `Tu as déjà prêté serment ${def(ch.faction.id).au}.` };
    if (ch.level < SWEAR_LEVEL) return { ok: false, reason: `Le serment se prête au niveau ${SWEAR_LEVEL}.` };
    return { ok: true };
  }

  // Le serment : la faction, le rang que les points gardés justifient (1 pour un premier serment),
  // les titres de ce rang.
  function swear(ch, id) {
    const c = canSwear(ch, id);
    if (!c.ok) return [];
    const f = of(ch);
    f.id = id;
    f.rank = rankFor(f.points);
    f.order = null;
    f.sworn = ch.level;
    return [{ type: 'serment', faction: id }].concat(grantTitles(ch, f, 0));
  }

  // Points de faction (récompense de quête) : peuvent faire monter de plusieurs rangs.
  function addPoints(ch, n) {
    if (!isSworn(ch) || !(n > 0)) return [];
    const f = ch.faction, before = f.rank;
    f.points = Math.min(MAX_POINTS, f.points + Math.floor(n));
    f.rank = rankFor(f.points);
    const out = [{ type: 'points', faction: f.id, value: Math.floor(n) }].concat(grantTitles(ch, f, before));
    if (before < ORDER_RANK && f.rank >= ORDER_RANK && !f.order) out.push({ type: 'ordre_possible', faction: f.id });
    return out;
  }

  // L'ordre : au rang 3, un des trois de sa faction, une fois.
  function chooseOrder(ch, order) {
    if (!isSworn(ch)) return { ok: false, reason: 'Il faut d\'abord prêter serment.' };
    const f = ch.faction;
    if (f.rank < ORDER_RANK) return { ok: false, reason: `L'ordre se choisit au rang ${ORDER_RANK} (${title(f.id, ORDER_RANK)}).` };
    if (f.order) return { ok: false, reason: 'Ton ordre est déjà choisi.' };
    const o = orderDef(f.id, order);
    if (!o) return { ok: false, reason: 'Cet ordre n\'est pas de ta faction.' };
    f.order = o.id;
    return { ok: true, events: [{ type: 'ordre', faction: f.id, order: o.id }] };
  }

  // Le reniement (effet d'une quête, docs/MONDE.md) : il coûte deux rangs de points, qui restent
  // pour le prochain serment ; l'ordre et les titres de la faction quittée s'en vont, le compte
  // des reniements et les quêtes déjà faites restent.
  function renounce(ch) {
    if (!isSworn(ch)) return [];
    const f = ch.faction, was = f.id, rank = f.rank;
    const gone = def(was).ranks;
    ch.titles = ch.titles.filter(t => !gone.includes(t));
    if (ch.title && gone.includes(ch.title)) ch.title = null;
    f.points = Math.max(0, f.points - RENOUNCE_RANKS * PER_RANK);
    f.id = null; f.rank = 0; f.order = null; f.sworn = null;
    f.renounced = (f.renounced || 0) + 1;
    return [{ type: 'reniement', faction: was, rank, kept: rankFor(f.points) }];
  }

  // ----- Francs-Marcheurs -----

  function tier(points) {
    const T = MARCHEURS.tiers;
    let i = 0;
    while (i + 1 < T.length && points >= T[i + 1].at) i++;
    return { name: T[i].name, at: T[i].at, next: T[i + 1] || null };
  }
  const marcheursGain = (ch, n) => Math.round(n * (isSworn(ch) ? 1 : NEUTRAL_BONUS));
  function addMarcheurs(ch, n) {
    if (!(n > 0)) return [];
    const f = of(ch), gained = marcheursGain(ch, n), before = tier(f.marcheurs).name;
    f.marcheurs += gained;
    const t = tier(f.marcheurs);
    return [{ type: 'marcheurs', value: gained, total: f.marcheurs, tier: t.name, up: t.name !== before }];
  }

  // ----- Quêtes : prérequis et effets -----

  const asList = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
  // requires.faction (un id ou une liste : il faut l'un de ces serments), requires.notFaction
  // (serments exclus), requires.factionRank (rang minimum, dans le serment en cours).
  function requirementsMet(ch, r) {
    const f = ch.faction && def(ch.faction.id) ? ch.faction : null;
    const want = asList(r.faction), not = asList(r.notFaction);
    if (want.length && !(f && want.includes(f.id))) return false;
    if (not.length && f && not.includes(f.id)) return false;
    if (r.factionRank && !(f && f.rank >= r.factionRank)) return false;
    return true;
  }

  // Les effets que portent les réponses des étapes de choix (js/quests.js) ; « later » est géré
  // par les quêtes elles-mêmes.
  const EFFECTS = ['faction', 'renounce', 'later'];
  function canApply(ch, ef) {
    if (ef.type === 'faction') return canSwear(ch, ef.id);
    if (ef.type === 'renounce') return isSworn(ch) ? { ok: true } : { ok: false, reason: 'Tu n\'as aucun serment à renier.' };
    return EFFECTS.includes(ef.type) ? { ok: true } : { ok: false, reason: 'Effet inconnu.' };
  }
  function apply(ch, ef) {
    if (ef.type === 'faction') return swear(ch, ef.id);
    if (ef.type === 'renounce') return renounce(ch);
    return [];
  }

  // ----- Textes des événements, pour le journal et la discussion -----

  function describe(ev) {
    const d = def(ev.faction);
    switch (ev.type) {
      case 'serment': return `Tu as prêté serment ${d.au}.`;
      case 'rang': return `Rang atteint : ${ev.title}.`;
      case 'points': return `+${ev.value} points ${d.du}.`;
      case 'ordre_possible': return `Rang ${ORDER_RANK} : choisis ton ordre dans la fenêtre Faction.`;
      case 'ordre': { const o = orderDef(ev.faction, ev.order); return `Ordre choisi : ${o ? o.name : ev.order}.`; }
      case 'reniement': return `Tu as renié ton serment ${d.au} : deux rangs perdus.`;
      case 'marcheurs': return `Francs-Marcheurs : +${ev.value} de confiance (${ev.tier}).`;
      default: return '';
    }
  }
  // Discussion : « systeme » pour l'état du personnage, sauf les points, qui restent dans le journal.
  const chatType = ev => (ev.type === 'points' ? null : 'systeme');

  // L'insigne porté dans le monde (js/render.js, js/render-gl.js) : la faction et le rang.
  const insigne = ch => (isSworn(ch) ? { id: ch.faction.id, rank: ch.faction.rank } : null);

  // ----- Sauvegarde -----

  // Le plus que les quêtes faites peuvent avoir donné : points de faction, confiance.
  function maxPoints(done) {
    let n = 0;
    for (const id of done || []) { const q = Quests.get(id); if (q && q.rewards && q.rewards.faction > 0) n += q.rewards.faction; }
    return Math.min(MAX_POINTS, n);
  }
  function maxMarcheurs(done) {
    let n = 0;
    for (const id of done || []) { const q = Quests.get(id); if (q && q.rewards && q.rewards.marcheurs > 0) n += Math.round(q.rewards.marcheurs * NEUTRAL_BONUS); }
    return n;
  }

  // Valide l'état lu dans une sauvegarde (js/save.js) : faction connue, pas avant le niveau 20,
  // rang égal à celui des points, points et confiance que les quêtes faites justifient, ordre de
  // sa faction et seulement au rang 3. Rend { errors, data } : data est un état sûr.
  function validate(raw, ctx) {
    const errors = [];
    const f = empty();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['faction illisible'], data: f };
    const level = ctx.level, done = ctx.done || [];
    if (raw.marcheurs != null) { if (isInt(raw.marcheurs, 0, maxMarcheurs(done))) f.marcheurs = raw.marcheurs; else errors.push('confiance des Francs-Marcheurs'); }
    if (raw.renounced != null) { if (isInt(raw.renounced, 0, 999)) f.renounced = raw.renounced; else errors.push('reniements'); }
    let points = 0;
    if (raw.points != null) { if (isInt(raw.points, 0, maxPoints(done))) points = raw.points; else errors.push('points de faction'); }
    if (raw.id == null) {
      if (raw.rank || raw.order != null || raw.sworn != null) errors.push('faction sans serment');
      // Sans serment, des points ne restent qu'après un reniement.
      if (points && !f.renounced) { errors.push('points de faction sans serment'); points = 0; }
      f.points = points;
      return { errors, data: f };
    }
    if (!def(raw.id)) { errors.push('faction inconnue'); return { errors, data: f }; }
    if (!(level >= SWEAR_LEVEL)) { errors.push(`serment avant le niveau ${SWEAR_LEVEL}`); return { errors, data: f }; }
    f.id = raw.id;
    f.points = points;
    f.rank = rankFor(points);
    if (raw.rank !== f.rank) errors.push('rang de faction');
    if (isInt(raw.sworn, SWEAR_LEVEL, level)) f.sworn = raw.sworn; else { errors.push('niveau du serment'); f.sworn = level; }
    if (raw.order != null) {
      if (f.rank >= ORDER_RANK && orderDef(f.id, raw.order)) f.order = raw.order;
      else errors.push('ordre de faction');
    }
    return { errors, data: f };
  }

  return {
    LIST, IDS, MARCHEURS, SWEAR_LEVEL, ORDER_RANK, MAX_RANK, PER_RANK, RENOUNCE_RANKS, NEUTRAL_BONUS, EFFECTS,
    def, empty, of, isSworn, rankFor, pointsFor, title, titles, progress, orderDef,
    canSwear, swear, addPoints, chooseOrder, renounce, tier, marcheursGain, addMarcheurs,
    requirementsMet, canApply, apply, describe, chatType, insigne, maxPoints, maxMarcheurs, validate,
  };
})();
