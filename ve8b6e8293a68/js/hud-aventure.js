(() => {
  const esc = s => Util.esc(s);
  const normaliser = GuideAventure.normaliser;
  const ico = id => Fenetres.ICON[id] || Fenetres.ICON.carnet;
  const bouton = (act, titre, suite = '') => `<button type="button" class="vy-av__bouton" data-act="${act}" ${suite}>${titre}</button>`;
  const vide = 'Aucun résultat. Essaie une autre recherche ou élargis tes filtres.';

  Object.assign(Hud.prototype, {
    openAventure() {
      const s = this.aventure = this.aventure || { onglet: 'guide', article: 'premiers-pas', ouverts: ['debuter'], recherche: '', type: '', region: '', niveauMin: 1, niveauMax: Math.max(1, this.world.ch.level + 10), masquer: false, page: 0 };
      const rendre = () => this.fen.render('aventure');
      const naviguer = id => {
        const rubrique = GuideAventure.rubriques.find(r => r.articles.some(a => a.id === id));
        if (!rubrique) return;
        s.article = id;
        if (!s.ouverts.includes(rubrique.id)) s.ouverts.push(rubrique.id);
        s.ancre = id;
        rendre();
      };
      this.fen.open('aventure', {
        title: 'Aventure / Guide', icon: ico('carnet'), key: 'Maj + A', width: 900, cls: 'vy-aventure',
        render: () => this.renderAventure(),
        actions: {
          avTab: d => { if (!['parcours', 'suggestions', 'guide'].includes(d.tab)) return; s.onglet = d.tab; s.recherche = ''; s.page = 0; s.ancre = s.article; rendre(); },
          avRubrique: d => { s.ouverts = s.ouverts.includes(d.id) ? s.ouverts.filter(id => id !== d.id) : [...s.ouverts, d.id]; rendre(); },
          avArticle: d => naviguer(d.id),
          avOuvrir: d => { this.toggleWin(d.win); },
          avSuite: () => { s.page++; rendre(); },
          avDebut: () => { s.page = 0; rendre(); },
        },
        onField: el => {
          if (el.id === 'av-recherche') { s.recherche = el.value.slice(0, 100); s.ancre = ((GuideAventure.chercher(s.recherche)[0] || {}).articles || [])[0]?.id; }
          else if (el.id === 'av-type') s.type = el.value;
          else if (el.id === 'av-region') s.region = el.value;
          else if (el.id === 'av-min') s.niveauMin = Math.max(1, Math.min(300, Number(el.value) || 1));
          else if (el.id === 'av-max') s.niveauMax = Math.max(1, Math.min(300, Number(el.value) || 1));
          else if (el.id === 'av-masquer') s.masquer = el.checked;
          else return;
          s.page = 0; rendre();
        },
        after: body => {
          const article = body.querySelector('.vy-av__article');
          if (!article) return;
          if (s.ancre) {
            const cible = article.querySelector(`[data-section="${s.ancre}"]`);
            if (cible) article.scrollTop += cible.getBoundingClientRect().top - article.getBoundingClientRect().top;
            s.ancre = null;
          }
          article.addEventListener('scroll', () => {
            const titres = [...article.querySelectorAll('[data-section]')];
            const y = article.getBoundingClientRect().top + 45;
            const section = titres.filter(t => t.getBoundingClientRect().top <= y).pop() || titres[0];
            if (!section) return;
            s.article = section.dataset.section;
            for (const b of body.querySelectorAll('[data-act="avArticle"]')) {
              const actif = b.dataset.id === s.article;
              b.classList.toggle('on', actif);
              if (actif) b.setAttribute('aria-current', 'location'); else b.removeAttribute('aria-current');
            }
          }, { passive: true });
        },
      });
    },

    renderAventure() {
      const s = this.aventure;
      const tabs = [['parcours', 'Parcours'], ['suggestions', 'Suggestions'], ['guide', 'Guide']];
      const recherche = `<input id="av-recherche" type="search" maxlength="100" placeholder="${s.onglet === 'guide' ? 'Rechercher dans le guide' : 'Rechercher une aventure'}" aria-label="Rechercher" value="${esc(s.recherche)}">`;
      return `<nav class="vy-av__onglets" aria-label="Aventure / Guide">${tabs.map(([id, label]) => `<button type="button" data-act="avTab" data-tab="${id}" aria-pressed="${s.onglet === id}" class="vy-av__onglet${s.onglet === id ? ' on' : ''}">${label}</button>`).join('')}</nav>` +
        (s.onglet === 'guide' ? this.renderGuideAventure(recherche) : this.renderPistesAventure(recherche));
    },

    renderGuideAventure(recherche) {
      const s = this.aventure, resultats = GuideAventure.chercher(s.recherche);
      const rubrique = resultats.find(r => r.articles.some(a => a.id === s.article)) || resultats[0];
      const articles = rubrique ? rubrique.articles : [];
      const selection = articles.some(a => a.id === s.article) ? s.article : (articles[0] || {}).id;
      const sommaire = resultats.map(r => {
        const ouvert = s.recherche.trim() || s.ouverts.includes(r.id);
        return `<div class="vy-av__rubrique"><button type="button" class="vy-av__rubrique-titre" data-act="avRubrique" data-id="${r.id}" aria-expanded="${!!ouvert}">${ico(r.icone)}<span>${esc(r.titre)}</span><span>${ouvert ? '−' : '+'}</span></button>` +
          (ouvert ? `<div>${r.articles.map(a => `<button type="button" class="vy-av__ancre${a.id === selection ? ' on' : ''}" data-act="avArticle" data-id="${a.id}" ${a.id === selection ? 'aria-current="location"' : ''}>${esc(a.titre)}</button>`).join('')}</div>` : '') + '</div>';
      }).join('');
      return `<div class="vy-av__guide"><aside class="vy-av__sommaire">${recherche}<nav data-defile="av-sommaire" aria-label="Rubriques du guide">${sommaire || '<p>Aucune rubrique trouvée.</p>'}</nav></aside>` +
        `<main class="vy-av__article" data-defile="av-article" tabindex="0" aria-label="Articles du guide">${rubrique ? `<p class="vy-av__surtitre">Le livre du Veilleur · ${esc(rubrique.titre)}</p>` : ''}${articles.map(a => `<section data-section="${a.id}"><div class="vy-av__embleme" aria-hidden="true">${a.icone && Hud.pic ? Hud.pic(a.icone, 32) : ico(rubrique.icone)}</div><h3>${esc(a.titre)}</h3><p>${esc(a.texte)}</p>${a.fenetre ? bouton('avOuvrir', 'Ouvrir ' + esc(this.avNomFenetre(a.fenetre)), `data-win="${a.fenetre}"`) : ''}</section>`).join('') || `<p role="status">${vide}</p>`}</main></div>`;
    },

    avNomFenetre(id) {
      return { carac: 'les Caractéristiques', quetes: 'les Quêtes', succes: 'les Succès', sac: 'l’Inventaire', carte: 'la Carte', sorts: 'les Sorts', carnet: 'le Bestiaire', faction: 'la Faction', guilde: 'la Guilde', metiers: 'les Métiers', boutique: 'la Boutique des Voiles', garderobe: 'la Garde-robe', familiers: 'les Familiers', montures: 'les Montures', options: 'les Options' }[id] || id;
    },

    pistesAventure() {
      const ch = this.world.ch;
      const zones = (DATA.content.zones || []).filter(z => z.region !== 'ervane' || ch.origine === 'ervane');
      const regionDuPnj = id => zones.find(z => z.maps.some(m => (m.npcs || []).includes(id)));
      const succes = Achievements.defs().filter(a => Achievements.pourPerso(ch, a)).map(a => {
        const progression = Achievements.avancement(ch, a), cond = a.cond || {};
        const z = zones.find(z => z.id === cond.zone || (cond.dungeon && z.maps.some(m => m.dungeon === cond.dungeon)));
        return { id: a.id, titre: a.name, texte: a.desc || '', type: Achievements.category(a), region: z ? z.region : '', niveau: cond.level || (z && z.level ? z.level[0] : 1), fait: ch.achievements.includes(a.id), progression, detail: Achievements.progress(ch, a), win: 'succes', icone: 'succes' };
      });
      if (this.aventure.onglet === 'parcours') return succes;
      const quetes = Quests.defs().filter(q => !q.hidden && (ch.quests.active[q.id] || Quests.canStart(ch, q.id))).filter(q => regionDuPnj(q.giver)).map(q => {
        const z = regionDuPnj(q.giver), actif = !!ch.quests.active[q.id];
        return { id: q.id, titre: q.name, texte: q.desc || (actif ? 'Reprends cette quête dans ton journal.' : `Parle à ${Quests.npcName(q.giver)} pour commencer.`), type: 'Quêtes', region: z.region, niveau: q.level || 1, detail: actif ? 'En cours' : 'Disponible', win: 'quetes', icone: 'quetes' };
      });
      const exploration = zones.map(z => {
        const vus = z.maps.filter(m => ch.counters.maps.includes(m.id)).length;
        return { id: z.id, titre: z.name, texte: z.description || 'Explore les chemins de cette région.', type: 'Exploration', region: z.region, niveau: (z.level || [1])[0], fait: vus === z.maps.length, progression: [vus, z.maps.length], detail: `${vus} / ${z.maps.length} cartes découvertes`, win: 'carte', icone: 'carte' };
      }).filter(z => !z.fait);
      return [...quetes, ...exploration, ...succes.filter(a => !a.fait && a.progression && a.progression[0] > 0)].sort((a, b) => Math.abs(a.niveau - ch.level) - Math.abs(b.niveau - ch.level));
    },

    renderPistesAventure(recherche) {
      const s = this.aventure, pistes = this.pistesAventure();
      const types = [...new Set(pistes.map(p => p.type))].sort();
      const regions = [...new Set(pistes.map(p => p.region).filter(Boolean))].sort();
      const options = (liste, valeur) => liste.map(t => `<option value="${esc(t)}" ${t === valeur ? 'selected' : ''}>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</option>`).join('');
      const mots = normaliser(s.recherche).trim().split(/\s+/).filter(Boolean);
      const bas = Math.min(s.niveauMin, s.niveauMax), haut = Math.max(s.niveauMin, s.niveauMax);
      const liste = pistes.filter(p => (!s.masquer || !p.fait) && (!s.type || p.type === s.type) && (!s.region || p.region === s.region) && (s.onglet === 'parcours' || (p.niveau >= bas && p.niveau <= haut)) && mots.every(m => normaliser(p.titre + ' ' + p.texte).includes(m)));
      const taille = 12, pages = Math.max(1, Math.ceil(liste.length / taille));
      s.page = s.page % pages;
      const visibles = liste.slice(s.page * taille, (s.page + 1) * taille);
      return `<div class="vy-av__filtres">${recherche}<select id="av-type" aria-label="Type d’activité"><option value="">Toutes les activités</option>${options(types, s.type)}</select><select id="av-region" aria-label="Région"><option value="">Toutes les régions</option>${options(regions, s.region)}</select>` +
        (s.onglet === 'suggestions' ? `<label>Niveau entre <input type="number" id="av-min" min="1" max="300" value="${s.niveauMin}"></label><label>et <input type="number" id="av-max" min="1" max="300" value="${s.niveauMax}"></label>` : `<label><input type="checkbox" id="av-masquer" ${s.masquer ? 'checked' : ''}> Masquer les accomplis</label>`) + '</div>' +
        `<div class="vy-av__resultats" data-defile="av-pistes"><div class="vy-av__intro"><p class="vy-av__surtitre">${s.onglet === 'parcours' ? 'Les traces de ton aventure' : 'Une prochaine étape, à ton rythme'}</p><p>${s.onglet === 'parcours' ? 'Retrouve les objectifs de Veylan et ta progression. Leurs récompenses se récupèrent dans les Succès.' : 'Quêtes accessibles, régions à découvrir et succès commencés, selon ton personnage.'}</p></div><div class="vy-av__cartes">` + visibles.map(p => {
        const pct = p.fait ? 100 : p.progression && p.progression[1] ? Math.round(100 * p.progression[0] / p.progression[1]) : 0;
        return `<article class="vy-av__carte${p.fait ? ' accomplie' : ''}"><header><span>${esc(p.type)}</span><small>${p.fait ? 'Accompli' : 'Niv. ' + p.niveau}</small></header><div class="vy-av__sceau" aria-hidden="true">${ico(p.icone)}</div><h3>${esc(p.titre)}</h3><p>${esc(p.texte)}</p><footer><small>${esc(p.detail || '')}</small>${p.progression ? `<progress max="100" value="${Math.min(100, Math.max(0, pct))}" aria-label="Progression de ${esc(p.titre)}">${pct}%</progress>` : ''}${bouton('avOuvrir', 'Ouvrir ' + esc(this.avNomFenetre(p.win)), `data-win="${p.win}"`)}</footer></article>`;
      }).join('') + `</div>${!liste.length ? `<p role="status">${vide}</p>` : ''}</div><footer class="vy-av__pagination"><span role="status">${liste.length} résultat${liste.length > 1 ? 's' : ''} · ${s.page + 1} / ${pages}</span>${bouton('avDebut', 'Début', pages <= 1 ? 'disabled' : '')}${bouton('avSuite', 'Suivants', pages <= 1 ? 'disabled' : '')}</footer>`;
    },
  });
})();
