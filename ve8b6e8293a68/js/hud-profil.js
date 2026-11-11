(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const PRIVE = [['equipement', 'Mon équipement'], ['succes', 'Mes succès'], ['chiffres', 'Mes chiffres (combats, quêtes, temps de jeu)']];
const SLOTS = [['coiffe', 'Coiffe'], ['cape', 'Cape'], ['amulette', 'Amulette'], ['anneau1', 'Anneau'], ['anneau2', 'Anneau'], ['ceinture', 'Ceinture'], ['bottes', 'Bottes'], ['arme', 'Arme']];

const duree = s => { const m = Math.floor((s || 0) / 60), h = Math.floor(m / 60); return h ? `${h} h ${String(m % 60).padStart(2, '0')}` : `${m} min`; };
const chiffres = c => {
  const k = c.counters || {};
  return {
    niveau: c.level, succes: (c.achievements || []).length, score: typeof Achievements === 'object' && Achievements.score ? Achievements.score(c) : 0,
    quetes: ((c.quests || {}).done || []).length, victoires: k.wins || 0, combats: k.fights || 0, donjons: (k.dungeons || []).length,
    cartes: (k.maps || []).length, temps: c.playTime || 0,
  };
};

Object.assign(Hud.prototype, {
  profilReglages(ch) {
    if (!ch.profil || typeof ch.profil !== 'object') ch.profil = { equipement: true, succes: true, chiffres: true };
    return ch.profil;
  },

  portraitProfil(ch) {
    const painter = this.renderer && (this.renderer.painter || this.renderer);
    const cls = ch.classDef, ap = ch.lookAffiche ? ch.lookAffiche() : { look: ch.look };
    const W = 150, H = 170, k = 2, cle = JSON.stringify([ch.classId, ch.gender, ap]);
    if (this._portraitProfil && this._portraitProfil.cle === cle) return this._portraitProfil.url;
    const cv = document.createElement('canvas'); cv.width = W * k; cv.height = H * k;
    const c = cv.getContext('2d'); c.scale(k, k);
    const sol = H - 18, S = Math.min(W / 60, (sol - 8) / 66);
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(W / 2, sol, 22 * S, 5 * S, 0, 0, Math.PI * 2); c.fill();
    if (painter && typeof painter.drawBody === 'function') {
      c.save(); c.translate(W / 2, sol); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
      try { painter.drawBody(c, { x: 0, y: 0 }, { shape: 'player', color: cls.color, glyph: cls.glyph, team: 'player', look: ap.look, auraCos: ap.auraCos, gender: ch.gender, facing: 'se' }); } catch (e) {   }
      c.restore();
    }
    let url = '';
    try { url = cv.toDataURL('image/png'); } catch (e) { url = ''; }
    this._portraitProfil = { cle, url };
    return url;
  },

  openProfil() {
    const s = this.profilEtat = this.profilEtat || { compare: '' };
    const r = () => this.fen.render('profil');
    const actions = {
      prive: d => { const p = this.profilReglages(this.world.ch); p[d.cle] = !p[d.cle]; this.world.emit('save'); r(); },
      sac: () => { if (!this.fen.isOpen('sac')) this.toggleWin('sac'); },
      succes: () => { if (!this.fen.isOpen('succes')) this.toggleWin('succes'); },
    };
    const onField = (el, kind) => { if (el.id === 'profil-compare' && kind === 'change') { s.compare = el.value; r(); } };
    this.simpleWin('profil', 'Profil', () => this.renderProfil(), actions, { width: 760, cls: 'vy-fenetre--profil', onField });
  },

  renderProfil() {
    const ch = this.world.ch, cls = ch.classDef, s = this.profilEtat, p = this.profilReglages(ch), n = chiffres(ch);
    let faction = '';
    try { if (typeof Factions === 'object' && Factions.isSworn(ch)) { const f = Factions.def(ch.faction.id); faction = f ? f.name : ''; } } catch (e) { faction = ''; }
    const img = this.portraitProfil(ch);
    const tuile = (k, v, sous) => `<div class="vy-profil__tuile"><small>${k}</small><b>${v}</b>${sous ? `<em>${sous}</em>` : ''}</div>`;
    const equipe = SLOTS.map(([slot, nom]) => { const id = ch.equipment[slot], it = id && Items.get(id);
      return `<div class="vy-profil__piece">${it ? `<span class="vy-case" data-rarete="${Items.rarity(it)}"><span class="vy-case__icone">${Hud.picto(it)}</span></span>` : '<span class="vy-case vy-case--emplacement"></span>'}<span><small>${nom}</small><b>${it ? esc(it.name) : '-'}</b></span></div>`; }).join('');
    const autres = (typeof Save === 'object' ? Save.list() : []).filter(x => x.uid !== ch.uid);
    let compare = '';
    if (s.compare) {
      const o = typeof Save === 'object' ? Save.read(s.compare) : null;
      if (o) {
        const m = chiffres(o);
        const ligne = (k, a, b, f) => { const fa = f ? f(a) : nf(a), fb = f ? f(b) : nf(b); return `<div class="vy-profil__cmp"><span class="${a > b ? 'plus' : ''}">${fa}</span><small>${k}</small><span class="${b > a ? 'plus' : ''}">${fb}</span></div>`; };
        compare = `<div class="vy-profil__compare"><div class="vy-profil__cmp tete"><b>${esc(ch.name)}</b><small></small><b>${esc(o.name)}</b></div>
          ${ligne('Niveau', n.niveau, m.niveau)}${ligne('Succès', n.succes, m.succes)}${ligne('Points de succès', n.score, m.score)}${ligne('Quêtes', n.quetes, m.quetes)}${ligne('Victoires', n.victoires, m.victoires)}${ligne('Donjons', n.donjons, m.donjons)}${ligne('Cartes explorées', n.cartes, m.cartes)}${ligne('Temps de jeu', n.temps, m.temps, duree)}</div>`;
      }
    }
    return `<div class="vy-profil">
      <header class="vy-profil__banniere" style="--c:${cls.color}">
        ${img ? `<img class="vy-profil__portrait" src="${img}" alt="" draggable="false">` : ''}
        <div class="vy-profil__id"><small>${esc(cls.name)}${faction ? ` · ${esc(faction)}` : ''}</small><h3>${esc(ch.name)}</h3>${ch.title ? `<em>« ${esc(ch.title)} »</em>` : ''}<span class="vy-profil__niv">Niveau ${ch.level}</span></div>
      </header>
      <div class="vy-profil__corps">
        <section><h4>En chiffres</h4><div class="vy-profil__tuiles">
          ${tuile('Succès', nf(n.succes), `${nf(n.score)} points`)}${tuile('Quêtes', nf(n.quetes), 'terminées')}${tuile('Victoires', nf(n.victoires), `sur ${nf(n.combats)} combats`)}
          ${tuile('Donjons', nf(n.donjons), 'terminés')}${tuile('Exploration', nf(n.cartes), 'cartes')}${tuile('Temps de jeu', duree(n.temps))}
        </div></section>
        <section><h4>Équipement <button type="button" class="vy-profil__lien" data-act="sac">Inventaire</button></h4><div class="vy-profil__pieces">${equipe}</div></section>
        <section><h4>Comparer</h4>${autres.length ? `<label class="vy-profil__choix"><span>Avec</span><select id="profil-compare" aria-label="Comparer avec"><option value="">un autre de mes personnages…</option>${autres.map(x => `<option value="${esc(x.uid)}"${s.compare === x.uid ? ' selected' : ''}>${esc(x.name)} · niveau ${x.level}</option>`).join('')}</select></label>${compare}` : '<p class="vy-profil__note">Un seul personnage sur cet appareil : rien à comparer pour l\'instant.</p>'}</section>
        <section><h4>Confidentialité</h4><p class="vy-profil__note">Ce que les autres joueurs verront de ton profil, quand Veylan aura d'autres joueurs.</p>
          ${PRIVE.map(([k, l]) => `<label class="vy-coche vy-profil__prive"><input type="checkbox" data-act="prive" data-cle="${k}" ${p[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}</section>
      </div></div>`;
  },
});
})();
