const Veille = (() => {
  const NIVEAU = 15;
  const RESERVE_MAX = 7;
  const CYCLE = 28;
  const SEMAINE = 7;
  const XP = 12;
  const EPOQUE = Date.UTC(2026, 0, 5);
  const JOUR_MS = 86400000;
  const VOILES = ['Jour d\'Ithren', 'Jour d\'Aïven', 'Jour de Durren', 'Jour de Morrha', 'Jour d\'Iskar', 'Jour de Nohra', 'Jour de Ruhani'];
  const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const ATELIERS = { tailleur: 'du tailleur', cordonnier: 'du cordonnier', bijoutier: 'du bijoutier', forgeron: 'du forgeron', alchimiste: 'de l\'alchimiste' };

  const data = () => (DATA.content && DATA.content.veille) || { jours: [], tranches: [], familles: {} };

  let horloge = () => Date.now();

  function jour(date) {
    const d = date == null ? new Date(horloge()) : (date instanceof Date ? date : new Date(date));
    if (isNaN(d.getTime())) return null;
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOQUE) / JOUR_MS);
  }

  function creation(uid) {
    if (typeof uid !== 'string' || !/^[a-z0-9]{8,}$/.test(uid)) return null;
    const t = parseInt(uid.slice(0, 8), 36);
    if (!(t >= Date.UTC(2024, 0, 1) && t <= Math.max(horloge(), Date.now()) + 2 * JOUR_MS)) return null;
    return jour(new Date(t));
  }

  const indexDe = n => ((n % CYCLE) + CYCLE) % CYCLE;
  const debutCycle = n => n - indexDe(n);

  function entree(n) {
    const i = indexDe(n);
    const e = data().jours[i] || {};
    const voile = e.voile || (i % SEMAINE) + 1;
    return Object.assign({}, e, {
      n, index: i, numero: i + 1, semaine: Math.floor(i / SEMAINE), voile,
      voileNom: VOILES[voile - 1], voileChiffre: ROMAINS[voile - 1],
      element: e.element || ['terre', 'feu', 'eau', 'air'][Math.floor(i / SEMAINE)],
    });
  }

  const jourDuCycle = date => { const n = jour(date); return n == null ? null : indexDe(n) + 1; };


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

  function reserve(st, n) {
    if (st.last == null || n <= st.last) return st.reserve;
    return Math.min(RESERVE_MAX, st.reserve + (n - st.last - 1));
  }

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
  const xpDepot = level => Math.round(XP * Math.pow(level / 2, 1.6));


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

  function badge(ch, date) {
    const s = statut(ch, { date });
    return !!(s.ouverte && !s.recule && !s.faite && s.jour != null);
  }


  function dernierManque(st, n) {
    for (let d = n - 1; d >= Math.max(debutCycle(n), st.first); d--) if (!st.days.includes(d)) return d;
    return null;
  }

  function deposer(ch, opts) {
    const s = statut(ch, opts);
    if (!s.peut) return { ok: false, raison: s.raison, statut: s };
    const n = s.jour;
    const st = etat(ch);
    ch.removeItem(s.demande.id, s.demande.n);
    if (!s.faite) {
      st.reserve = s.reserve;
      if (st.first == null) st.first = n;
      st.last = n;
      st.days = st.days.filter(d => d >= debutCycle(n) && d < n).concat(n);
    } else {
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


  function bonusActif(ch, date) {
    const n = jour(date);
    if (n == null || !ch || etat(ch).last !== n || !ouverte(ch)) return null;
    return entree(n).bonus || null;
  }
  const famille = b => ((data().familles || {})[b.famille] || {}).monstres || [];
  const mult = b => 1 + (b.pct || 0) / 100;

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

  function cout(ch, recipe, date) {
    const pct = remise(ch, recipe && recipe.workshop, date);
    if (!pct) return recipe.ingredients;
    return recipe.ingredients.map(i => Object.assign({}, i, { count: Math.max(1, i.count - Math.floor(i.count * pct / 100)) }));
  }
  function remise(ch, workshop, date) {
    const b = bonusActif(ch, date);
    const m = workshop && DATA.content && (DATA.content.metiers || []).find(x => x.ateliers.includes(workshop));
    return b && b.type === 'atelier' && (b.atelier === workshop || (m && m.jour === b.atelier)) ? b.pct : 0;
  }

  function aLieu(nom) {
    const m = /^(?:(Les|Le|La) |L')(.*)$/.exec(nom);
    if (!m) return `à ${nom}`;
    return ({ Les: 'aux ', Le: 'au ', La: 'à la ' }[m[1]] || 'à l\'') + m[2];
  }

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
