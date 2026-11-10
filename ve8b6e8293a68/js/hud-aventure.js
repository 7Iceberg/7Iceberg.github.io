(() => {
  const esc = s => Util.esc(s);
  const normaliser = GuideAventure.normaliser;
  const ico = id => Fenetres.ICON[id] || Fenetres.ICON.carnet;
  const bouton = (act, titre, suite = '') => `<button type="button" class="vy-av__bouton" data-act="${act}" ${suite}>${titre}</button>`;
  const vide = 'Aucun résultat. Essaie une autre recherche ou élargis tes filtres.';

  Object.assign(Hud.prototype, {
    openAventure() {
      const s = this.aventure = this.aventure || { onglet: 'guide', article: 'premiers-pas', ouverts: ['debuter'], recherche: '', type: '', region: '', niveauMin: 1, niveauMax: Math.max(1, this.world.ch.level + 10), masquer: false, page: 0 };
      if (!s.historique) { s.historique = [s.article]; s.position = 0; }
      if (!s.signets) {
        try { const lus = JSON.parse(localStorage.getItem('veylan.guide.signets') || '[]'); s.signets = Array.isArray(lus) ? [...new Set(lus.filter(id => typeof id === 'string' && GuideAventure.trouver(id)))].slice(0, 24) : []; } catch (e) { s.signets = []; }
      }
      const rendre = () => { s.version = (s.version || 0) + 1; this.fen.render('aventure'); };
      const naviguer = (id, historique = true) => {
        const chemin = GuideAventure.chemin(id);
        if (!chemin.length) return;
        if (historique && s.historique[s.position] !== id) { s.historique = s.historique.slice(0, s.position + 1).concat(id).slice(-50); s.position = s.historique.length - 1; }
        s.article = id; s.resultatChoisi = true; s.favoris = false; s.focaliser = true;
        s.ouverts = [...new Set([...s.ouverts, ...chemin])];
        s.ancre = id;
        rendre();
      };
      this.fen.open('aventure', {
        title: 'Aventure / Guide', icon: ico('carnet'), key: 'Maj + A', width: 900, cls: 'vy-aventure',
        render: () => this.renderAventure(),
        revision: () => s.onglet === 'guide' ? [s.version || 0, this.world.ch.level, this.world.ch.statPoints, this.world.ch.classId].join('|') : undefined,
        actions: {
          avTab: d => { if (!['parcours', 'suggestions', 'guide'].includes(d.tab)) return; s.onglet = d.tab; s.recherche = ''; s.page = 0; s.ancre = s.article; rendre(); },
          avRubrique: d => { s.ouverts = s.ouverts.includes(d.id) ? s.ouverts.filter(id => id !== d.id) : [...s.ouverts, d.id]; rendre(); },
          avArticle: d => naviguer(d.id),
          avHistorique: d => { const i = s.position + Number(d.pas); if (i < 0 || i >= s.historique.length) return; s.position = i; s.recherche = ''; naviguer(s.historique[i], false); },
          avSommaire: () => { s.sansSommaire = !s.sansSommaire; rendre(); },
          avVerrou: d => { const v = new Set(s.verrous || []); if (v.has(d.id)) v.delete(d.id); else { if (v.size >= 5) { this.toast('Garde une place pour découvrir : cinq suggestions verrouillées au plus.'); return; } v.add(d.id); } s.verrous = [...v]; rendre(); },
          avAutre: d => { s.ecartees = [...(s.ecartees || []), d.id]; rendre(); },
          avLiberer: () => { s.verrous = []; s.page = 0; rendre(); },
          avRecommencer: () => { s.ecartees = []; s.page = 0; rendre(); },
          avMaClasse: () => { s.recherche = ''; naviguer('classe-' + this.world.ch.classId + '-presentation'); },
          avConseil: () => { s.recherche = ''; naviguer(this.world.ch.statPoints > 0 ? 'repartition' : 'placement'); },
          avFavoris: () => { s.favoris = !s.favoris; s.recherche = ''; rendre(); },
          avResultats: () => { s.resultatChoisi = false; rendre(); },
          avFavori: () => {
            if (!GuideAventure.trouver(s.article)) return;
            if (s.signets.includes(s.article)) s.signets = s.signets.filter(id => id !== s.article);
            else { if (s.signets.length >= 24) { this.toast('Tu as déjà 24 repères : retire un favori avant d’en ajouter.'); return; } s.signets.push(s.article); }
            try { localStorage.setItem('veylan.guide.signets', JSON.stringify(s.signets)); } catch (e) {   }
            rendre();
          },
          avTourner: () => { s.vertical = !s.vertical; rendre(); },
          avOuvrir: d => { this.toggleWin(d.win); },
          avSuite: () => { s.page++; rendre(); },
          avDebut: () => { s.page = 0; rendre(); },
        },
        onField: el => {
          if (el.id === 'av-recherche') { s.recherche = el.value.slice(0, 100); s.resultatChoisi = false; s.favoris = false; s.ancre = s.recherche.trim() ? null : s.article; }
          else if (el.id === 'av-type') s.type = el.value;
          else if (el.id === 'av-region') s.region = el.value;
          else if (el.id === 'av-min') s.niveauMin = Math.max(1, Math.min(300, Number(el.value) || 1));
          else if (el.id === 'av-max') s.niveauMax = Math.max(1, Math.min(300, Number(el.value) || 1));
          else if (el.id === 'av-masquer') s.masquer = el.checked;
          else return;
          s.page = 0; s.ecartees = []; rendre();
        },
        after: body => {
          const article = body.querySelector('.vy-av__article');
          if (!article) return;
          if (s.ancre) {
            const cible = article.querySelector(`[data-section="${s.ancre}"]`);
            if (cible) {
              article.scrollTop += cible.getBoundingClientRect().top - article.getBoundingClientRect().top;
              if (s.focaliser) { const titre = cible.querySelector('h3'); titre.tabIndex = -1; titre.focus({ preventScroll: true }); }
            }
            s.focaliser = false;
            const repere = body.querySelector(`.vy-av__ancre[data-id="${s.ancre}"]`);
            const nav = body.querySelector('.vy-av__sommaire nav');
            if (repere && nav) {
              const r = repere.getBoundingClientRect(), n = nav.getBoundingClientRect();
              if (r.top < n.top || r.bottom > n.bottom) nav.scrollTop += r.top - n.top - 20;
            }
            s.ancre = null;
          }
          if (typeof AccueilArt === 'object' && AccueilArt.painter) for (const toile of article.querySelectorAll('[data-av-portrait]')) {
            const id = toile.dataset.avPortrait;
            const look = typeof Accueil === 'function' && Accueil.apparenceDeClasse ? Accueil.apparenceDeClasse(id, 'f') : Character.defaultLook(id);
            AccueilArt.buste(toile, AccueilArt.figure(id, { look, gender: 'f' }), { peint: true });
          }
          for (const detail of article.querySelectorAll('[data-guide-sort]')) detail.addEventListener('toggle', () => {
            if (!detail.isConnected) return;
            const ouverts = new Set(s.sortsOuverts || []);
            if (detail.open) ouverts.add(detail.dataset.guideSort); else ouverts.delete(detail.dataset.guideSort);
            s.sortsOuverts = [...ouverts];
            if (detail.open && !detail.querySelector('.vy-av__sort')) detail.insertAdjacentHTML('beforeend', this.avPaireSorts(detail.dataset.guideClasse, detail.dataset.guideSort));
          });
          article.addEventListener('scroll', () => {
            const titres = [...article.querySelectorAll('[data-section]')];
            const y = article.getBoundingClientRect().top + 45;
            const section = titres.filter(t => t.getBoundingClientRect().top <= y).pop() || titres[0];
            if (!section) return;
            s.article = section.dataset.section;
            const repere = body.querySelector('[data-act="avFavori"]');
            if (repere) { repere.setAttribute('aria-pressed', String(s.signets.includes(s.article))); repere.textContent = s.signets.includes(s.article) ? '★ En favori' : '☆ Garder'; }
            const fil = body.querySelector('.vy-av__fil');
            const entree = GuideAventure.index().find(e => e.article.id === s.article);
            if (fil && entree) fil.textContent = entree.parents.map(p => p.titre).join(' › ') + ' › ' + entree.article.titre;
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
      const rubrique = GuideAventure.branche(s.article, resultats) || GuideAventure.noeuds(resultats).find(r => r.articles.length);
      const articles = rubrique ? rubrique.articles : [];
      const selection = articles.some(a => a.id === s.article) ? s.article : (articles[0] || {}).id;
      const sommaire = (liste, profondeur = 0) => liste.map(r => {
        const ouvert = !!s.recherche.trim() || s.ouverts.includes(r.id);
        return `<div class="vy-av__rubrique" style="--niveau:${profondeur}"><button type="button" class="vy-av__rubrique-titre" data-act="avRubrique" data-id="${r.id}" aria-expanded="${ouvert}">${ico(r.icone)}<span>${esc(r.titre)}</span><span>${ouvert ? '−' : '+'}</span></button>` +
          (ouvert ? `<div>${r.articles.map(a => `<button type="button" class="vy-av__ancre${a.id === selection ? ' on' : ''}" data-act="avArticle" data-id="${a.id}" ${a.id === selection ? 'aria-current="location"' : ''}>${esc(a.titre)}</button>`).join('')}${sommaire(r.id === 'classes' ? [...(r.enfants || [])].sort((a, b) => Number(b.id === 'classe-' + this.world.ch.classId) - Number(a.id === 'classe-' + this.world.ch.classId)) : (r.enfants || []), profondeur + 1)}</div>` : '') + '</div>';
      }).join('');
      const rechercheActive = !!s.recherche.trim() && !s.resultatChoisi;
      const dansFavoris = s.signets.includes(selection);
      const historique = bouton('avHistorique', '←', `data-pas="-1" aria-label="Lecture précédente" ${s.position <= 0 ? 'disabled' : ''}`) + bouton('avHistorique', '→', `data-pas="1" aria-label="Lecture suivante" ${s.position >= s.historique.length - 1 ? 'disabled' : ''}`);
      const outils = `<div class="vy-av__outils">${bouton('avSommaire', s.sansSommaire ? 'Sommaire / Recherche' : 'Lire en grand', `aria-pressed="${!!s.sansSommaire}"`)}${historique}${bouton('avMaClasse', 'Ma classe')}${bouton('avConseil', this.world.ch.statPoints > 0 ? this.world.ch.statPoints + ' points à répartir' : 'Conseils de combat')}${bouton('avFavoris', 'Favoris (' + s.signets.length + ')', `aria-pressed="${!!s.favoris}"`)}${!rechercheActive && !s.favoris && selection ? bouton('avFavori', dansFavoris ? '★ En favori' : '☆ Garder', `aria-pressed="${dansFavoris}"`) : ''}</div>`;
      const contenu = rechercheActive || s.favoris ? this.avResultatsGuide() :
        `${s.recherche.trim() ? bouton('avResultats', '← Tous les résultats') : ''}<p class="vy-av__fil">${esc((GuideAventure.index().find(e => e.article.id === selection)?.parents || []).map(p => p.titre).join(' › '))}</p>` +
        articles.map(a => `<section data-section="${a.id}">${a.statut ? `<span class="vy-av__statut">${esc(a.statut)}</span>` : ''}<div class="vy-av__embleme" aria-hidden="true">${a.icone && Hud.pic ? Hud.pic(a.icone, 32) : ico(rubrique.icone)}</div><h3>${esc(a.titre)}</h3>${this.avPresentationClasse(a)}<p>${esc(a.texte)}</p>${a.schema ? this.avSchemaZone(a.schema) : ''}${a.sortsClasse ? this.avRepertoireSorts(a.sortsClasse) : ''}${a.fenetre ? bouton('avOuvrir', 'Ouvrir ' + esc(this.avNomFenetre(a.fenetre)), `data-win="${a.fenetre}"`) : ''}</section>`).join('');
      return outils + `<div class="vy-av__guide${s.sansSommaire ? ' vy-av__guide--lecture' : ''}"><aside class="vy-av__sommaire">${recherche}<nav data-defile="av-sommaire" aria-label="Rubriques du guide">${sommaire(resultats) || '<p>Aucune rubrique trouvée.</p>'}</nav></aside>` +
        `<main class="vy-av__article" data-defile="av-article" tabindex="0" aria-label="Articles du guide">${contenu || `<p role="status">${vide}</p>`}</main></div>`;
    },

    avResultatsGuide() {
      const s = this.aventure;
      const liste = s.favoris ? GuideAventure.index().filter(e => s.signets.includes(e.article.id)) : GuideAventure.resultats(s.recherche);
      const surligner = texte => {
        const terme = normaliser(s.recherche).trim().split(/\s+/).filter(Boolean)[0];
        const i = terme ? normaliser(texte).indexOf(terme) : -1;
        return i < 0 ? esc(texte) : esc(texte.slice(0, i)) + '<mark>' + esc(texte.slice(i, i + terme.length)) + '</mark>' + esc(texte.slice(i + terme.length));
      };
      const aide = s.favoris ? 'Garde un article avec « ☆ Garder » pour le retrouver ici, même après avoir fermé le jeu.' : vide;
      return `<div class="vy-av__recherche-tete"><p class="vy-av__surtitre">${s.favoris ? 'Tes repères' : 'Une réponse, sans détour'}</p><h3>${s.favoris ? 'Favoris' : 'Résultats du guide'}</h3><p role="status">${liste.length} article${liste.length > 1 ? 's' : ''}</p></div>` +
        (liste.length ? liste.map(e => `<button type="button" class="vy-av__resultat" data-act="avArticle" data-id="${e.article.id}"><small>${esc(e.parents.map(p => p.titre).join(' › '))}</small><b>${surligner(e.article.titre)}</b><span>${surligner(e.article.texte.slice(0, 165))}${e.article.texte.length > 165 ? '…' : ''}</span>${e.article.statut ? `<em>${esc(e.article.statut)}</em>` : ''}</button>`).join('') : `<p role="status">${aide}</p>`);
    },

    avPresentationClasse(article) {
      const c = article.presentationClasse && DATA.classes[article.classe];
      if (!c) return '';
      const voie = { force: 'Terra', intel: 'Ignis', chance: 'Aqua', agi: 'Aer' }[c.mainStat];
      return `<div class="vy-av__classe-meta"><canvas class="vy-av__portrait" data-av-portrait="${c.id}" width="96" height="112" aria-hidden="true">${esc(c.glyph)}</canvas><div><b>${esc(c.role)}</b><p>Voie conseillée : ${esc(voie || 'au choix')} · ${c.id === this.world.ch.classId ? 'Ta classe' : 'Les quatre voies se jouent'}</p></div></div>`;
    },

    avPaireSorts(id, base) {
      const c = DATA.classes[id], paire = c && c.paires.find(p => p[0] === base);
      if (!paire) return '';
      return paire.map((sid, variante) => {
        const d = DATA.spells[sid];
        if (!d) return '';
        const niveau = Character.unlockLevel(id, sid), obtenu = niveau <= this.world.ch.level;
        return `<div class="vy-av__sort"><img src="${esc(SortIcones.url(sid, d, 64))}" width="40" height="40" alt=""><div><b>${esc(d.name)}</b><small>${variante ? 'Variante' : 'Sort de base'} · Niveau ${niveau} · ${d.pa} PA${obtenu ? '' : ' · À débloquer'}</small><p>${esc(d.desc || '')}</p></div></div>`;
      }).join('');
    },

    avRepertoireSorts(id) {
      const c = DATA.classes[id];
      if (!c) return '';
      const termes = normaliser(this.aventure.recherche).trim().split(/\s+/).filter(Boolean);
      return `<div class="vy-av__repertoire">${c.paires.map(([base, variante]) => {
        const texte = normaliser(c.name + ' ' + c.title + ' ' + [base, variante].filter(Boolean).map(id => DATA.spells[id].name + ' ' + DATA.spells[id].desc).join(' '));
        const ouvert = (this.aventure.sortsOuverts || []).includes(base) || (termes.length && termes.every(t => texte.includes(t)));
        return `<details data-guide-classe="${id}" data-guide-sort="${base}"${ouvert ? ' open' : ''}><summary>${esc(DATA.spells[base].name)}${variante ? ' / ' + esc(DATA.spells[variante].name) : ''}</summary>${ouvert ? this.avPaireSorts(id, base) : ''}</details>`;
      }).join('')}</div>`;
    },

    avSchemaZone(schema) {
      const map = Grid.create(Array(7).fill('.......'));
      const origine = this.aventure.vertical ? { x: 3, y: 1 } : { x: 1, y: 3 }, cible = { x: 3, y: 3 };
      const cells = schema.shape === 'pierce'
        ? Combat.prototype.zoneCells.call({ map, entityAt: () => null, blocksSight: () => false }, { pos: origine }, { aoe: schema }, cible, origine)
        : Grid.aoeCells(map, schema.shape, schema.size, cible, origine);
      const touches = new Set(cells.map(c => c.x + ',' + c.y));
      let cases = '';
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const px = 104 + (x - y) * 13, py = 12 + (x + y) * 7;
        const lanceur = x === origine.x && y === origine.y, centre = x === cible.x && y === cible.y;
        cases += `<g><polygon class="${touches.has(x + ',' + y) ? 'touchee' : ''}" points="${px},${py} ${px + 12},${py + 6} ${px},${py + 12} ${px - 12},${py + 6}"/>${lanceur ? `<circle cx="${px}" cy="${py + 6}" r="3"/>` : ''}${centre ? `<path d="M${px - 3} ${py + 3}l6 6m0-6-6 6"/>` : ''}</g>`;
      }
      return `<figure class="vy-av__schema"><svg viewBox="0 0 208 112" role="img" aria-label="Exemple de zone : ${cells.length} cases touchées sur un terrain vide">${cases}</svg><figcaption>● Lanceur · × Cible · Cases dorées : zone touchée<br>Exemple sur terrain vide, taille propre au sort.</figcaption>${bouton('avTourner', 'Tourner le lancer')}</figure>`;
    },

    avNomFenetre(id) {
      return { carac: 'les Caractéristiques', quetes: 'les Quêtes', succes: 'les Succès', sac: 'l’Inventaire', carte: 'la Carte', sorts: 'les Sorts', carnet: 'le Bestiaire', faction: 'la Faction', guilde: 'la Guilde', metiers: 'les Métiers', boutique: 'la Boutique des Cimes', garderobe: 'la Garde-robe', familiers: 'les Familiers', montures: 'les Montures', options: 'les Options', profil: 'le Profil' }[id] || id;
    },

    pistesAventure() {
      const ch = this.world.ch;
      const zones = (DATA.content.zones || []).filter(z => z.region !== 'ervane' || ch.origine === 'ervane');
      const regionDuPnj = id => zones.find(z => z.maps.some(m => (m.npcs || []).includes(id)));
      const succes = Achievements.defs().filter(a => Achievements.pourPerso(ch, a)).map(a => {
        const progression = Achievements.avancement(ch, a), cond = a.cond || {};
        const z = zones.find(z => z.id === cond.zone || (cond.dungeon && z.maps.some(m => m.dungeon === cond.dungeon)));
        return { id: 'succes:' + a.id, titre: a.name, texte: a.desc || '', type: Achievements.category(a), region: z ? z.region : '', niveau: cond.level || (z && z.level ? z.level[0] : 1), fait: ch.achievements.includes(a.id), progression, detail: Achievements.progress(ch, a), win: 'succes', icone: 'succes' };
      });
      if (this.aventure.onglet === 'parcours') return succes;
      const quetes = Quests.defs().filter(q => !q.hidden && (ch.quests.active[q.id] || Quests.canStart(ch, q.id))).filter(q => regionDuPnj(q.giver)).map(q => {
        const z = regionDuPnj(q.giver), actif = !!ch.quests.active[q.id];
        return { id: 'quete:' + q.id, titre: q.name, texte: q.desc || (actif ? 'Reprends cette quête dans ton journal.' : `Parle à ${Quests.npcName(q.giver)} pour commencer.`), type: 'Quêtes', region: z.region, niveau: q.level || 1, detail: actif ? 'En cours' : 'Disponible', win: 'quetes', icone: 'quetes' };
      });
      const exploration = zones.map(z => {
        const vus = z.maps.filter(m => ch.counters.maps.includes(m.id)).length;
        return { id: 'zone:' + z.id, titre: z.name, texte: z.description || 'Explore les chemins de cette région.', type: 'Exploration', region: z.region, niveau: (z.level || [1])[0], fait: vus === z.maps.length, progression: [vus, z.maps.length], detail: `${vus} / ${z.maps.length} cartes découvertes`, win: 'carte', icone: 'carte' };
      }).filter(z => !z.fait);
      return [...quetes, ...exploration, ...succes.filter(a => !a.fait && a.progression && a.progression[0] > 0)].sort((a, b) => Math.abs(a.niveau - ch.level) - Math.abs(b.niveau - ch.level));
    },

    renderPistesAventure(recherche) {
      const s = this.aventure, pistes = this.pistesAventure();
      s.verrous = (s.verrous || []).filter(id => pistes.some(p => p.id === id));
      const types = [...new Set(pistes.map(p => p.type))].sort();
      const regions = [...new Set(pistes.map(p => p.region).filter(Boolean))].sort();
      const options = (liste, valeur) => liste.map(t => `<option value="${esc(t)}" ${t === valeur ? 'selected' : ''}>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</option>`).join('');
      const mots = normaliser(s.recherche).trim().split(/\s+/).filter(Boolean);
      const bas = Math.min(s.niveauMin, s.niveauMax), haut = Math.max(s.niveauMin, s.niveauMax);
      const liste = pistes.filter(p => (!s.masquer || !p.fait) && (!s.type || p.type === s.type) && (!s.region || p.region === s.region) && (s.onglet === 'parcours' || (p.niveau >= bas && p.niveau <= haut)) && mots.every(m => normaliser(p.titre + ' ' + p.texte).includes(m)));
      const suggestions = s.onglet === 'suggestions';
      const verrous = new Set(s.verrous || []);
      const fixes = suggestions ? liste.filter(p => verrous.has(p.id)) : [];
      const libres = suggestions ? liste.filter(p => !verrous.has(p.id) && !(s.ecartees || []).includes(p.id)) : liste;
      const taille = suggestions ? Math.max(1, 6 - fixes.length) : 12;
      const pages = Math.max(1, Math.ceil(libres.length / taille));
      const total = fixes.length + libres.length;
      s.page = s.page % pages;
      const visibles = fixes.concat(libres.slice(s.page * taille, (s.page + 1) * taille));
      return `<div class="vy-av__filtres">${recherche}<select id="av-type" aria-label="Type d’activité"><option value="">Toutes les activités</option>${options(types, s.type)}</select><select id="av-region" aria-label="Région"><option value="">Toutes les régions</option>${options(regions, s.region)}</select>` +
        (s.onglet === 'suggestions' ? `<label>Niveau entre <input type="number" id="av-min" min="1" max="300" value="${s.niveauMin}"></label><label>et <input type="number" id="av-max" min="1" max="300" value="${s.niveauMax}"></label>` : `<label><input type="checkbox" id="av-masquer" ${s.masquer ? 'checked' : ''}> Masquer les accomplis</label>`) + '</div>' +
        `<div class="vy-av__resultats" data-defile="av-pistes"><div class="vy-av__intro"><p class="vy-av__surtitre">${s.onglet === 'parcours' ? 'Les traces de ton aventure' : 'Une prochaine étape, à ton rythme'}</p><p>${s.onglet === 'parcours' ? 'Retrouve les objectifs de Veylan et ta progression. Leurs récompenses se récupèrent dans les Succès.' : 'Six idées selon ton personnage. Verrouille celles à garder ; demande une autre idée ou passe aux suivantes. Les filtres respectent toujours ton choix.'}</p></div><div class="vy-av__cartes">` + visibles.map(p => {
        const pct = p.fait ? 100 : p.progression && p.progression[1] ? Math.round(100 * p.progression[0] / p.progression[1]) : 0;
        return `<article class="vy-av__carte${p.fait ? ' accomplie' : ''}"><header><span>${esc(p.type)}</span><small>${p.fait ? 'Accompli' : 'Niv. ' + p.niveau}</small></header><div class="vy-av__sceau" aria-hidden="true">${ico(p.icone)}</div><h3>${esc(p.titre)}</h3><p>${esc(p.texte)}</p><footer><small>${esc(p.detail || '')}</small>${p.progression ? `<progress max="100" value="${Math.min(100, Math.max(0, pct))}" aria-label="Progression de ${esc(p.titre)}">${pct}%</progress>` : ''}${suggestions ? `<div class="vy-av__suggestion-outils">${bouton('avVerrou', verrous.has(p.id) ? 'Gardée' : 'Garder', `data-id="${esc(p.id)}" aria-pressed="${verrous.has(p.id)}"`)}${bouton('avAutre', 'Autre idée', `data-id="${esc(p.id)}" ${verrous.has(p.id) ? 'disabled' : ''}`)}</div>` : ''}${bouton('avOuvrir', 'Ouvrir ' + esc(this.avNomFenetre(p.win)), `data-win="${p.win}"`)}</footer></article>`;
      }).join('') + `</div>${!visibles.length ? `<p role="status">${vide}</p>${suggestions ? bouton('avRecommencer', 'Revoir toutes les idées') : ''}` : ''}</div><footer class="vy-av__pagination"><span role="status">${total} résultat${total > 1 ? 's' : ''} · ${s.page + 1} / ${pages}</span>${suggestions && (s.verrous || []).length ? bouton('avLiberer', 'Libérer les idées gardées') : ''}${bouton('avDebut', 'Début', pages <= 1 ? 'disabled' : '')}${bouton('avSuite', 'Suivants', pages <= 1 ? 'disabled' : '')}</footer>`;
    },
  });
})();
