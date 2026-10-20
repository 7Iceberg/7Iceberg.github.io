// La Veille du jour : la boucle quotidienne (docs/QUETES.md, « La Veille du jour »). Une fois par
// jour, au tableau de n'importe quel Relais du Fil, le Veilleur fait un dépôt pour l'entretien du
// réseau des Relais : de 1 à 9 ressources de sa tranche de niveau. Il gagne de l'XP indexée sur
// son niveau et une marque de Veille, et le bonus du jour s'active jusqu'à minuit. Pas de prière,
// pas d'offrande à un être : c'est de l'entretien (docs/MONDE.md).
//
// Le calendrier tient en 28 jours (content/veille.js) : sept jours, un par Voile, et quatre
// semaines, une par élément. Les jours manqués se gardent en réserve, sept au plus, et se
// rattrapent d'un dépôt chacun, une fois celui du jour fait.
//
// La date vient de l'horloge de l'appareil, en date locale : elle se triche facilement tant que le
// serveur ne fait pas autorité, d'où des récompenses modestes. Un dépôt daté d'avant le dernier
// enregistré (horloge reculée) est refusé, sans rien perdre.
//
// L'état vit dans character.veille = { first, last, reserve, days } : jours entiers comptés depuis
// l'époque du cycle (premier et dernier dépôt du jour, réserve, jours remplis du cycle en cours).
// Les marques sont un haut fait, character.counters.feats.veille : les succès de paliers les lisent
// sans code de plus, et la validation des sauvegardes les vérifie déjà (js/save.js). Ne touche pas
// au DOM.
const Veille = (() => {
  const NIVEAU = 8;                     // la Veille s'ouvre au niveau 8
  const RESERVE_MAX = 7;
  const CYCLE = 28;
  const SEMAINE = 7;
  // XP d'un dépôt : la moitié d'une quête secondaire du niveau du personnage (24 × niveau^1,6,
  // docs/SPEC-CONTENU.md), soit un monstre et demi. Modeste tant que la date se triche.
  const XP = 12;
  // Époque du cycle : le lundi 5 janvier 2026, en date locale. Le jour 0 est le premier Voile de la
  // semaine de Terra ; le premier Voile tombe donc toujours un lundi.
  const EPOQUE = Date.UTC(2026, 0, 5);
  const JOUR_MS = 86400000;
  const VOILES = ['Premier', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième', 'Sixième', 'Septième'];
  const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ATELIERS = { tailleur: 'du tailleur', cordonnier: 'du cordonnier', bijoutier: 'du bijoutier', forgeron: 'du forgeron', alchimiste: 'de l\'alchimiste' };

  const data = () => (DATA.content && DATA.content.veille) || { jours: [], tranches: [], familles: {} };

  // L'horloge : remplaçable (tests, futur serveur qui fera autorité sur la date).
  let horloge = () => Date.now();

  // Numéro du jour : jours écoulés depuis l'époque, à la date locale de l'appareil. Date.UTC sur
  // l'année, le mois et le jour locaux donne un entier exact, changements d'heure compris.
  function jour(date) {
    const d = date == null ? new Date(horloge()) : (date instanceof Date ? date : new Date(date));
    if (isNaN(d.getTime())) return null;
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOQUE) / JOUR_MS);
  }

  // Le jour de la création d'un personnage : son identifiant commence par l'horodatage de sa
  // création, en base 36 (js/character.js). Null s'il ne se lit pas comme une date plausible.
  function creation(uid) {
    if (typeof uid !== 'string' || !/^[a-z0-9]{8,}$/.test(uid)) return null;
    const t = parseInt(uid.slice(0, 8), 36);
    if (!(t >= Date.UTC(2024, 0, 1) && t <= Math.max(horloge(), Date.now()) + 2 * JOUR_MS)) return null;
    return jour(new Date(t));
  }

  const indexDe = n => ((n % CYCLE) + CYCLE) % CYCLE;
  const debutCycle = n => n - indexDe(n);

  // Le jour n du calendrier : nom, Voile, élément, récit, bonus, et sa place dans le cycle.
  function entree(n) {
    const i = indexDe(n);
    const e = data().jours[i] || {};
    const voile = e.voile || (i % SEMAINE) + 1;
    return Object.assign({}, e, {
      n, index: i, numero: i + 1, semaine: Math.floor(i / SEMAINE), voile,
      voileNom: `${VOILES[voile - 1]} Voile`, voileChiffre: ROMAINS[voile - 1],
      element: e.element || ['terre', 'feu', 'eau', 'air'][Math.floor(i / SEMAINE)],
    });
  }

  // Le jour du cycle, de 1 à 28 : pour une icône en page de calendrier.
  const jourDuCycle = date => { const n = jour(date); return n == null ? null : indexDe(n) + 1; };

  // ----- État du personnage -----

  const vide = () => ({ first: null, last: null, reserve: 0, days: [] });
  function etat(ch) {
    const v = ch && ch.veille;
    if (!v || typeof v !== 'object' || !Number.isInteger(v.last)) return vide();
    return {
      first: Number.isInteger(v.first) ? v.first : v.last, last: v.last,
      reserve: Number.isInteger(v.reserve) ? Math.max(0, Math.min(RESERVE_MAX, v.reserve)) : 0,
      days: Array.isArray(v.days) ? v.days.filter(Number.isInteger) : [],
    };
  }
  const marques = ch => ((ch.counters && ch.counters.feats) || {}).veille || 0;
  const ouverte = ch => ch.level >= NIVEAU;

  // Réserve disponible le jour n : celle déjà comptée, plus les jours manqués depuis le dernier
  // dépôt du jour (rien avant le tout premier dépôt), sept au plus.
  function reserve(st, n) {
    if (st.last == null || n <= st.last) return st.reserve;
    return Math.min(RESERVE_MAX, st.reserve + (n - st.last - 1));
  }

  // La tranche de niveau du personnage, et ce que le réseau lui demande le jour n.
  function tranche(level) {
    const T = data().tranches;
    return T.find(t => level >= t.niveaux[0] && level <= t.niveaux[1]) || (level >= NIVEAU && T[T.length - 1]) || T[0] || null;
  }
  function demande(ch, n) {
    const t = tranche(ch.level);
    if (!t || !t.ressources.length) return null;
    const r = t.ressources[indexDe(n) % t.ressources.length];
    return { id: r.id, n: r.n, def: Items.get(r.id) };
  }
  const xpDepot = level => Math.round(XP * Math.pow(level, 1.6));

  // ----- Statut : tout ce qu'il faut pour afficher la Veille et décider d'un dépôt -----

  function statut(ch, opts) {
    opts = opts || {};
    const n = jour(opts.date);
    const st = etat(ch);
    const born = creation(ch.uid);
    const s = {
      jour: n, entree: n == null ? null : entree(n), ouverte: ouverte(ch), niveau: NIVEAU, auRelais: !!opts.auRelais,
      marques: marques(ch), xp: xpDepot(ch.level), demande: null, possede: 0, faite: false, reserve: st.reserve,
      recule: false, rattrapage: false, aFaire: false, peut: false, raison: null, dernier: st.last,
    };
    if (n == null) { s.raison = 'L\'horloge de l\'appareil ne donne pas de date.'; return s; }
    s.demande = demande(ch, n);
    s.possede = s.demande ? ch.count(s.demande.id) : 0;
    // Horloge revenue avant le dernier dépôt (ou avant la création du personnage) : on attend.
    s.recule = (st.last != null && n < st.last) || (born != null && n < born - 1);
    s.faite = st.last === n;
    s.reserve = reserve(st, n);
    s.rattrapage = s.faite && s.reserve > 0;
    s.aFaire = s.ouverte && !s.recule && (!s.faite || s.reserve > 0);
    if (!s.ouverte) s.raison = `La Veille s'ouvre au niveau ${NIVEAU}.`;
    else if (s.recule) s.raison = 'L\'horloge de l\'appareil est revenue avant ta dernière Veille : les dépôts reprendront quand elle l\'aura rattrapée.';
    else if (!s.aFaire) s.raison = 'Veille du jour accomplie. Reviens demain.';
    else if (!s.demande || !s.demande.def) s.raison = 'Le réseau ne demande rien à ta tranche de niveau.';
    else if (!s.auRelais) s.raison = 'Rends-toi à un Relais.';
    else if (s.possede < s.demande.n) s.raison = `Il te faut ${s.demande.n} × ${s.demande.def.name} (tu en as ${s.possede}).`;
    else s.peut = true;
    return s;
  }

  // Le prochain dépôt est possible et pas encore fait : pour un badge sur une icône de menu.
  // Ne regarde ni le sac ni le Relais : c'est un rappel, pas un bouton.
  function badge(ch, date) {
    const s = statut(ch, { date });
    return !!(s.ouverte && !s.recule && !s.faite && s.jour != null);
  }

  // ----- Dépôt -----

  // Le dernier jour manqué du cycle en cours, que remplit un rattrapage (pour la grille).
  function dernierManque(st, n) {
    for (let d = n - 1; d >= Math.max(debutCycle(n), st.first); d--) if (!st.days.includes(d)) return d;
    return null;
  }

  // Dépose pour la Veille : celle du jour d'abord, puis une Veille en réserve. Retire les
  // ressources, donne l'XP, une marque, et les succès de paliers (titres). opts : { date, auRelais }.
  function deposer(ch, opts) {
    const s = statut(ch, opts);
    if (!s.peut) return { ok: false, raison: s.raison, statut: s };
    const n = s.jour;
    const st = etat(ch);
    ch.removeItem(s.demande.id, s.demande.n);
    if (!s.faite) {
      // Dépôt du jour : les jours manqués depuis le dernier passent en réserve.
      st.reserve = s.reserve;
      if (st.first == null) st.first = n;
      st.last = n;
      st.days = st.days.filter(d => d >= debutCycle(n) && d < n).concat(n);
    } else {
      // Rattrapage : une Veille de la réserve ; elle remplit le dernier jour manqué du cycle.
      st.reserve -= 1;
      const d = dernierManque(st, n);
      if (d != null) st.days.push(d);
    }
    st.days.sort((a, b) => a - b);
    ch.veille = st;
    const feats = ch.counters.feats = ch.counters.feats || {};
    feats.veille = (feats.veille || 0) + 1;
    const g = ch.gainXp(s.xp);
    const succes = typeof Achievements === 'object' ? Achievements.check(ch) : [];
    return { ok: true, rattrapage: s.faite, xp: g.gained, levels: g.levels, marques: feats.veille, reserve: st.reserve, succes, demande: s.demande, entree: s.entree };
  }

  // ----- Bonus du jour -----

  // Le bonus du jour, actif seulement après le dépôt du jour (un bonus qu'on choisit d'aller
  // chercher, jamais imposé), jusqu'à minuit.
  function bonusActif(ch, date) {
    const n = jour(date);
    if (n == null || !ch || etat(ch).last !== n || !ouverte(ch)) return null;
    return entree(n).bonus || null;
  }
  const famille = b => ((data().familles || {})[b.famille] || {}).monstres || [];
  const mult = b => 1 + (b.pct || 0) / 100;

  // Ce qu'un combat gagné reçoit : un multiplicateur d'XP par monstre (zone ou famille), un
  // multiplicateur de butin (donjon), et le texte du bonus s'il a servi. ctx : { zone, dungeon, monsters }.
  function combat(ch, ctx, date) {
    ctx = ctx || {};
    const b = bonusActif(ch, date);
    const out = { xp: () => 1, butin: 1, texte: null };
    if (!b) return out;
    if (b.type === 'xp_zone' && ctx.zone === b.zone) out.xp = () => mult(b);
    else if (b.type === 'xp_famille') {
      const f = famille(b);
      out.xp = id => f.includes(id) ? mult(b) : 1;
      if (!(ctx.monsters || []).some(id => f.includes(id))) return out;
    } else if (b.type === 'butin_donjon' && ctx.dungeon && ctx.dungeon === b.donjon) out.butin = mult(b);
    else return out;
    out.texte = texteBonus(b).court;
    return out;
  }

  // Ce que coûte une recette : à l'atelier du jour, chaque ingrédient coûte `pct` % de moins,
  // arrondi au-dessous (un ingrédient compté 1 à 3 reste au prix fort pour un quart de remise).
  function cout(ch, recipe, date) {
    const pct = remise(ch, recipe && recipe.workshop, date);
    if (!pct) return recipe.ingredients;
    return recipe.ingredients.map(i => Object.assign({}, i, { count: Math.max(1, i.count - Math.floor(i.count * pct / 100)) }));
  }
  function remise(ch, workshop, date) {
    const b = bonusActif(ch, date);
    return b && b.type === 'atelier' && b.atelier === workshop ? b.pct : 0;
  }

  // « à » devant un nom de lieu, contracté avec son article : aux Éboulis, au Terrier, à la Fonderie.
  function aLieu(nom) {
    const m = /^(?:(Les|Le|La) |L')(.*)$/.exec(nom);
    if (!m) return `à ${nom}`;
    return ({ Les: 'aux ', Le: 'au ', La: 'à la ' }[m[1]] || 'à l\'') + m[2];
  }

  // Le bonus en mots, pour l'interface : l'effet (titre), sa cible, un détail, et la phrase entière
  // (court), par exemple « +20 % d'XP en combat aux Éboulis ».
  function texteBonus(b) {
    if (!b) return null;
    const p = `${b.pct} %`;
    let t = null;
    if (b.type === 'xp_zone') {
      const z = typeof World === 'function' ? World.index().zones.get(b.zone) : null;
      t = { titre: `+${p} d'XP en combat`, cible: aLieu(z ? z.name : b.zone), detail: 'Les donjons de la zone comptent aussi.' };
    } else if (b.type === 'xp_famille') {
      const f = (data().familles || {})[b.famille] || { nom: b.famille, monstres: [] };
      t = { titre: `+${p} d'XP`, cible: `sur les ${f.nom}`, detail: f.monstres.map(id => DATA.monsters[id] ? DATA.monsters[id].name : id).join(', ') + '.' };
    } else if (b.type === 'butin_donjon') {
      const d = typeof World === 'function' ? World.dungeonDef(b.donjon) : null;
      t = { titre: `+${p} de butin`, cible: aLieu(d ? d.name : b.donjon), detail: 'Les monstres des salles et le trésor de fin.' };
    } else if (b.type === 'atelier') {
      t = { titre: `${p} de ressources en moins`, cible: `à l'atelier ${ATELIERS[b.atelier] || b.atelier}`, detail: `Sur chaque ingrédient demandé par ${Math.ceil(100 / b.pct)} ou plus.` };
    }
    if (t) t.court = `${t.titre} ${t.cible}`;
    return t;
  }

  // ----- Grille du cycle et paliers, pour l'interface -----

  // Les 28 jours du cycle en cours : déposé, manqué, à venir, avant le premier dépôt, aujourd'hui.
  function grille(ch, date) {
    const n = jour(date);
    if (n == null) return [];
    const st = etat(ch);
    const base = debutCycle(n);
    const out = [];
    for (let i = 0; i < CYCLE; i++) {
      const d = base + i;
      const e = entree(d);
      let etatJour = 'avenir';
      if (st.days.includes(d)) etatJour = 'fait';
      else if (d === n) etatJour = 'aujourdhui';
      else if (d < n) etatJour = st.first != null && d > st.first ? 'manque' : 'avant';
      out.push({ n: d, index: i, numero: i + 1, voile: e.voile, element: e.element, nom: e.nom, etat: etatJour, aujourdhui: d === n });
    }
    return out;
  }

  // Les paliers de marques : les succès « haut fait veille », du plus proche au plus lointain.
  function paliers() {
    const defs = typeof Achievements === 'object' ? Achievements.defs() : ((DATA.content && DATA.content.achievements) || []);
    return defs.filter(a => a.cond && a.cond.type === 'feat' && a.cond.key === 'veille')
      .map(a => ({ count: a.cond.count, succes: a, titre: (a.rewards || {}).title || null }))
      .sort((a, b) => a.count - b.count);
  }

  return {
    NIVEAU, RESERVE_MAX, CYCLE, EPOQUE, VOILES, ROMAINS, ATELIERS,
    get horloge() { return horloge; }, set horloge(fn) { horloge = typeof fn === 'function' ? fn : () => Date.now(); },
    jour, creation, entree, jourDuCycle, etat, marques, ouverte, reserve, tranche, demande, xpDepot,
    statut, badge, deposer, bonusActif, combat, cout, remise, texteBonus, grille, paliers,
  };
})();
