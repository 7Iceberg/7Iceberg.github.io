(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');
const virgule = x => String(x).replace('.', ',');
const SERIE = { molh_de_selle: ['kaldum_le_pari_de_kavra', 'kaldum_un_molh_qui_suit', 'kaldum_la_selle_de_basalte'] };

Object.assign(Hud.prototype, {
  openMontures() {
    if (typeof Montures === 'undefined') return;
    const ch = () => this.world.ch;
    const r = () => this.fen.render('montures');
    const apres = () => { this.world.emit('update'); this.world.emit('save'); };
    const horsCombat = () => { if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; } return true; };
    const actions = {
      monter: () => { if (!horsCombat()) return; this.basculerMonture(); r(); },
      part: d => { if (!horsCombat()) return; const res = Montures.choisirPart(ch(), Number(d.part)); if (!res.ok) { this.toast(res.raison); return; } apres(); r(); },
      nourrir: d => {
        if (!horsCombat()) return;
        const c = ch(), libre = Math.max(0, c.count(d.item) - Familiers.reserveQuetes(c, d.item));
        const n = d.n === 'tout' ? libre : Number(d.n) || 1;
        if (n <= 0) { this.toast('Ce qu\'il en reste sert à une quête en cours.'); return; }
        const res = Montures.nourrir(c, d.item, n);
        if (!res.ok) { this.toast(res.raison); return; }
        this.toast(`${res.monture.nom} : +${nf(res.xp)} XP${res.niveaux ? ` · niveau ${res.niveau} !` : ''}`);
        if (res.niveaux) this.chat('gain', `${res.monture.nom} passe au niveau ${res.niveau}.`);
        apres(); r();
      },
    };
    this.simpleWin('montures', 'Montures', () => this.renderMontures(), actions, { width: 620, cls: 'vy-fenetre--montures' });
  },

  basculerMonture() {
    if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; }
    const res = Montures.monter(this.world.ch);
    if (!res.ok) { this.toast(res.raison); return false; }
    this.toast(res.montee ? `Tu montes ton ${res.monture.nom}.` : `Tu descends de ton ${res.monture.nom}.`);
    this.world.emit('update'); this.world.emit('save');
    return true;
  },

  renderMontures() {
    const ch = this.world.ch, m = Montures.de(ch);
    if (!m) return this.montSans(ch);
    const d = Montures.def(ch), n = Montures.niveau(ch), xp = m.xp, max = n >= Familiers.NIVEAU_MAX;
    const maintenant = Familiers.texteBonus(Familiers.bonusA(d, n)), auMax = Familiers.texteBonus(Familiers.bonusA(d, Familiers.NIVEAU_MAX));
    const jauge = max ? `<div class="vy-fam__xp"><span>Niveau maximum</span><b>${nf(xp)} XP</b></div>`
      : `<div class="vy-fam__xp"><span>Expérience</span><b>${nf(xp - Familiers.CUMUL[n])} / ${nf(Familiers.PALIERS[n])}</b><span class="vy-fam__jauge vy-fam__jauge--grande"><i style="width:${Math.round(100 * Familiers.progression(xp))}%"></i></span></div>`;
    const parts = Montures.PARTS.map(p => `<button class="vy-bouton vy-bouton--petit${m.part === p ? ' vy-bouton--primaire' : ''}" data-act="part" data-part="${p}" aria-pressed="${m.part === p}">${p} %</button>`).join('');
    let repas = '';
    if (!max) {
      const ms = this.famMangeables(ch);
      const lignes = ms.map(r => `<li data-rarete="${r.rarete}"><span class="vy-fam__res">${esc(r.nom)} <small>×${nf(r.n)}${r.reserve ? ` · ${nf(Math.min(r.n, r.reserve))} pour une quête` : ''}</small></span><small class="vy-fam__par">+${nf(r.xp)} XP</small>
        <span class="vy-fam__donner"><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${r.id}" data-n="1" aria-label="Donner 1 ${esc(r.nom)}">1</button><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${r.id}" data-n="10" ${r.n >= 2 ? '' : 'disabled'} aria-label="Donner 10 ${esc(r.nom)}">10</button><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${r.id}" data-n="tout" ${r.libre > 0 ? '' : 'disabled'} aria-label="Donner tout : ${esc(r.nom)}">Tout</button></span></li>`).join('');
      repas = `<div class="vy-fam__repas"><h4>Le nourrir <small>une ressource vaut son prix de revente en XP</small></h4>${ms.length ? `<ul class="vy-fam__ressources" data-defile="montures">${lignes}</ul>` : '<p class="vy-fam__vide">Aucune ressource dans ton sac.</p>'}</div>`;
    }
    return `<div class="vy-mont">
      <header class="vy-fam__tete">${Hud.pictoFamilier(d, 56)}<div><b>${esc(d.nom)}</b><small>Niveau ${n} / ${Familiers.NIVEAU_MAX} · ${m.montee ? 'tu le montes' : 'à pied'}</small></div></header>
      <p class="vy-fam__desc">${esc(d.description || '')}</p>
      <div class="vy-fam__bonus"><span>Monté</span><b>${esc(maintenant)} · marche × ${virgule(d.vitesse)}</b>${max ? '' : `<small>${esc(auMax)} au niveau 10</small>`}</div>
      ${jauge}
      <div class="vy-fam__actions">${m.montee ? '<button class="vy-bouton vy-bouton--petit" data-act="monter">Descendre</button>' : '<button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="monter">Monter</button>'}</div>
      ${max ? '' : `<div class="vy-mont__part"><h4>Part de ton XP en combat <small>quand tu le montes : 10 XP font 1 XP de monture</small></h4><div class="vy-mont__parts" role="group" aria-label="Part de l'expérience">${parts}</div></div>`}
      ${repas}
      ${this.montFamilles()}
    </div>`;
  },

  montFamilles() {
    const T = Montures.types(), R = Montures.robes();
    if (!T.length) return '';
    const txt = b => Familiers.texteBonus(Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'pa' && k !== 'pm'))) + (b.pa ? ', +1 PA' : '') + (b.pm ? ', +1 PM' : '');
    const fam = T.map(t => {
      const rs = R.filter(r => r.type === t.id);
      const items = rs.map(r => `<li${r.existe ? ' class="ok"' : ''}><span>${esc(r.nom)}</span><small>${esc(txt(r.bonus))}${r.existe ? ' · déjà là' : ''}</small></li>`).join('');
      return `<details class="vy-mont__famille"><summary><b>${esc(t.nom.charAt(0).toUpperCase() + t.nom.slice(1))}</b> <small>${rs.length} robes · garanti au niveau 10 : ${esc(txt(t.garanti))}</small></summary><ul class="vy-fam__echange">${items}</ul></details>`;
    }).join('');
    return `<div class="vy-mont__familles"><h4>Les familles de montures <small>les robes à venir</small></h4>${fam}</div>`;
  },

  montSans(ch) {
    const d = Montures.liste()[0];
    if (!d) return '<p class="vy-fam__vide">Aucune monture.</p>';
    const serie = (SERIE[d.id] || []).map(id => {
      const q = Quests.get(id);
      if (!q) return '';
      const fait = ch.quests.done.includes(id), enCours = !!ch.quests.active[id];
      return `<li class="${fait ? 'ok' : ''}"><span>${esc(q.name)} <small>niveau ${q.level}</small></span><b>${fait ? 'faite' : enCours ? 'en cours' : 'à faire'}</b></li>`;
    }).join('');
    return `<div class="vy-mont">
      <header class="vy-fam__tete">${Hud.pictoFamilier(d, 56)}<div><b>Pas encore de monture</b><small>une par personnage</small></div></header>
      <p class="vy-fam__desc">Une monture fait aller plus vite sur la carte et, quand tu la montes, donne son bonus, bien plus fort que celui d'un familier. Elle grandit en combattant avec toi (une part de ton expérience) ou en mangeant des ressources.</p>
      <div class="vy-fam__obtenir"><h4>${esc(d.nom)}</h4><p>${esc(d.description || '')}</p>
        <p>Kavra, la mineuse de la Halle des Mineurs de Kaldum, l'apprivoise avec toi :</p><ul class="vy-fam__echange">${serie}</ul></div>
      ${this.montFamilles()}
    </div>`;
  },
});
})();
