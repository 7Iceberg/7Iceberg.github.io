const Encyclopedie = (() => {
  const ONGLETS = { bestiaire: 'Bestiaire', equipements: 'Équipements', consommables: 'Consommables', ressources: 'Ressources', cosmetiques: 'Cosmétiques' };
  const SLOTS = { coiffe: 'Coiffe', cape: 'Cape', amulette: 'Amulette', anneau: 'Anneau', anneau1: 'Anneau', anneau2: 'Anneau', ceinture: 'Ceinture', bottes: 'Bottes', bouclier: 'Bouclier', veylith: 'Veylith' };
  const CONSOS = { pain: 'Pain', potion: 'Potion', parchemin: 'Parchemin', cle: 'Clé', oeuf: 'Œuf de familier', monture: 'Monture' };
  const NOEUDS = { bois: 'Bois', pierre: 'Pierre', plante: 'Plante', poisson: 'Poisson', cereale: 'Céréale' };
  const label = (l, id, autre) => Object.hasOwn(l, id) ? l[id] : autre;
  const cle = (type, id) => type + ':' + id;
  const plie = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const parNom = (a, b) => a.nom.localeCompare(b.nom, 'fr');
  const ajout = (index, id, valeur) => {
    if (!index.has(id)) index.set(id, []);
    index.get(id).push(valeur);
  };

  function bornes(niveau) {
    const valeurs = Array.isArray(niveau) ? niveau : String(niveau || '').match(/\d+/g);
    if (!valeurs?.length) return [];
    return valeurs.map(Number);
  }

  function compiler() {
    const contenu = DATA.content;
    const vues = Object.fromEntries(Object.keys(ONGLETS).map(id => [id, []]));
    const entrees = new Map(), recettes = new Map(), usages = new Map(), sources = new Map();
    const ajouter = (vue, type, id, nom, categorie, niveau, def, plus = {}) => {
      const e = { cle: cle(type, id), type, id, vue, nom, categorie, niveau: bornes(niveau), def, ...plus };
      e.recherche = plie([nom, categorie, plus.panoplie?.name, ...(plus.lieux || []).map(l => l.nom)].filter(Boolean).join(' '));
      vues[vue].push(e);
      entrees.set(e.cle, e);
      return e;
    };

    for (const d of Items.all()) {
      const panoplie = Items.setOf(d.id);
      if (d.kind === 'weapon') ajouter('equipements', 'objet', d.id, d.name, Items.WEAPON_TYPES[d.type]?.label || 'Arme', d.level, d, { panoplie });
      if (d.kind === 'equip') ajouter('equipements', 'objet', d.id, d.name, label(SLOTS, d.slot, 'Équipement'), d.level, d, { panoplie });
      if (d.kind === 'resource') ajouter('ressources', 'objet', d.id, d.name, label(NOEUDS, d.node?.kind, d.node ? 'Récolte' : 'Ressource'), Metiers.niveauRessource(d.id), d);
      if (d.kind === 'consumable' || d.kind === 'knot') ajouter('consommables', 'objet', d.id, d.name, d.kind === 'knot' ? 'Nœud' : label(CONSOS, d.sub, 'Consommable'), d.level, d);
    }
    for (const p of Items.allSets()) ajouter('equipements', 'panoplie', p.id, p.name, 'Panoplie', p.level, p);
    for (const c of Garderobe.defs()) ajouter('cosmetiques', 'cosmetique', c.id, c.nom, label(Garderobe.TYPE_LABEL, c.type, 'Cosmétique'), c.niveau, c);

    for (const r of Items.recipes()) {
      if (!Items.get(r.result)) continue;
      ajout(recettes, r.result, r);
      for (const id of new Set((r.ingredients || []).map(i => i.id))) ajout(usages, id, r);
    }
    for (const m of Object.values(DATA.monsters)) {
      if (!m.id || !m.name || m.summon || m.classId) continue;
      const lieux = Bestiaire.lieux(m.rare && m.base ? m.base : m.id);
      if (!lieux.length) continue;
      const butin = Items.dropsOf(m.id).filter(b => Items.get(b.id));
      const e = ajouter('bestiaire', 'monstre', m.id, m.name, m.rare ? 'Rare' : m.boss ? 'Boss' : 'Monstre',
        Bestiaire.niveauVu(m.id), m, { lieux, butin });
      for (const b of butin) ajout(sources, b.id, { genre: 'Butin', nom: e.nom, cible: e.cle, lieux, taux: b.rate });
    }
    for (const z of contenu.zones || []) {
      const noeuds = new Set((z.maps || []).flatMap(m => m.nodes || []).map(n => typeof n === 'string' ? n : n?.resource));
      for (const id of noeuds) if (Items.get(id)) ajout(sources, id, { genre: 'Récolte', nom: z.name });
    }
    const recompenses = (liste, genre) => {
      for (const d of liste || []) for (const r of d.rewards?.items || []) {
        if (Items.get(r.id)) ajout(sources, r.id, { genre, nom: d.name });
      }
    };
    recompenses(contenu.quests, 'Quête');
    recompenses(contenu.dungeons, 'Donjon');
    recompenses(contenu.achievements, 'Succès');
    for (const p of contenu.npcs || []) for (const id of p.shop || []) {
      if (Items.get(id)) ajout(sources, id, { genre: 'Marchand', nom: p.name });
    }
    for (const liste of Object.values(vues)) liste.sort(parNom);
    return { vues, entrees, recettes, usages, sources };
  }

  function modes(e, index) {
    if (e.type === 'cosmetique') return [Garderobe.SOURCE_LABEL[e.def.source?.genre] || 'En jouant'];
    if (e.type !== 'objet') return [];
    const s = (index.sources.get(e.id) || []).map(x => x.genre);
    if (index.recettes.has(e.id)) s.unshift('Artisanat');
    if (e.def.node && !s.includes('Récolte')) s.push('Récolte');
    return [...new Set(s)];
  }

  function filtrer(index, vue, f) {
    const q = plie(f.q).trim();
    const premier = f.min === '' ? 0 : Number(f.min);
    const dernier = f.max === '' ? Infinity : Number(f.max);
    const min = Math.min(premier, dernier), max = Math.max(premier, dernier);
    const l = (index.vues[vue] || []).filter(e => {
      const [bas, haut = bas] = e.niveau;
      return (!q || e.recherche.includes(q)) && (!f.cat || e.categorie === f.cat) &&
        (bas == null || (haut >= min && bas <= max)) &&
        (!f.stat || (e.type === 'panoplie' ? Object.values(e.def.bonuses).some(b => b[f.stat] > 0) : e.def.stats?.[f.stat] > 0)) &&
        (!f.region || e.lieux?.some(lieu => lieu.region === f.region)) &&
        (!f.source || modes(e, index).includes(f.source));
    });
    if (f.tri === 'niveau') l.sort((a, b) => (a.niveau[0] ?? Infinity) - (b.niveau[0] ?? Infinity) || parNom(a, b));
    return l;
  }

  function planPanoplie(ch, panoplie, index) {
    const portes = Object.values(ch.equipment || {});
    const pieces = panoplie.pieces.map(id => ({ id, possede: ch.count(id) > 0 || portes.includes(id) }));
    const besoins = new Map(), aObtenir = [], choix = [];
    for (const p of pieces) {
      if (p.possede) continue;
      const recettes = index.recettes.get(p.id) || [];
      if (recettes.length === 0) aObtenir.push(p.id);
      if (recettes.length > 1) choix.push(p.id);
      if (recettes.length !== 1) continue;
      for (const i of recettes[0].ingredients) besoins.set(i.id, (besoins.get(i.id) || 0) + i.count);
    }
    return { pieces, aObtenir, choix, ingredients: [...besoins].map(([id, total]) => ({
      id, total, manque: Math.max(0, total - ch.count(id)),
    })).sort((a, b) => Number(b.manque > 0) - Number(a.manque > 0)) };
  }

  return { ONGLETS, cle, compiler, filtrer, modes, planPanoplie };
})();
