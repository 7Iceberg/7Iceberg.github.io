(() => {
const esc = s => Util.esc(s);
const nf = n => Number(n || 0).toLocaleString('fr-FR');

Hud.pictoFamilier = (f, taille) => `<span class="vy-fam__picto" style="--c:${/^#[0-9a-f]{6}$/i.test(f.couleur || '') ? f.couleur : '#ddaa72'};--t:${taille || 40}px" aria-hidden="true">${esc(f.glyphe || f.nom.charAt(0))}</span>`;

Object.assign(Hud.prototype, {
  openFamiliers() {
    if (typeof Familiers === 'undefined') return;
    const ch = () => this.world.ch;
    if (!this.famEtat) this.famEtat = { choix: null };
    const s = this.famEtat;
    if (!s.choix || !Familiers.get(s.choix)) s.choix = ch().familier || (Familiers.liste()[0] || {}).id || null;
    const r = () => this.fen.render('familiers');
    const apres = () => { this.world.emit('update'); this.world.emit('save'); };
    const horsCombat = () => { if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; } return true; };
    const actions = {
      choisir: d => { s.choix = d.id; r(); },
      emmener: d => { if (!horsCombat()) return; const res = Familiers.emmener(ch(), d.id); if (!res.ok) { this.toast(res.raison); return; } this.toast(`${res.familier.nom} te suit.`); apres(); r(); },
      laisser: () => { if (!horsCombat()) return; Familiers.emmener(ch(), null); apres(); r(); },
      echanger: d => {
        if (!horsCombat()) return;
        const res = Familiers.echanger(ch(), d.id);
        if (!res.ok) { this.toast(res.raison); return; }
        this.toast(`${res.familier.nom} te rejoint.`);
        this.chat('gain', `Tu as adopté un ${res.familier.nom}.`);
        apres(); r();
      },
      nourrir: d => {
        if (!horsCombat()) return;
        const c = ch(), libre = Math.max(0, c.count(d.item) - Familiers.reserveQuetes(c, d.item));
        const n = d.n === 'tout' ? libre : Number(d.n) || 1;
        if (n <= 0) { this.toast('Ce qu\'il en reste sert à une quête en cours.'); return; }
        const res = Familiers.nourrir(c, s.choix, d.item, n);
        if (!res.ok) { this.toast(res.raison); return; }
        this.famApresRepas(res);
        apres(); r();
      },
      nourrirCommunes: () => {
        if (!horsCombat()) return;
        const c = ch();
        let mange = 0, xp = 0, niveaux = 0, dernier = null;
        for (const it of this.famMangeables(c).filter(x => x.rarete === 'commun' && x.libre > 0)) {
          const res = Familiers.nourrir(c, s.choix, it.id, it.libre);
          if (!res.ok) break;
          mange += res.mange; xp += res.xp; niveaux += res.niveaux; dernier = res;
        }
        if (!dernier) { this.toast('Aucune ressource commune à donner.'); return; }
        this.famApresRepas({ familier: dernier.familier, mange, xp, niveau: dernier.niveau, niveaux });
        apres(); r();
      },
    };
    this.simpleWin('familiers', 'Familiers', () => this.renderFamiliers(), actions, { width: 720, cls: 'vy-fenetre--familiers' });
  },

  famApresRepas(res) {
    this.toast(`${res.familier.nom} : +${nf(res.xp)} XP${res.niveaux ? ` · niveau ${res.niveau} !` : ''}`);
    if (res.niveaux) this.chat('gain', `${res.familier.nom} passe au niveau ${res.niveau}.`);
  },

  famMangeables(ch) {
    const ordre = Items.RARITIES;
    return Object.keys(ch.inventory).filter(id => Familiers.mangeable(id)).map(id => {
      const d = Items.get(id), reserve = Familiers.reserveQuetes(ch, id);
      return { id, nom: d.name, n: ch.count(id), xp: Familiers.xpRessource(id), reserve, libre: Math.max(0, ch.count(id) - reserve), rarete: Items.rarity(d) };
    }).sort((a, b) => ordre.indexOf(a.rarete) - ordre.indexOf(b.rarete) || b.xp - a.xp || a.nom.localeCompare(b.nom, 'fr'));
  },

  renderFamiliers() {
    const ch = this.world.ch, s = this.famEtat;
    const tous = Familiers.liste().slice().sort((a, b) => (Familiers.possede(ch, b.id) - Familiers.possede(ch, a.id)));
    const liste = tous.map(f => {
      const a = Familiers.possede(ch, f.id), n = Familiers.niveauDe(ch, f.id), xp = a ? ch.familiers[f.id].xp : 0;
      const sous = a ? `Niveau ${n}${f.id === ch.familier ? ' · te suit' : ''}` : 'À obtenir';
      return `<li><button class="vy-fam__carte${s.choix === f.id ? ' on' : ''}${a ? '' : ' absent'}" data-act="choisir" data-id="${f.id}" aria-pressed="${s.choix === f.id}">
        ${Hud.pictoFamilier(f, 36)}<span class="vy-fam__carte-nom"><b>${esc(f.nom)}</b><small>${sous}</small>
        ${a ? `<span class="vy-fam__jauge" role="img" aria-label="${Math.round(100 * xp / Familiers.XP_MAX)} %"><i style="width:${Math.round(100 * xp / Familiers.XP_MAX)}%"></i></span>` : ''}</span></button></li>`;
    }).join('');
    const f = Familiers.get(s.choix);
    const fiche = f ? this.famFiche(ch, f) : '<p class="vy-fam__vide">Aucun familier.</p>';
    const nb = tous.filter(x => Familiers.possede(ch, x.id)).length;
    return `<div class="vy-fam">
      <section class="vy-fam__col"><h3 class="vy-fam__titre">Tes familiers <small>${nb} / ${tous.length}</small></h3><ul class="vy-fam__liste">${liste}</ul>
        <p class="vy-fam__aide">Un familier suit le personnage et lui donne un bonus, dès l'éclosion. Il grandit en mangeant des ressources, et un peu à chaque victoire dans sa région. Dix niveaux ; il ne meurt pas et n'a pas d'heure de repas.</p></section>
      <section class="vy-fam__fiche">${fiche}</section>
    </div>`;
  },

  famFiche(ch, f) {
    const a = Familiers.possede(ch, f.id), n = Familiers.niveauDe(ch, f.id);
    const xp = a ? ch.familiers[f.id].xp : 0, max = n >= Familiers.NIVEAU_MAX;
    const zone = (DATA.content.zones || []).find(z => z.region === f.region);
    const region = { orsane: 'Orsane', kaldum: 'Kaldum', ervane: 'Ervane' }[f.region] || (zone ? zone.name : f.region);
    const maintenant = Familiers.texteBonus(Familiers.bonusA(f, a ? n : 0)), auMax = Familiers.texteBonus(Familiers.bonusA(f, Familiers.NIVEAU_MAX));
    const tete = `<header class="vy-fam__tete">${Hud.pictoFamilier(f, 52)}<div><b>${esc(f.nom)}</b><small>${a ? `Niveau ${n} / ${Familiers.NIVEAU_MAX}` : 'Pas encore à toi'} · grandit en combattant à ${esc(region)}</small></div></header>
      <p class="vy-fam__desc">${esc(f.description || '')}</p>
      <div class="vy-fam__bonus"><span>Bonus</span><b>${a ? esc(maintenant) : esc(auMax) + ' au niveau 10'}</b>${a && !max ? `<small>${esc(auMax)} au niveau 10</small>` : ''}</div>`;
    if (!a) {
      const besoins = Familiers.besoinsEchange(ch, f);
      const ok = Familiers.peutEchanger(ch, f.id).ok;
      const lignes = besoins.map(b => `<li class="${b.a >= b.n ? 'ok' : ''}"><span>${esc((Items.get(b.id) || {}).name || b.id)}</span><b>${nf(Math.min(b.a, b.n))} / ${nf(b.n)}</b></li>`).join('');
      return `${tete}<div class="vy-fam__obtenir"><h4>L'obtenir</h4><p>${esc(Familiers.texteObtention(f))}. Utilise l'œuf depuis le sac pour le faire éclore.</p>
        ${besoins.length ? `<p>Ou l'adopter contre des ressources de sa famille :</p><ul class="vy-fam__echange">${lignes}</ul>
        <button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="echanger" data-id="${f.id}" ${ok ? '' : 'disabled'}>Adopter</button>` : ''}</div>`;
    }
    const suit = ch.familier === f.id;
    const jauge = max ? `<div class="vy-fam__xp"><span>Niveau maximum</span><b>${nf(xp)} XP</b></div>`
      : `<div class="vy-fam__xp"><span>Expérience</span><b>${nf(xp - Familiers.CUMUL[n])} / ${nf(Familiers.PALIERS[n])}</b><span class="vy-fam__jauge vy-fam__jauge--grande"><i style="width:${Math.round(100 * Familiers.progression(xp))}%"></i></span></div>`;
    const bouton = suit ? '<button class="vy-bouton vy-bouton--petit" data-act="laisser">Le laisser</button>' : `<button class="vy-bouton vy-bouton--primaire vy-bouton--petit" data-act="emmener" data-id="${f.id}">L'emmener</button>`;
    let repas = '';
    if (!max) {
      const ms = this.famMangeables(ch);
      const lignes = ms.map(m => `<li data-rarete="${m.rarete}"><span class="vy-fam__res">${esc(m.nom)} <small>×${nf(m.n)}${m.reserve ? ` · ${nf(Math.min(m.n, m.reserve))} pour une quête` : ''}</small></span><small class="vy-fam__par">+${nf(m.xp)} XP</small>
        <span class="vy-fam__donner"><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${m.id}" data-n="1" aria-label="Donner 1 ${esc(m.nom)}">1</button><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${m.id}" data-n="10" ${m.n >= 2 ? '' : 'disabled'} aria-label="Donner 10 ${esc(m.nom)}">10</button><button class="vy-bouton vy-bouton--petit" data-act="nourrir" data-item="${m.id}" data-n="tout" ${m.libre > 0 ? '' : 'disabled'} aria-label="Donner tout : ${esc(m.nom)}">Tout</button></span></li>`).join('');
      const communes = ms.some(m => m.rarete === 'commun' && m.libre > 0);
      repas = `<div class="vy-fam__repas"><h4>Le nourrir <small>une ressource vaut son prix de revente en XP</small></h4>
        ${ms.length ? `<ul class="vy-fam__ressources" data-defile="familiers">${lignes}</ul><button class="vy-bouton vy-bouton--petit" data-act="nourrirCommunes" ${communes ? '' : 'disabled'}>Donner les ressources communes</button>` : '<p class="vy-fam__vide">Aucune ressource dans ton sac.</p>'}</div>`;
    }
    return `${tete}${jauge}<div class="vy-fam__actions">${bouton}</div>${repas}`;
  },
});
})();
