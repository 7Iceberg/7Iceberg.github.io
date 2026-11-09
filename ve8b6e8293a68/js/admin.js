const Admin = (() => {
  const CLE = 'veylan.admin';

  const DROITS = [
    ['open', 'Ouvrir le Conseil', 'Accès', 1],
    ['console', 'Console de commandes', 'Accès', 1],
    ['journal', 'Lire le journal du staff', 'Accès', 2],
    ['moderation', 'Modération : signalements, sanctions, contestations (sur le serveur)', 'Modération', 1],
    ['annonce', 'Faire une annonce', 'Accès', 1],
    ['fiche', 'Voir la fiche du personnage', 'Personnage', 1],
    ['soigner', 'Soigner', 'Personnage', 1],
    ['teleport', 'Se téléporter (cartes, relais)', 'Personnage', 1],
    ['xp', 'Donner de l\'expérience', 'Personnage', 3],
    ['niveau', 'Changer le niveau', 'Personnage', 4],
    ['caracs', 'Points de caractéristique', 'Personnage', 3],
    ['dragmes', 'Donner ou retirer des Dragmes', 'Personnage', 3],
    ['items', 'Donner ou retirer des objets', 'Objets', 3],
    ['base', 'Consulter la base des objets', 'Objets', 1],
    ['metiers', 'Métiers : recettes et ingrédients', 'Objets', 3],
    ['quetes', 'Quêtes : accepter, terminer, abandonner', 'Progression', 3],
    ['succes', 'Succès : donner, retirer', 'Progression', 3],
    ['compagnons', 'Familiers, montures, cosmétiques', 'Progression', 3],
    ['monde', 'Monde : heure, monstres, carte', 'Monde', 2],
    ['combat', 'Combat : gagner, perdre', 'Monde', 2],
    ['outils', 'Outils : invincible', 'Monde', 2],
    ['sauvegarde', 'Sauvegarde : écrire, exporter', 'Serveur', 4],
    ['rangs', 'Rangs et droits du staff', 'Serveur', 5],
  ];
  const DROIT = Object.fromEntries(DROITS.map(d => [d[0], { id: d[0], label: d[1], cat: d[2], niveau: d[3] }]));

  const RANGS = {
    veilleur: { label: 'Veilleur', niveau: 0, couleur: '#a3a9bd', droits: {}, desc: 'Un joueur : pas d\'accès au Conseil.' },
    guide: { label: 'Guide', niveau: 1, couleur: '#57c7ff', droits: {}, desc: 'L\'aide aux joueurs : la fiche, soigner, téléporter, annoncer.' },
    gardien: { label: 'Gardien', niveau: 2, couleur: '#2fd27a', droits: {}, desc: 'La modération : le monde, le combat, le journal.' },
    archiviste: { label: 'Archiviste', niveau: 3, couleur: '#b78cff', droits: {}, desc: 'Le contenu : objets, métiers, quêtes, succès, compagnons, Dragmes.' },
    flamme: { label: 'Gardien de la Flamme', niveau: 4, couleur: '#f2c14e', droits: {}, desc: 'L\'administration : le niveau, la sauvegarde.' },
    fondateur: { label: 'Fondateur', niveau: 5, couleur: '#ff8a5c', droits: {}, desc: 'Tout, rangs et droits compris.' },
  };

  let etat = null;
  const lire = () => {
    if (etat) return etat;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { o = null; }
    etat = o && typeof o === 'object' ? o : {};
    if (!etat.rangs || typeof etat.rangs !== 'object') etat.rangs = JSON.parse(JSON.stringify(RANGS));
    if (!etat.membres || typeof etat.membres !== 'object') etat.membres = {};
    if (!Array.isArray(etat.journal)) etat.journal = [];
    if (!etat.outils || typeof etat.outils !== 'object') etat.outils = {};
    return etat;
  };
  const ecrire = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {   } };

  const dev = () => {
    try {
      if (typeof Util === 'object' && Util.PORTES_DEV === true && /[?&]admin=1\b/.test(location.search)) return true;
      return location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    } catch (e) { return false; }
  };

  let ctx = { world: null, hud: null };
  const ch = () => ctx.world && ctx.world.ch;
  const cleMembre = c => c ? (c.uid || c.name) : null;

  function rangDe(c) {
    try { if (dev() && /[?&]admin=fondateur\b/.test(location.search)) return 'fondateur'; } catch (e) {   }
    const e = lire(), k = cleMembre(c || ch());
    const id = k && e.membres[k];
    if (!dev()) return 'veilleur';
    if (id && e.rangs[id]) return id;
    return 'fondateur';
  }
  const rang = id => lire().rangs[id] || null;

  function peut(droit, idRang) {
    const r = rang(idRang || rangDe());
    const d = DROIT[droit];
    if (!r || !d) return false;
    if (r.droits && typeof r.droits[droit] === 'boolean') return r.droits[droit];
    return r.niveau >= d.niveau;
  }

  function noter(action, detail) {
    const e = lire(), c = ch();
    e.journal.push({ t: Date.now(), qui: c ? c.name : '?', rang: rangDe(), action, detail: String(detail || '') });
    if (e.journal.length > 400) e.journal.splice(0, e.journal.length - 400);
    ecrire();
  }

  const plie = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  function chercher(liste, q, nom) {
    const f = plie(q);
    if (!f) return null;
    return liste.find(x => x.id === q) || liste.find(x => plie(x.id) === f) || liste.find(x => plie(nom(x)) === f) || liste.find(x => plie(nom(x)).startsWith(f)) || liste.find(x => plie(nom(x)).includes(f)) || null;
  }
  const objets = () => (typeof Items === 'object' ? Items.all() : []);
  const cartes = () => [...World.index().maps.values()].map(e => ({ id: e.def.id, name: e.def.name, zone: e.zone }));
  const quetes = () => (typeof Quests === 'object' ? Quests.defs() : []);
  const succesListe = () => (typeof Achievements === 'object' ? Achievements.defs() : []);
  const ok = texte => ({ ok: true, texte });
  const non = raison => ({ ok: false, texte: raison });
  const nombre = (v, def) => { const n = Number(String(v == null ? '' : v).replace(',', '.')); return Number.isFinite(n) ? n : def; };
  const apres = () => { const w = ctx.world; if (!w) return; w.emit('update'); w.emit('save'); };
  const enCombat = () => { const w = ctx.world; return !!w && (w.state === 'combat' || !!w.showCombat); };

  const COMMANDES = {
    aide: { droit: 'console', usage: '/aide', aide: 'La liste des commandes que ton rang permet.',
      faire: () => ok(Object.entries(COMMANDES).filter(([, c]) => peut(c.droit)).map(([, c]) => `${c.usage} : ${c.aide}`).join('\n')) },
    annonce: { droit: 'annonce', usage: '/annonce <texte>', aide: 'Une annonce à l\'écran.',
      faire: a => { const t = a.join(' ').trim(); if (!t) return non('Quel texte ?'); if (ctx.hud && ctx.hud.annonceAdmin) ctx.hud.annonceAdmin(t); else if (ctx.hud) ctx.hud.toast(t); return ok(`Annonce : ${t}`); } },
    soigner: { droit: 'soigner', usage: '/soigner', aide: 'Les PV au maximum (en combat aussi).',
      faire: () => {
        const c = ch(); if (!c) return non('Pas de personnage.');
        c.hp = c.derived().hpMax;
        const cb = ctx.world.combat, p = cb && cb.player;
        if (enCombat() && p && p.alive) p.hp = p.hpMax;
        apres(); ctx.world.emit('hp');
        return ok(`${c.name} est soigné.`);
      } },
    xp: { droit: 'xp', usage: '/xp <nombre>', aide: 'Donner de l\'expérience (sans la Sagesse).',
      faire: a => {
        const c = ch(), n = Math.floor(nombre(a[0], NaN));
        if (!c || !(n > 0) || n > 1e9) return non('Un nombre d\'XP, positif.');
        let lv = 0; c.xp += n;
        while (c.level < Character.MAX_LEVEL && c.xp >= Character.xpToNext(c.level)) { c.xp -= Character.xpToNext(c.level); c.level++; c.statPoints += 5; lv++; }
        if (lv) { if (c.autoStats) c.autoAllocate(); c.hp = c.derived().hpMax; ctx.world.emit('levelUp', { level: c.level, levels: lv }); }
        apres();
        return ok(`+${n} XP${lv ? ` · niveau ${c.level}` : ''}.`);
      } },
    niveau: { droit: 'niveau', usage: '/niveau <1-200>', aide: 'Changer le niveau (les points sont remis à répartir).',
      faire: a => {
        const c = ch(), n = Math.floor(nombre(a[0], NaN));
        if (!c || !(n >= 1 && n <= Character.MAX_LEVEL)) return non(`Un niveau de 1 à ${Character.MAX_LEVEL}.`);
        if (enCombat()) return non('Pas pendant un combat.');
        c.level = n; c.xp = 0; c.resetStats(); c.hp = c.derived().hpMax;
        apres();
        return ok(`${c.name} passe au niveau ${n}.`);
      } },
    points: { droit: 'caracs', usage: '/points <nombre>', aide: 'Des points de caractéristique à répartir.',
      faire: a => { const c = ch(), n = Math.floor(nombre(a[0], NaN)); if (!c || !Number.isFinite(n) || Math.abs(n) > 5000) return non('Un nombre de points.'); c.statPoints = Math.max(0, c.statPoints + n); apres(); return ok(`${n >= 0 ? '+' : ''}${n} points (${c.statPoints} à répartir).`); } },
    dragmes: { droit: 'dragmes', usage: '/dragmes <nombre>', aide: 'Donner des Dragmes (négatif pour en retirer).',
      faire: a => { const c = ch(), n = Math.floor(nombre(a[0], NaN)); if (!c || !Number.isFinite(n) || Math.abs(n) > 1e9) return non('Un montant.'); c.fils = Math.max(0, (c.fils || 0) + n); apres(); return ok(`${n >= 0 ? '+' : ''}${n} Dragmes (${c.fils} en poche).`); } },
    donner: { droit: 'items', usage: '/donner <objet> [nombre]', aide: 'Donner un objet (identifiant ou nom).',
      faire: a => {
        const c = ch(); if (!c) return non('Pas de personnage.');
        const dernier = a.length > 1 && Number.isFinite(Number(a[a.length - 1])) ? Number(a.pop()) : 1;
        const d = chercher(objets(), a.join(' '), x => x.name), n = Math.floor(dernier);
        if (!d) return non('Objet introuvable.');
        if (!(n >= 1 && n <= 9999)) return non('Une quantité de 1 à 9 999.');
        c.addItem(d.id, n); apres();
        return ok(`${d.name} × ${n} donné.`);
      } },
    retirer: { droit: 'items', usage: '/retirer <objet> [nombre]', aide: 'Retirer un objet du sac.',
      faire: a => {
        const c = ch(); if (!c) return non('Pas de personnage.');
        const dernier = a.length > 1 && Number.isFinite(Number(a[a.length - 1])) ? Number(a.pop()) : null;
        const d = chercher(objets().filter(x => c.count(x.id) > 0), a.join(' '), x => x.name);
        if (!d) return non('Cet objet n\'est pas dans le sac.');
        const n = Math.min(c.count(d.id), dernier == null ? c.count(d.id) : Math.floor(dernier));
        if (!(n >= 1)) return non('Une quantité.');
        c.removeItem(d.id, n); apres();
        return ok(`${d.name} × ${n} retiré.`);
      } },
    fabriquer: { droit: 'metiers', usage: '/fabriquer <objet> [ingredients]', aide: 'L\'objet d\'une recette, gratuitement (ou ses ingrédients).',
      faire: a => {
        const c = ch(); if (!c) return non('Pas de personnage.');
        const ingr = a.length > 1 && plie(a[a.length - 1]) === 'ingredients' ? !!a.pop() : false;
        const recettes = Items.recipes().filter(r => Items.get(r.result));
        const d = chercher(recettes.map(r => Items.get(r.result)), a.join(' '), x => x.name);
        const r = d && recettes.find(x => x.result === d.id);
        if (!r) return non('Recette introuvable.');
        if (ingr) { for (const i of r.ingredients || []) c.addItem(i.id, i.count); apres(); return ok(`Les ingrédients de ${d.name} sont dans le sac.`); }
        c.addItem(d.id, r.count || 1); apres();
        return ok(`${d.name} fabriqué.`);
      } },
    tp: { droit: 'teleport', usage: '/tp <carte>', aide: 'Aller sur une carte (identifiant ou nom).',
      faire: a => {
        const w = ctx.world; if (!w) return non('Pas de monde.');
        if (enCombat()) return non('Pas pendant un combat.');
        const m = chercher(cartes(), a.join(' '), x => x.name);
        if (!m) return non('Carte introuvable.');
        if (w.relayOpen) w.relayOpen = false;
        w.state = 'explore'; w.enter(m.id, { relay: true }); w.emit('save');
        return ok(`Téléporté : ${m.name}${m.zone ? ` (${m.zone.name})` : ''}.`);
      } },
    relais: { droit: 'teleport', usage: '/relais', aide: 'Retour au dernier Relais.',
      faire: () => { const w = ctx.world; if (enCombat()) return non('Pas pendant un combat.'); w.teleportToRelay(); return ok('Retour au Relais.'); } },
    quete: { droit: 'quetes', usage: '/quete <quête> <accepter|terminer|abandonner|oublier>', aide: 'Mener une quête.',
      faire: a => {
        const w = ctx.world, c = ch(); if (!c) return non('Pas de personnage.');
        const verbe = plie(a.length > 1 ? a.pop() : '');
        const q = chercher(quetes(), a.join(' '), x => x.name);
        if (!q) return non('Quête introuvable.');
        if (verbe === 'accepter') { if (c.quests.active[q.id]) return non('Déjà en cours.'); c.quests.done = c.quests.done.filter(id => id !== q.id); c.quests.active[q.id] = { step: 0, counts: {} }; }
        else if (verbe === 'terminer') {
          if (!c.quests.active[q.id]) c.quests.active[q.id] = { step: 0, counts: {} };
          c.quests.active[q.id].step = (q.steps || []).length;
          const r = Quests.complete(c, q.id);
          if (!r) return non('La remise a échoué.');
          w.emit('quest', { type: 'complete', id: q.id, rewards: r });
          if (r.levels) w.emit('levelUp', { level: c.level, levels: r.levels });
          if (w.checkAchievements) w.checkAchievements();
        }
        else if (verbe === 'abandonner') { if (!c.quests.active[q.id]) return non('Pas en cours.'); delete c.quests.active[q.id]; }
        else if (verbe === 'oublier') { delete c.quests.active[q.id]; c.quests.done = c.quests.done.filter(id => id !== q.id); }
        else return non('accepter, terminer, abandonner ou oublier.');
        apres();
        return ok(`${q.name} : ${verbe}.`);
      } },
    succes: { droit: 'succes', usage: '/succes <succès> <donner|retirer>', aide: 'Donner ou retirer un succès.',
      faire: a => {
        const c = ch(); if (!c) return non('Pas de personnage.');
        const verbe = plie(a.length > 1 ? a.pop() : 'donner');
        const s = chercher(succesListe(), a.join(' '), x => x.name);
        if (!s) return non('Succès introuvable.');
        c.achievements = c.achievements || [];
        if (verbe === 'retirer') c.achievements = c.achievements.filter(id => id !== s.id);
        else if (!c.achievements.includes(s.id)) c.achievements.push(s.id);
        apres();
        return ok(`${s.name} : ${verbe === 'retirer' ? 'retiré' : 'donné'}.`);
      } },
    familier: { droit: 'compagnons', usage: '/familier <familier>', aide: 'Faire éclore un familier.',
      faire: a => { const c = ch(); if (typeof Familiers !== 'object') return non('Pas de familiers.'); const f = chercher(Familiers.liste(), a.join(' '), x => x.nom); if (!f) return non('Familier introuvable.'); const r = Familiers.eclore(c, f.id); if (!r.ok) return non(r.raison); apres(); return ok(`${f.nom} a éclos.`); } },
    monture: { droit: 'compagnons', usage: '/monture <monture>', aide: 'Donner une monture (remplace l\'actuelle).',
      faire: a => { const c = ch(); if (typeof Montures !== 'object') return non('Pas de montures.'); const m = chercher(Montures.liste(), a.join(' '), x => x.nom); if (!m) return non('Monture introuvable.'); const garde = c.level; if (c.level < 1) c.level = 1; c.monture = null; const r = Montures.donner(c, m.id); c.level = garde; if (!r.ok) return non(r.raison); apres(); return ok(`${m.nom} est à toi.`); } },
    cosmetique: { droit: 'compagnons', usage: '/cosmetique <cosmétique>', aide: 'Donner un cosmétique à la Garde-robe.',
      faire: a => { if (typeof Garderobe !== 'object') return non('Pas de Garde-robe.'); const g = chercher(Garderobe.defs(), a.join(' '), x => x.nom); if (!g) return non('Cosmétique introuvable.'); if (Garderobe.possede(g.id)) return non('Déjà dans la Garde-robe.'); Garderobe.donner(g.id, 'conseil'); apres(); return ok(`${g.nom} entre dans la Garde-robe.`); } },
    heure: { droit: 'monde', usage: '/heure <0-23|auto>', aide: 'Figer l\'heure du jeu, ou la rendre.',
      faire: a => { if (typeof Heure !== 'object') return non('Pas d\'heure.'); const v = plie(a[0]); if (v === 'auto' || v === '') { Heure.figer(null); apres(); return ok('L\'heure suit son cours.'); } const h = nombre(v, NaN); if (!(h >= 0 && h < 24)) return non('Une heure de 0 à 23, ou auto.'); Heure.figer(h); apres(); return ok(`Il est ${Math.floor(h)} h.`); } },
    monstres: { droit: 'monde', usage: '/monstres <vider|repeupler>', aide: 'Les groupes de la carte.',
      faire: a => {
        const w = ctx.world, v = plie(a[0]);
        if (enCombat()) return non('Pas pendant un combat.');
        if (v === 'vider') { const n = w.groups.length; w.groups = []; w.emit('update'); return ok(`${n} groupe${n > 1 ? 's' : ''} retiré${n > 1 ? 's' : ''}.`); }
        if (v === 'repeupler') { w.enter(w.mapId, { relay: true }); return ok('La carte est repeuplée.'); }
        return non('vider ou repeupler.');
      } },
    carte: { droit: 'monde', usage: '/carte reveler', aide: 'Toutes les cartes explorées.',
      faire: () => { const c = ch(); const ids = cartes().map(m => m.id); c.counters.maps = [...new Set([...(c.counters.maps || []), ...ids])]; apres(); return ok(`${ids.length} cartes explorées.`); } },
    combat: { droit: 'combat', usage: '/combat <gagner|perdre>', aide: 'Finir le combat en cours.',
      faire: a => {
        const w = ctx.world, cb = w && w.combat, v = plie(a[0]);
        if (!enCombat() || !cb || cb.phase === 'ended') return non('Aucun combat en cours.');
        if (v === 'gagner') { for (const e of cb.entities) if (e.team !== 'player' && e.alive) { e.hp = 0; e.alive = false; } cb.finish(true); return ok('Combat gagné.'); }
        if (v === 'perdre') { cb.finish(false); return ok('Combat perdu.'); }
        return non('gagner ou perdre.');
      } },
    invincible: { droit: 'outils', usage: '/invincible <on|off>', aide: 'Le personnage ne perd plus de PV.',
      faire: a => { const e = lire(), v = plie(a[0]); e.outils.invincible = v === 'on' ? true : v === 'off' ? false : !e.outils.invincible; ecrire(); return ok(`Invincible : ${e.outils.invincible ? 'oui' : 'non'}.`); } },
    sauver: { droit: 'sauvegarde', usage: '/sauver', aide: 'Écrire la sauvegarde maintenant.',
      faire: () => { const c = ch(); return Save.write(c) ? ok('Sauvegardé.') : non('Sauvegarde impossible ici.'); } },
    rang: { droit: 'rangs', usage: '/rang <rang>', aide: 'Changer le rang du personnage joué.',
      faire: a => {
        const e = lire(), id = plie(a[0]), c = ch();
        const r = Object.keys(e.rangs).find(k => k === id || plie(e.rangs[k].label) === id);
        if (!r) return non('Rang inconnu.');
        if (e.rangs[r].niveau > rang(rangDe()).niveau) return non('Pas au-dessus de ton propre rang.');
        e.membres[cleMembre(c)] = r; ecrire();
        return ok(`${c.name} est ${e.rangs[r].label}.`);
      } },
  };

  function executer(id, args) {
    const c = COMMANDES[id];
    if (!c) return non(`Commande inconnue : ${id}. Tape /aide.`);
    if (!peut('open')) return non('Le Conseil est réservé au staff.');
    if (!peut(c.droit)) return non(`Ton rang ne permet pas « ${id} » (${DROIT[c.droit].label}).`);
    let r;
    try { r = c.faire((args || []).slice()); } catch (e) { r = non(`Erreur : ${e.message}`); }
    if (r && r.ok && id !== 'aide') noter(id, `${(args || []).join(' ')}${r.texte ? ` → ${r.texte}` : ''}`);
    return r || non('Rien.');
  }

  function console_(texte) {
    const t = String(texte || '').trim().replace(/^\//, '');
    if (!t) return non('');
    const parts = (t.match(/"[^"]*"|\S+/g) || []).map(x => x.replace(/^"|"$/g, ''));
    const id = plie(parts.shift());
    const alias = { give: 'donner', remove: 'retirer', heal: 'soigner', level: 'niveau', lvl: 'niveau', money: 'dragmes', help: 'aide', '?': 'aide', craft: 'fabriquer', quest: 'quete', achievement: 'succes', time: 'heure', god: 'invincible', save: 'sauver', announce: 'annonce' };
    return executer(alias[id] || id, parts);
  }

  function gererRang(id, champs) {
    if (!peut('rangs')) return non('Ton rang ne permet pas de gérer les rangs.');
    const e = lire(), moi = rang(rangDe());
    const r = e.rangs[id];
    if (r && r.niveau >= moi.niveau && rangDe() !== 'fondateur') return non('Pas un rang égal ou supérieur au tien.');
    if (champs === null) {
      if (!r || id === 'fondateur' || id === 'veilleur') return non('Ce rang ne se supprime pas.');
      delete e.rangs[id];
      for (const k of Object.keys(e.membres)) if (e.membres[k] === id) delete e.membres[k];
      ecrire(); noter('rang', `suppression de ${r.label}`);
      return ok(`${r.label} supprimé.`);
    }
    const cible = r || (e.rangs[id] = { label: id, niveau: 1, couleur: '#a3a9bd', droits: {}, desc: '' });
    if (champs.label != null) cible.label = String(champs.label).slice(0, 32) || cible.label;
    if (champs.niveau != null) cible.niveau = Math.max(0, Math.min(rangDe() === 'fondateur' ? 5 : moi.niveau - 1, Math.floor(nombre(champs.niveau, cible.niveau))));
    if (champs.couleur != null && /^#[0-9a-f]{6}$/i.test(champs.couleur)) cible.couleur = champs.couleur;
    if (champs.droit) {
      const [d, v] = champs.droit;
      if (DROIT[d]) { if (v === null) delete cible.droits[d]; else cible.droits[d] = !!v; }
    }
    ecrire(); noter('rang', `${cible.label} réglé`);
    return ok(`${cible.label} enregistré.`);
  }

  function nouveauRang() {
    const e = lire();
    let i = 1; while (e.rangs['rang' + i]) i++;
    const r = gererRang('rang' + i, { label: `Nouveau rang ${i}`, niveau: 1 });
    return r.ok ? 'rang' + i : null;
  }

  function attacher(world, hud) { ctx = { world, hud }; }

  return {
    DROITS, DROIT, COMMANDES, CLE,
    attacher, dev, rangDe, rang, rangs: () => lire().rangs, peut, executer, console: console_, journal: () => lire().journal.slice().reverse(),
    outil: k => !!lire().outils[k], gererRang, nouveauRang,
    membre: (c, idRang) => { if (!peut('rangs')) return non('Ton rang ne permet pas de gérer les rangs.'); const e = lire(); if (!e.rangs[idRang]) return non('Rang inconnu.'); e.membres[cleMembre(c)] = idRang; ecrire(); noter('rang', `${c.name || c.uid} → ${e.rangs[idRang].label}`); return ok('Rang donné.'); },
    membres: () => Object.assign({}, lire().membres),
    reinitialiser: () => { etat = null; try { localStorage.removeItem(CLE); } catch (e) {   } },
    chercher, plie, monde: () => ctx.world,
  };
})();

if (typeof Entity === 'function' && !Entity.prototype._takeDamageAdmin) {
  Entity.prototype._takeDamageAdmin = Entity.prototype.takeDamage;
  Entity.prototype.takeDamage = function (amount) {
    const w = Admin.monde(), cb = w && w.combat;
    if (cb && cb.player === this && Admin.outil('invincible') && Admin.peut('outils')) return { dealt: 0, absorbed: 0 };
    return this._takeDamageAdmin(amount);
  };
}
