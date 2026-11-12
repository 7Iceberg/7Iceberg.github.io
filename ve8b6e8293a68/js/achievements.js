const Achievements = (() => {
  const defs = () => (DATA.content && DATA.content.achievements) || [];
  let index = null, indexDe = null;
  const get = id => { const d = defs(); if (indexDe !== d || index.size !== d.length) { index = new Map(d.map(a => [a.id, a])); indexDe = d; } return index.get(id) || null; };
  const S = () => (typeof DATA === 'object' && DATA.succes) || null;
  const classe = a => (S() && S().classement[a.id]) || null;
  const points = a => (a && a.points != null ? a.points : (classe(a) || [0])[0]) || 0;
  const score = ch => (ch.achievements || []).reduce((t, id) => t + points(get(id)), 0);
  const total = ch => defs().filter(a => pourPerso(ch, a)).reduce((t, a) => t + points(a), 0);
  const zoneDef = id => ((DATA.content && DATA.content.zones) || []).find(z => z.id === id);
  const valeurIle = v => typeof v === 'string' && (/^ervane/.test(v) || v === 'puits_de_l_amarre' || (DATA.monsters[v] && DATA.monsters[v].region === 'ervane') || ((zoneDef(v) || {}).region === 'ervane'));
  function ileSeule(a) {
    const c = a.cond || {};
    if (c.type === 'meta') { const l = (c.succes || []).map(get).filter(Boolean); return l.length > 0 && l.every(ileSeule); }
    const vals = [];
    for (const k in c) if (k !== 'type') [].concat(c[k]).forEach(v => vals.push(v));
    return vals.some(valeurIle);
  }
  const pourPerso = (ch, a) => !a ? false : ch.origine === 'ervane' || (ch.achievements || []).includes(a.id) || !ileSeule(a);
  const relaisPour = ch => ((DATA.content && DATA.content.zones) || []).filter(z => ch.origine === 'ervane' || z.region !== 'ervane').flatMap(z => (z.maps || []).filter(m => m.relay).map(m => m.id));
  const cosmetiquesAGagner = () => (typeof Garderobe === 'object' ? Garderobe.defs() : []).filter(c => !c.source || c.source.genre !== 'evenement');
  const JAMAIS_CROISES = ['piouk', 'groukin'];
  const carnetCount = (ch, region) => { const k = ch.counters.kills || {}; return Object.keys(k).filter(id => DATA.monsters[id] && DATA.monsters[id].region === region && !DATA.monsters[id].summon).length
    + (region === 'orsane' && ch.origine === 'ervane' ? JAMAIS_CROISES.filter(id => DATA.monsters[id] && DATA.monsters[id].region === 'orsane' && !k[id]).length : 0); };
  const zoneMaps = id => { const z = ((DATA.content && DATA.content.zones) || []).find(x => x.id === id); return z ? z.maps.map(m => m.id) : []; };
  const zoneSeen = (ch, id) => zoneMaps(id).filter(m => ch.counters.maps.includes(m)).length;

  function met(ch, c) {
    const k = ch.counters;
    switch (c.type) {
      case 'fights': return k.wins >= c.count;
      case 'kills': return (k.kills[c.monster] || 0) >= c.count;
      case 'level': return ch.level >= c.level;
      case 'dungeon': return k.dungeons.includes(c.dungeon);
      case 'dungeonTurns': return ((k.dungeonTurns || {})[c.dungeon] || Infinity) <= c.max;
      case 'boss': return k.bosses.includes(c.monster);
      case 'feat': return ((k.feats || {})[c.key] || 0) >= c.count;
      case 'carnet': return carnetCount(ch, c.region) >= c.count;
      case 'quests': return k.questsDone >= c.count;
      case 'quest': return !!(ch.quests && Array.isArray(ch.quests.done) && ch.quests.done.includes(c.quest));
      case 'questline': return (c.quests || []).every(id => ((ch.quests || {}).done || []).includes(id));
      case 'maps': return k.maps.length >= c.count;
      case 'zone': { const n = zoneMaps(c.zone).length; return n > 0 && zoneSeen(ch, c.zone) >= n; }
      case 'craft': return k.crafts >= c.count;
      case 'gather': return k.gathers >= c.count;
      case 'recoltes': { const l = recoltesDu(c.metier); return l.length > 0 && l.every(r => ((k.recoltes || {})[r] || 0) >= 1); }
      case 'fils': return k.filsEarned >= c.count;
      case 'set': { const s = Items.getSet(c.set); return !!s && (ch.derived().setCount[c.set] || 0) >= s.pieces.length; }
      case 'bossDefi': return ((k.feats || {})[`bossdefi.${c.monster}.${c.defi}`] || 0) >= 1;
      case 'noeudsBoss': return ((k.feats || {})[`noeudsboss.${c.monster}`] || 0) >= c.count;
      case 'famille': { const l = presents(c.monstres); return l.length > 0 && l.every(m => c.defi ? ((k.feats || {})['killdefi.' + m] || 0) >= 1 : (k.kills[m] || 0) >= 1); }
      case 'argentes': { const l = presents(c.monstres); return l.length > 0 && l.every(m => (k.kills[m] || 0) >= 1); }
      case 'defisDistincts': return defisVus(ch) >= c.count;
      case 'meta': { const l = enfants(ch, c); return l.length > 0 && l.every(a => (ch.achievements || []).includes(a.id)); }
      case 'score': return score(ch) >= c.count;
      case 'relais': return (ch.relays || []).filter(id => relaisPour(ch).includes(id)).length >= Math.min(c.count, relaisPour(ch).length) && relaisPour(ch).length > 0;
      case 'faction': { const f = ch.faction || {}; if (c.jure) return typeof Factions === 'object' && Factions.isSworn(ch); if (c.rang) return !!f.id && (f.rank || 0) >= c.rang; if (c.marcheurs) return (f.marcheurs || 0) >= c.marcheurs; return false; }
      case 'familier': { const fs = typeof Familiers === 'object' ? Object.keys(ch.familiers || {}).filter(id => Familiers.get(id)) : []; return c.niveau ? fs.some(id => Familiers.niveauDe(ch, id) >= c.niveau) : fs.length >= c.count; }
      case 'monture': return typeof Montures === 'object' && !!Montures.de(ch) && (!c.niveau || Montures.niveau(ch) >= c.niveau);
      case 'garderobe': { if (typeof Garderobe !== 'object') return false; const n = Garderobe.possedes().length; return n >= (c.count === 'tout' ? cosmetiquesAGagner().length : c.count); }
      default: return false;
    }
  }
  const presents = l => (l || []).filter(m => DATA.monsters[m]);
  const defisVus = ch => Object.keys((ch.counters && ch.counters.feats) || {}).filter(k => /^defivu\./.test(k) && ch.counters.feats[k] > 0).length;
  const enfants = (ch, c) => (c.succes || []).map(get).filter(a => a && pourPerso(ch, a));

  const hasReward = a => { const r = a.rewards || {}; return !!(r.xp || r.fils || (r.items || []).length || r.cosmetique || r.eclats); };

  function check(ch) {
    const out = [];
    ch.achClaimed = ch.achClaimed || [];
    for (let encore = true; encore;) {
      encore = false;
      for (const a of defs()) {
        if (ch.achievements.includes(a.id) || !met(ch, a.cond || {})) continue;
        ch.achievements.push(a.id);
        encore = true;
        const r = a.rewards || {};
        if (r.title && !ch.titles.includes(r.title)) ch.titles.push(r.title);
        if (!hasReward(a)) ch.achClaimed.push(a.id);
        out.push({ achievement: a, xp: r.xp || 0, levels: 0, fils: r.fils || 0, title: r.title || null, pending: hasReward(a), points: points(a) });
      }
    }
    return out;
  }

  function pending(ch) {
    const claimed = ch.achClaimed || [];
    return ch.achievements.filter(id => !claimed.includes(id)).map(get).filter(Boolean);
  }

  function claim(ch, id) {
    const a = get(id);
    if (!a || !ch.achievements.includes(id)) return null;
    ch.achClaimed = ch.achClaimed || [];
    if (ch.achClaimed.includes(id)) return null;
    ch.achClaimed.push(id);
    const r = a.rewards || {};
    const got = { achievement: a, xp: 0, levels: 0, fils: r.fils || 0, items: [] };
    if (r.xp) { const g = ch.gainXp(r.xp); got.xp = g.gained; got.levels = g.levels; }
    if (r.fils) { ch.fils += r.fils; ch.counters.filsEarned += r.fils; }
    for (const it of r.items || []) if (Items.get(it.id)) { ch.addItem(it.id, it.count || 1); got.items.push({ id: it.id, count: it.count || 1 }); }
    got.cosmetiques = r.cosmetique && typeof Garderobe !== 'undefined' ? [].concat(r.cosmetique).flatMap(cid => Garderobe.donner(cid, 'succes:' + a.id)) : [];
    got.eclats = r.eclats && typeof Boutique === 'object' ? r.eclats : 0;
    got.fidelite = got.eclats ? Boutique.crediter(r.eclats, 'succès : ' + a.name) : [];
    return got;
  }

  function category(a) {
    if (a.cat) return a.cat;
    if (classe(a)) return classe(a)[1];
    return ancienne(a);
  }
  const sousCategorie = a => a.sous || (classe(a) || [])[2] || 'Général';
  function ancienne(a) {
    const c = a.cond || {};
    switch (c.type) {
      case 'maps': case 'zone': return 'Exploration';
      case 'quests': case 'quest': case 'questline': return 'Quêtes';
      case 'fights': return 'Combat';
      case 'kills': return 'Chasse';
      case 'carnet': return 'Carnet';
      case 'level': return 'Progression';
      case 'dungeon': case 'dungeonTurns': case 'boss': return 'Donjons';
      case 'set': return 'Panoplies';
      case 'craft': case 'gather': return 'Métiers';
      case 'fils': return 'Fortune';
      case 'feat': return /^noeuds_/.test(c.key) ? 'Nœuds' : c.key === 'defi' ? 'Défis' : 'Donjons';
      default: return 'Succès';
    }
  }

  function progress(ch, a) {
    const c = a.cond || {}, k = ch.counters;
    const pair = (v, n) => `${Math.min(v, n)}/${n}`;
    switch (c.type) {
      case 'fights': return pair(k.wins, c.count);
      case 'kills': return pair(k.kills[c.monster] || 0, c.count);
      case 'level': return pair(ch.level, c.level);
      case 'quests': return pair(k.questsDone, c.count);
      case 'questline': return pair((c.quests || []).filter(id => ((ch.quests || {}).done || []).includes(id)).length, (c.quests || []).length);
      case 'maps': return pair(k.maps.length, c.count);
      case 'zone': return pair(zoneSeen(ch, c.zone), zoneMaps(c.zone).length);
      case 'craft': return pair(k.crafts, c.count);
      case 'gather': return pair(k.gathers, c.count);
      case 'recoltes': { const l = recoltesDu(c.metier); return pair(l.filter(r => ((k.recoltes || {})[r] || 0) >= 1).length, l.length); }
      case 'fils': return pair(k.filsEarned, c.count);
      case 'feat': return pair((k.feats || {})[c.key] || 0, c.count);
      case 'carnet': return pair(carnetCount(ch, c.region), c.count);
      case 'dungeonTurns': { const b = (k.dungeonTurns || {})[c.dungeon]; return ch.achievements.includes(a.id) ? 'fait' : b ? `meilleur : ${b} tours` : 'à faire'; }
      case 'noeudsBoss': return pair((k.feats || {})[`noeudsboss.${c.monster}`] || 0, c.count);
      case 'famille': { const l = presents(c.monstres); return pair(l.filter(m => c.defi ? ((k.feats || {})['killdefi.' + m] || 0) >= 1 : (k.kills[m] || 0) >= 1).length, l.length); }
      case 'argentes': { const l = presents(c.monstres); return pair(l.filter(m => (k.kills[m] || 0) >= 1).length, l.length); }
      case 'defisDistincts': return pair(defisVus(ch), c.count);
      case 'meta': { const l = enfants(ch, c); return pair(l.filter(x => ch.achievements.includes(x.id)).length, l.length); }
      case 'score': return pair(score(ch), c.count);
      case 'relais': { const r = relaisPour(ch); return pair((ch.relays || []).filter(id => r.includes(id)).length, Math.min(c.count, r.length)); }
      case 'faction': { const f = ch.faction || {}; return c.rang ? pair(f.id ? f.rank || 0 : 0, c.rang) : c.marcheurs ? pair(f.marcheurs || 0, c.marcheurs) : ch.achievements.includes(a.id) ? 'fait' : 'à faire'; }
      case 'familier': { if (typeof Familiers !== 'object') return 'à faire'; const fs = Object.keys(ch.familiers || {}).filter(id => Familiers.get(id)); return c.niveau ? pair(Math.max(0, ...fs.map(id => Familiers.niveauDe(ch, id))), c.niveau) : pair(fs.length, c.count); }
      case 'monture': return c.niveau && typeof Montures === 'object' ? pair(Montures.niveau(ch), c.niveau) : ch.achievements.includes(a.id) ? 'fait' : 'à faire';
      case 'garderobe': { if (typeof Garderobe !== 'object') return 'à faire'; return pair(Garderobe.possedes().length, c.count === 'tout' ? cosmetiquesAGagner().length : c.count); }
      default: return ch.achievements.includes(a.id) ? 'fait' : 'à faire';
    }
  }

  function avancement(ch, a) {
    if ((ch.achievements || []).includes(a.id)) return [1, 1];
    const m = /^(\d+)\/(\d+)$/.exec(progress(ch, a));
    return m && +m[2] > 0 ? [+m[1], +m[2]] : null;
  }

  function explorerZones() {
    const C = DATA.content;
    if (!C || !C.zones || !C.achievements) return;
    const article = n => n.replace(/^(Les|La|Le) /, m => m.toLowerCase()).replace(/^L'/, 'l\'');
    const de = n => /^Les /.test(n) ? 'des ' + n.slice(4) : /^Le /.test(n) ? 'du ' + n.slice(3) : /^(La |L')/.test(n) ? 'de ' + article(n) : /^[AEIOUYÉÈÊ]/i.test(n) ? 'd\'' + n : 'de ' + n;
    for (const z of C.zones) {
      const id = `explorer_${z.id}`;
      if (z.horsCarte || !(z.maps || []).length || C.achievements.some(a => a.id === id)) continue;
      const [lo, hi] = z.level || [1, 1];
      C.achievements.push({
        id, name: `Explorer ${article(z.name)}`, desc: `Visiter les ${z.maps.length} cartes ${de(z.name)}.`,
        cond: { type: 'zone', zone: z.id }, rewards: { xp: Math.round((lo + hi + 1) / 2 * 1.5) * 10 },
      });
    }
  }

  function recoltesDu(metierId) {
    const C = DATA.content, met = ((C && C.metiers) || []).find(m => m.id === metierId);
    if (!met) return [];
    const posees = new Set();
    for (const z of C.zones || []) for (const m of z.maps || []) for (const n of m.nodes || []) posees.add(n.resource);
    return (C.resources || []).filter(r => r.node && (met.recolte || []).includes(r.node.kind) && posees.has(r.id)).map(r => r.id);
  }
  const TITRES_RECOLTE = { bucheron: 'Ami des Troncs', mineur: 'Fendeur de Roche', paysan: 'Faucheur des Terrasses', alchimiste: 'Cueilleur de Simples', pecheur: 'Lanceur de Lignes' };
  function tourDesRecoltes() {
    const C = DATA.content;
    if (!C || !C.metiers || !C.achievements) return;
    for (const met of C.metiers.filter(m => m.genre === 'recolte')) {
      const id = `tour_recoltes_${met.id}`, l = recoltesDu(met.id);
      if (!l.length || C.achievements.some(a => a.id === id)) continue;
      C.achievements.push({
        id, name: `Le Tour des Récoltes : ${met.nom}`, cat: 'Artisanat', sous: 'Récolte', points: 20,
        desc: `Récolter au moins une fois chaque ressource que le métier de ${met.nom.toLowerCase()} cueille dans le monde (l'avancement dit combien il y en a).`,
        cond: { type: 'recoltes', metier: met.id }, rewards: { xp: 400, fils: 100, title: TITRES_RECOLTE[met.id] || null },
      });
    }
  }

  function integrer() {
    explorerZones();
    tourDesRecoltes();
    const C = DATA.content, src = S();
    if (!C || !C.achievements || !src) return 0;
    const ids = new Set(C.achievements.map(a => a.id));
    const quetes = new Set((C.quests || []).map(q => q.id)), donjons = new Set((C.dungeons || []).map(d => d.id));
    const max = (DATA.rules && DATA.rules.niveauMax) || 60;
    const pret = c => {
      switch (c.type) {
        case 'dungeon': case 'dungeonTurns': return donjons.has(c.dungeon);
        case 'bossDefi': case 'noeudsBoss': case 'kills': case 'boss': return !!DATA.monsters[c.monster];
        case 'famille': case 'argentes': return presents(c.monstres).length > 0;
        case 'zone': return !!zoneDef(c.zone);
        case 'quest': return quetes.has(c.quest);
        case 'questline': return (c.quests || []).length > 0 && c.quests.every(q => quetes.has(q));
        case 'set': { const st = (typeof Items === 'object' && Items.getSet(c.set)) || (C.sets || []).find(x => x.id === c.set); return !!st && (st.level || 1) <= max; }
        case 'meta': return (c.succes || []).some(id => ids.has(id));
        default: return true;
      }
    };
    let n = 0;
    for (const a of src.nouveaux) {
      if (ids.has(a.id) || !pret(a.cond || {})) continue;
      C.achievements.push(JSON.parse(JSON.stringify(a)));
      ids.add(a.id); n++;
    }
    return n;
  }

  function proches(ch, zone) {
    const Z = (DATA.content && DATA.content.zones) || [], DJ = (DATA.content && DATA.content.dungeons) || [];
    if (!ch || !zone) return [];
    const z0 = Z.find(z => z.id === zone.id) || zone;
    const idsDe = x => (typeof x === 'string' ? x : x && x.id);
    const monstresDe = z => {
      const l = new Set(Object.keys((z.faune && z.faune.monstres) || {}));
      for (const m of z.maps || []) for (const g of m.groups || []) for (const x of g.monsters || []) l.add(idsDe(x));
      for (const id of [...l]) for (const r of Object.values(DATA.monsters)) if (r.rare && r.base === id) l.add(r.id);
      return [...l].filter(id => DATA.monsters[id]);
    };
    const npcsDe = z => new Set((z.maps || []).flatMap(m => (m.npcs || []).map(idsDe)));
    const carteZone = {};
    for (const z of Z) for (const m of z.maps || []) carteZone[m.id] = z.id;
    const voisines = [...new Set((z0.maps || []).flatMap(m => Object.values(m.exits || {}).map(e => carteZone[e && e.map ? e.map : e])).filter(id => id && id !== z0.id))].map(id => Z.find(z => z.id === id)).filter(Boolean);
    const nom = id => (DATA.monsters[id] && DATA.monsters[id].name) || id;
    const ici = new Set(monstresDe(z0)), pnj = npcsDe(z0);
    const djIci = DJ.filter(d => d.zone === z0.id), djVoisins = voisines.flatMap(v => DJ.filter(d => d.zone === v.id).map(d => ({ d, v })));
    const bossDe = d => new Set((d.rooms || []).flatMap(r => (r.monsters || []).map(idsDe)).filter(id => DATA.monsters[id] && DATA.monsters[id].boss));
    const out = [];
    for (const a of defs()) {
      if ((ch.achievements || []).includes(a.id) || !pourPerso(ch, a) || met(ch, a.cond)) continue;
      const c = a.cond;
      let raison = null, rang = 9;
      const djDe = id => djIci.find(d => d.id === id) || null, djVDe = id => djVoisins.find(x => x.d.id === id) || null;
      const djBoss = m => djIci.find(d => bossDe(d).has(m)) || null, djVBoss = m => djVoisins.find(x => bossDe(x.d).has(m)) || null;
      if (['dungeon', 'dungeonTurns'].includes(c.type) && c.dungeon) {
        const d = djDe(c.dungeon), dv = !d && djVDe(c.dungeon);
        if (d) { raison = `Le donjon ${d.name} s'ouvre dans cette zone.`; rang = 1; }
        else if (dv) { raison = `Le donjon ${dv.d.name} s'ouvre tout près, ${dv.v.name}.`; rang = 4; }
      } else if (['boss', 'bossDefi', 'noeudsBoss'].includes(c.type) && c.monster) {
        const d = djBoss(c.monster), dv = !d && djVBoss(c.monster);
        if (d) { raison = `${nom(c.monster)} attend au fond du donjon ${d.name}, dans cette zone.`; rang = 1; }
        else if (dv) { raison = `${nom(c.monster)} attend au fond du donjon ${dv.d.name}, tout près.`; rang = 4; }
      } else if (c.type === 'kills' && ici.has(c.monster)) {
        raison = `Tu es dans la zone : ${nom(c.monster)} y vit.`; rang = 2;
      } else if ((c.type === 'famille' || c.type === 'argentes') && (c.monstres || []).some(m => ici.has(m))) {
        const l = (c.monstres || []).filter(m => ici.has(m) && !((ch.counters.kills || {})[m]));
        raison = l.length ? `Tu es dans la zone : ${l.slice(0, 3).map(nom).join(', ')}${l.length > 3 ? '…' : ''} ${l.length > 1 ? 'vivent' : 'vit'} ici.` : 'Tu es dans la zone de cette famille.'; rang = 2;
      } else if (c.type === 'zone') {
        if (c.zone === z0.id) { const n = zoneMaps(c.zone).length, vu = zoneSeen(ch, c.zone); raison = `Tu es dans la zone : ${n - vu} carte${n - vu > 1 ? 's' : ''} sur ${n} à explorer.`; rang = 3; }
        else { const v = voisines.find(x => x.id === c.zone); if (v) { const n = zoneMaps(c.zone).length, vu = zoneSeen(ch, c.zone); raison = `La zone voisine, ${v.name} : ${n - vu} carte${n - vu > 1 ? 's' : ''} à explorer.`; rang = 5; } }
      } else if (c.type === 'relais') {
        const r = (z0.maps || []).filter(m => m.relay).map(m => m.id).filter(id => !(ch.relays || []).includes(id));
        if (r.length) { raison = 'Un Relais de la zone n\'est pas encore éveillé.'; rang = 3; }
      } else if (c.type === 'quest' || c.type === 'questline') {
        const qs = c.type === 'quest' ? [c.quest] : (c.quests || []);
        const q = qs.map(id => typeof Quests === 'object' && Quests.get ? Quests.get(id) : null).find(q => q && pnj.has(q.giver) && !((ch.quests || {}).done || []).includes(q.id));
        if (q) { const n = (DATA.content.npcs || []).find(x => x.id === q.giver); raison = `${n ? n.name : 'Un PNJ'}, ici, donne « ${q.name} ».`; rang = 3; }
      }
      if (raison) out.push({ a, raison, rang });
    }
    return out.sort((x, y) => x.rang - y.rang);
  }

  return { defs, get, met, check, pending, claim, hasReward, category, sousCategorie, progress, avancement, points, score, total, ileSeule, pourPerso, integrer, proches };
})();

Achievements.integrer();
