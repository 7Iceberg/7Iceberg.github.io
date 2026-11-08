(() => {
  const CLE = 'veylan.carte.favoris.v1', esc = Util.esc;
  const ETOILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>';
  const base = { ficheCase: Hud.prototype.ficheCase, ficheIle: Hud.prototype.ficheIle, panneauCategories: Hud.prototype.panneauCategories };
  Object.assign(Hud.prototype, {
    favorisCarte() {
      if (this._favorisCarte) return this._favorisCarte;
      let a = [];
      try { a = JSON.parse(localStorage.getItem(CLE) || '[]'); } catch (e) {   }
      const vus = new Set();
      this._favorisCarte = (Array.isArray(a) ? a : []).filter(e => {
        if (!e || typeof e.cle !== 'string' || e.cle.length > 180 || typeof e.nom !== 'string' || e.nom.length > 160 ||
            typeof e.map !== 'string' || !World.mapDef(e.map) || vus.has(e.cle) ||
            (e.x != null && (!Number.isFinite(e.x) || !Number.isFinite(e.y)))) return false;
        vus.add(e.cle); return true;
      }).slice(0, 100).map(e => ({ cle: e.cle, nom: e.nom, sous: String(e.sous || '').slice(0, 160), map: e.map, pid: e.pid, x: e.x, y: e.y }));
      return this._favorisCarte;
    },
    cibleFavori(s) {
      if (!s) return null;
      if (s.favori) return s.favori;
      const P = this.world.plateau, it = s.item;
      const map = s.map || (P && P.secteurDe(s.x, s.y));
      if (!map || s.type === 'joueur') return null;
      let cle = 'carte:' + map, nom = World.mapDef(map).name;
      if (it) {
        if (it.npc && it.npc.id) { cle = 'pnj:' + it.npc.id; nom = it.npc.name; }
        else if (it.kind === 'donjon' && it.donjon) { cle = 'donjon:' + it.donjon.id; nom = it.donjon.name; }
        else if (it.kind === 'relais') { cle = 'relais:' + map; nom = "Relais de l'Aube"; }
        else if (it.kind === 'monument') { cle = 'monument:' + (P && P.id) + ':' + it.cle; nom = it.nom; }
        else if (it.kind === 'quete') return null;
      } else if (s.type === 'lieu' && s.sorte !== 'sousZone') { cle = 'lieu:' + (P && P.id) + ':' + s.cle; nom = s.nom; }
      return { cle, nom: Hud.majuscule(nom), sous: World.zoneOf(map).name, map, pid: P && P.id, x: s.x, y: s.y };
    },
    favoriCourant() {
      if (this.carteIleActive()) return this.cibleFavori(this.carte.selIle || { map: this.world.mapId });
      const id = this.carte.sel || Atlas.hereOf(this.world.mapId);
      const m = id && World.mapDef(id);
      return m ? { cle: 'carte:' + id, map: id, nom: Hud.majuscule(m.name), sous: World.zoneOf(id).name } : null;
    },
    boutonFavori(f) {
      if (!f) return '';
      const on = this.favorisCarte().some(e => e.cle === f.cle);
      return '<button type="button" class="vy-carte__favori' + (on ? ' on' : '') + '" data-carte-favori aria-pressed="' + on + '" aria-label="' + (on ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">' + ETOILE + '<span>' + (on ? 'Dans les favoris' : 'Ajouter aux favoris') + '</span></button>';
    },
    basculerFavori(f) {
      if (!f) return;
      const a = this.favorisCarte(), i = a.findIndex(e => e.cle === f.cle);
      if (i >= 0) a.splice(i, 1);
      else { if (a.length >= 100) { this.toast('Tu as déjà 100 favoris. Retire un lieu pour en ajouter un autre.'); return; } a.push(f); }
      try { localStorage.setItem(CLE, JSON.stringify(a)); } catch (e) { this.toast('Stockage indisponible : ces favoris restent pour cette session.'); }
      this.fen.render('carte');
    },
    allerFavori(f) {
      if (this.carteIleActive() && f.pid === this.world.plateau.id && Number.isFinite(f.x)) {
        this.allerIle({ cle: f.cle, type: 'lieu', sorte: 'lieu', nom: f.nom, map: f.map, x: f.x, y: f.y, favori: f });
      } else {
        const finir = () => {
          this.allerMonde(f.map);
          const Q = CartePlateaux.estPosee(f.map);
          if (this.carte3d && Q && Number.isFinite(f.x) && f.pid === Q.pid) {
            const p = CartePlateaux.versMonde(Q, f.x, f.y), q = this.carte3d.dansScene(f.map, p[0], p[1]);
            this.carte3d.aller(q[0], q[1]);
          }
        };
        this.carte.tab = 'monde'; this.carte.sel = f.map; this.fermerIle();
        if (!this.carte3d && !this.carte.repli3d) {
          const attente = this.ouvrir3D();
          this.fen.render('carte');
          Promise.resolve(attente).then(() => { if (this.fen.isOpen('carte') && this.carte.tab === 'monde' && this.carte.sel === f.map) finir(); });
        } else finir();
      }
    },
    ficheCase(id, opts) {
      const html = base.ficheCase.call(this, id, opts), m = World.mapDef(id);
      const bouton = !this.carteIleActive() && m ? this.boutonFavori({ cle: 'carte:' + id, map: id, nom: Hud.majuscule(m.name), sous: World.zoneOf(id).name }) : '';
      return html.replace('</h3>', '</h3>' + bouton);
    },
    ficheIle() { return base.ficheIle.call(this).replace('</h3>', '</h3>' + this.boutonFavori(this.favoriCourant()) + this.navigationDrapeau()); },
    panneauCategories() {
      const a = this.favorisCarte().slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
      return base.panneauCategories.call(this) + '<section class="vy-carte__favoris" aria-label="Favoris"><h3>' + ETOILE + 'Favoris <small>' + a.length + '</small></h3>' +
        (a.length ? '<ul>' + a.map(f => '<li><button type="button" data-carte-aller-favori="' + esc(f.cle) + '"><b>' + esc(f.nom) + '</b><small>' + esc(f.sous) + '</small></button><button type="button" class="vy-carte__retirer-favori" data-carte-retirer-favori="' + esc(f.cle) + '" aria-label="Retirer ' + esc(f.nom) + ' des favoris">' + ETOILE + '</button></li>').join('') + '</ul>' : '<p>Garde un lieu avec l’étoile de sa fiche.</p>') + '</section>';
    },
    monterNavigationCarte(body) {
      body.addEventListener('click', e => {
        const star = e.target.closest('[data-carte-favori]'), aller = e.target.closest('[data-carte-aller-favori]'), retirer = e.target.closest('[data-carte-retirer-favori]');
        if (star) this.basculerFavori(this.favoriCourant());
        else if (aller || retirer) {
          const cle = (aller || retirer).getAttribute(aller ? 'data-carte-aller-favori' : 'data-carte-retirer-favori');
          const f = this.favorisCarte().find(x => x.cle === cle);
          if (f) { if (aller) this.allerFavori(f); else this.basculerFavori(f); }
        }
      }, { signal: (this._navCarteAbort || (this._navCarteAbort = new AbortController())).signal });
    },
    drapeauPlateau() {
      const at = this.carte && this.carte.drapeau, P = this.world.plateau;
      if (!at || !P) return null;
      const Q = CartePlateaux.place(P.id);
      if (!Q) return null;
      const [x, y] = CartePlateaux.versPlateau(Q, at[0], at[1]);
      return P.secteurDe(x, y) ? { x, y, map: P.secteurDe(x, y) } : null;
    },
    poserDrapeauIle(p) {
      const ile = this.ile3D(), P = this.world.plateau, K = ile && ile.carteIle;
      if (!ile || !P) return;
      const h = K && K.sous(p.x, p.y, true);
      if (h && h.item && h.item.kind === 'drapeau') { this.poserDrapeau(null); return; }
      const q = ile.rayonSol(p.x, p.y), Q = CartePlateaux.place(P.id);
      if (!q || !Q || !P.secteurDe(q.x, q.y)) return;
      const n = P.nav, cible = n.libre(q.x, q.y) ? [q.x, q.y] : n.plusProche(q.x, q.y, 12, { comp: P.composanteJoueur() });
      if (!cible) { this.toast('Aucun sol accessible à cet endroit.'); return; }
      this.poserDrapeau(CartePlateaux.versMonde(Q, cible[0], cible[1]));
    },
    trajetDrapeau() {
      const w = this.world, P = w.plateau, d = this.drapeauPlateau();
      if (!P || !d) return null;
      const p = w.player, cle = [P.id, Math.round(p.x), Math.round(p.y), d.x, d.y, P.nav.barrieres.map(b => Number(b.ouverte)).join(''), Math.floor(performance.now()/1500)].join('|');
      if (this._trajetDrapeau && this._trajetDrapeau.cle === cle) return this._trajetDrapeau;
      const r = P.nav.chemin([p.x, p.y], [d.x, d.y], { max: 24000 });
      const fin = r && r.points[r.points.length - 1];
      const points = r && !r.partiel && fin && Math.hypot(fin.x-d.x,fin.y-d.y) < 1 ? r.points : [];
      let distance = 0;
      for (let i = 1; i < points.length; i++) distance += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
      return (this._trajetDrapeau = { cle, points, distance, accessible: !!points.length, destination: d });
    },
    navigationDrapeau() {
      const d = this.drapeauPlateau(), at = this.carte && this.carte.drapeau;
      if (!at) return '';
      const t = d && this.trajetDrapeau();
      const texte = t ? (t.accessible ? Math.round(t.distance) + ' pas · chemin accessible' : 'Aucun chemin accessible') : 'Destination dans une autre région';
      return '<div class="vy-carte__navigation" role="status"><b>Ton drapeau</b><span>' + texte + '</span><button type="button" class="vy-carte__lien" data-act="drapeau">Retirer</button></div>';
    },
  });
})();
