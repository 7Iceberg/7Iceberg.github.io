(() => {
  const CLE = 'veylan.hud';
  const BLOCS = [
    { id: 'vital', nom: 'Vie, PA, PM, XP', sel: '#vital', onglet: 'vie' },
    { id: 'raccourcis', nom: 'Raccourcis', sel: '#raccourcis', onglet: 'raccourcis' },
    { id: 'carte', nom: 'Mini-carte', sel: '#minicarte', onglet: 'carte' },
    { id: 'lieu', nom: 'Lieu', sel: '#lieu', onglet: 'lieu' },
    { id: 'menus', nom: 'Menus', sel: '#menus' },
    { id: 'suivi', nom: 'Quêtes suivies', sel: '#tracker' },
  ];
  const ONGLETS = [['vie', 'Vie'], ['raccourcis', 'Objets'], ['carte', 'Carte'], ['lieu', 'Lieu']];
  const defaut = () => ({ blocs: {}, xp: true, alerte: true, boussole: true, grille: true, profils: [null, null, null] });
  const PAS = 16, CENTRE = 8;
  const copieProfil = (r, vital) => ({ blocs: JSON.parse(JSON.stringify(r.blocs || {})), xp: r.xp !== false, alerte: r.alerte !== false, boussole: r.boussole !== false, vital: vital || null, t: Date.now() });
  const borne = (v, a, b, d) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.round(+v))) : d);
  const SVG = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const ICO = {
    deplacer: SVG('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'),
    ecran: SVG('<rect x="3" y="4" width="18" height="14" rx="3"/><path d="M7 14l3-3 2 2 4-4M8 21h8"/>'),
    oeil: SVG('<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>'),
    style: SVG('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
    xp: SVG('<path d="M4 7h16M4 12h16M4 17h10"/>'),
    coeur: SVG('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>'),
    taille: SVG('<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>'),
    boussole: SVG('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    epingle: SVG('<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    fermer: SVG('<path d="M6 6l12 12M18 6L6 18"/>'),
  };
  const CARDINAUX = [['n', 'N', 1, -0.5], ['e', 'E', 1, 0.5], ['s', 'S', -1, 0.5], ['o', 'O', -1, -0.5]];

  Object.assign(Hud.prototype, {
    initInterface() {
      this.ihud = this.lireInterface();
      const mc = document.getElementById('minicarte');
      if (mc && !mc.querySelector('.vy-boussole__p')) {
        for (const [k, l] of CARDINAUX) mc.insertAdjacentHTML('beforeend', `<i class="vy-boussole__p" data-p="${k}" aria-hidden="true">${l}</i>`);
      }
      this.world.on('map', d => this.majLieu(d));
      setInterval(() => this.majHeure(), 5000);
      if (this.world.mapDef) this.majLieu({ mapId: this.world.mapId, def: this.world.mapDef, zone: this.world.zone });
      window.addEventListener('resize', () => { this.placerBoussole(); this.appliquerInterface(true); if (this.editeur) this.majZones(); });
      window.addEventListener('keydown', evt => {
        if (this.editeur && evt.key === 'Escape') { evt.preventDefault(); this.fermerEditeur(); }
      });
      this.placerBoussole();
      this.appliquerInterface();
    },

    lireInterface() {
      const r = defaut();
      let s = null;
      try { s = JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { s = null; }
      if (s && typeof s === 'object') {
        for (const k of ['xp', 'alerte', 'boussole', 'grille']) if (typeof s[k] === 'boolean') r[k] = s[k];
        if (Array.isArray(s.profils)) r.profils = [0, 1, 2].map(i => { const p = s.profils[i]; return p && typeof p === 'object' && p.blocs && typeof p.blocs === 'object' ? p : null; });
        for (const b of BLOCS) {
          const v = s.blocs && s.blocs[b.id];
          if (!v || typeof v !== 'object') continue;
          r.blocs[b.id] = { dx: borne(v.dx, -4000, 4000, 0), dy: borne(v.dy, -4000, 4000, 0), cache: v.cache === true, taille: borne(v.taille, 60, 140, 100) };
        }
      }
      return r;
    },
    garderInterface() {
      try { localStorage.setItem(CLE, JSON.stringify(this.ihud)); } catch (e) {   }
    },
    blocHud(id) {
      const r = this.ihud || (this.ihud = defaut());
      return r.blocs[id] || (r.blocs[id] = { dx: 0, dy: 0, cache: false, taille: 100 });
    },

    appliquerInterface(rentrer) {
      const r = this.ihud || (this.ihud = defaut());
      for (const b of BLOCS) {
        const el = document.querySelector(b.sel);
        if (!el) continue;
        const v = r.blocs[b.id];
        el.style.translate = v && (v.dx || v.dy) ? `${v.dx}px ${v.dy}px` : '';
        el.style.scale = v && v.taille !== 100 ? String(v.taille / 100) : '';
        el.classList.toggle('vy-hud-cache', !!(v && v.cache));
        if (rentrer && v && (v.dx || v.dy)) this.rentrerBloc(el);
      }
      const app = document.getElementById('app');
      app.classList.toggle('vy-sans-alerte', r.alerte === false);
      app.classList.toggle('vy-sans-boussole', r.boussole === false);
    },
    pasEcran(el) {
      const r0 = el.getBoundingClientRect();
      if (!r0.width) return 1;
      const t = el.style.translate, m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(t) || [0, 0, 0];
      el.style.translate = `${+m[1] + 100}px ${+m[2]}px`;
      const r1 = el.getBoundingClientRect();
      el.style.translate = t;
      return Math.max(0.2, (r1.left - r0.left) / 100) || 1;
    },
    rentrerBloc(el) {
      const st = document.getElementById('stage').getBoundingClientRect(), r = el.getBoundingClientRect();
      if (!r.width) return;
      const ex = r.left < st.left ? st.left - r.left : r.right > st.right ? st.right - r.right : 0;
      const ey = r.top < st.top ? st.top - r.top : r.bottom > st.bottom ? st.bottom - r.bottom : 0;
      if (!ex && !ey) return;
      const k = this.pasEcran(el), m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(el.style.translate) || [0, 0, 0];
      el.style.translate = `${Math.round(+m[1] + ex / k)}px ${Math.round(+m[2] + ey / k)}px`;
    },


    majLieu(d) {
      const el = document.getElementById('lieu');
      const w = this.world, def = (d && d.def) || w.mapDef;
      if (!el || !def) return;
      const id = (d && d.mapId) || w.mapId || '';
      const pos = typeof Atlas === 'object' && !String(id).includes('#') ? Atlas.coordsOf(id) : null;
      const zone = (d && d.zone) || w.zone;
      const nom = def.sousZone ? def.sousZone.charAt(0).toUpperCase() + def.sousZone.slice(1) : def.name || '';
      el.innerHTML = (pos ? `<span class="vy-lieu__coord" title="Coordonnées de la carte">${ICO.epingle}${pos[0]},${pos[1]}</span>` : '') +
        `<b class="vy-lieu__nom">${esc(nom)}</b>` +
        (zone && zone.name && zone.name !== nom ? `<small class="vy-lieu__zone">${esc(zone.name)}</small>` : '') +
        (typeof Heure === 'object' && !String(id).includes('#') ? '<small class="vy-lieu__heure"></small>' : '');
      this.majHeure();
      el.setAttribute('aria-label', `Lieu : ${nom}${zone && zone.name ? ', ' + zone.name : ''}${pos ? `, [${pos[0]},${pos[1]}]` : ''}`);
      if (this.editeur) this.majZones();
    },
    majHeure() {
      const el = document.querySelector('#lieu .vy-lieu__heure');
      if (!el || typeof Heure !== 'object') return;
      const t = Date.now(), l = Heure.libelle(t);
      if (el.textContent !== l) el.textContent = l;
      el.classList.toggle('crepuscule', Heure.crepuscule(t));
    },
    placerBoussole() {
      const mc = document.getElementById('minicarte');
      if (!mc) return;
      const W = mc.clientWidth || 210, H = mc.clientHeight || 120;
      for (const [k, , dx, dy] of CARDINAUX) {
        const i = mc.querySelector(`.vy-boussole__p[data-p="${k}"]`);
        if (!i) continue;
        const px = dx * W / 2, py = dy * W / 2;
        const t = Math.min((W / 2) / Math.abs(px), (H / 2) / Math.abs(py));
        i.style.left = (50 + (px * t) / W * 100).toFixed(2) + '%';
        i.style.top = (50 + (py * t) / H * 100).toFixed(2) + '%';
      }
    },


    ouvrirEditeur() {
      if (this.world.state === 'combat') { this.toast('Pas pendant un combat.'); return false; }
      const bc = document.getElementById('bas-centre');
      if (!bc || getComputedStyle(bc).display === 'none') { this.toast('L\'interface se règle sur ordinateur.'); return false; }
      if (this.editeur) return true;
      this.fen.closeAll(); this.syncMenus();
      const ov = document.createElement('div');
      ov.className = 'vy-editeur';
      ov.innerHTML = '<div class="vy-editeur__grille" aria-hidden="true"></div><i class="vy-editeur__guide v" aria-hidden="true"></i><i class="vy-editeur__guide h" aria-hidden="true"></i><div class="vy-editeur__zones"></div><section class="vy-editeur__panneau" role="dialog" aria-label="Interface du HUD"></section>';
      ov.classList.toggle('grille', !this.ihud || this.ihud.grille !== false);
      document.getElementById('stage').appendChild(ov);
      this.editeur = { el: ov, onglet: 'vie' };
      document.getElementById('app').classList.add('vy-edition');
      this.rendreEditeur();
      this.majZones();
      this.brancherEditeur(ov);
      return true;
    },
    fermerEditeur() {
      if (!this.editeur) return;
      this.editeur.el.remove();
      this.editeur = null;
      document.getElementById('app').classList.remove('vy-edition');
      this.garderInterface();
    },
    reinitInterface() {
      this.ihud = defaut();
      this.garderInterface();
      this.appliquerInterface();
      this.choisirVital('coeur');
      this.refreshVital();
      if (this.editeur) { this.rendreEditeur(); this.majZones(); }
    },

    majZones() {
      const ed = this.editeur;
      if (!ed) return;
      const st = document.getElementById('stage').getBoundingClientRect(), box = ed.el.querySelector('.vy-editeur__zones');
      for (const b of BLOCS) {
        const el = document.querySelector(b.sel), r = el && el.getBoundingClientRect();
        let z = box.querySelector(`[data-bloc="${b.id}"]`);
        if (!r || r.width < 4 || r.height < 4) { if (z) z.remove(); continue; }
        if (!z) {
          z = document.createElement('div');
          z.className = 'vy-editeur__zone';
          z.dataset.bloc = b.id;
          z.title = 'Glisser pour déplacer ; double-clic pour remettre';
          z.innerHTML = `<span>${ICO.deplacer}${b.nom}</span>`;
          box.appendChild(z);
        }
        z.classList.toggle('sel', !!b.onglet && b.onglet === ed.onglet);
        z.classList.toggle('cache', el.classList.contains('vy-hud-cache'));
        z.style.left = (r.left - st.left - 5).toFixed(1) + 'px';
        z.style.top = (r.top - st.top - 5).toFixed(1) + 'px';
        z.style.width = (r.width + 10).toFixed(1) + 'px';
        z.style.height = (r.height + 10).toFixed(1) + 'px';
      }
    },

    rendreEditeur() {
      const ed = this.editeur;
      if (!ed) return;
      const r = this.ihud, on = ed.onglet, b = this.blocHud(on === 'vie' ? 'vital' : on);
      const inter = (act, actif, label) => `<button class="vy-editeur__inter${actif ? ' on' : ''}" data-act="${act}" role="switch" aria-checked="${actif}" aria-label="${label}"></button>`;
      const ligne = (ico, titre, sous, fin) => `<div class="vy-editeur__ligne"><span class="vy-editeur__ico">${ico}</span><div><b>${titre}</b>${sous ? `<small>${sous}</small>` : ''}</div>${fin}</div>`;
      const nomOnglet = { vie: 'le bloc vital', raccourcis: 'les raccourcis', carte: 'la mini-carte', lieu: 'le lieu' }[on];
      let corps = ligne(ICO.oeil, `Afficher ${nomOnglet}`, b.cache ? 'Caché' : 'Affiché', inter('cache', !b.cache, `Afficher ${nomOnglet}`));
      if (on === 'vie') {
        const S = Gemmes.STYLES, i = Math.max(0, S.findIndex(s => s[0] === this.styleVital()));
        corps += ligne(ICO.style, `Style : ${S[i][1]}`, `Style ${i + 1} sur ${S.length}`, '<span class="vy-editeur__fleches"><button class="vy-editeur__fleche" data-act="style" data-pas="-1" aria-label="Style précédent">‹</button><button class="vy-editeur__fleche" data-act="style" data-pas="1" aria-label="Style suivant">›</button></span>') +
          `<div class="vy-editeur__points">${S.map((s, k) => `<i${k === i ? ' class="on"' : ''}></i>`).join('')}</div>` +
          `<div class="vy-editeur__apercu" aria-hidden="true">${Gemmes.apercu(this.styleVital())}</div>` +
          ligne(ICO.xp, 'Afficher l\'XP', 'La barre d\'expérience du bloc du bas', inter('xp', r.xp !== false, 'Afficher l\'XP')) +
          ligne(ICO.coeur, 'Prévenir quand la vie est basse', 'La pierre des PV luit sous 30 %', inter('alerte', r.alerte !== false, 'Prévenir quand la vie est basse'));
      }
      if (on === 'carte') corps += ligne(ICO.boussole, 'La boussole', 'N, E, S, O autour de la carte', inter('boussole', r.boussole !== false, 'La boussole'));
      corps += `<div class="vy-editeur__ligne"><span class="vy-editeur__ico">${ICO.taille}</span><div><b>Taille</b><label class="vy-editeur__taille"><input type="range" min="60" max="140" step="5" value="${b.taille}" data-act="taille" aria-label="Taille de ${nomOnglet}" style="--v:${b.taille}"><em>${b.taille} %</em></label></div></div>`;
      ed.el.querySelector('.vy-editeur__panneau').innerHTML =
        `<header class="vy-editeur__tete"><span class="vy-editeur__logo">${ICO.ecran}</span><div class="vy-editeur__titre"><b>Interface <span>HUD</span></b><small>Rangée dans ce navigateur</small></div><button class="vy-editeur__x" data-act="terminer" aria-label="Fermer">${ICO.fermer}</button></header>` +
        `<div class="vy-editeur__corps"><div class="vy-editeur__deplacer">${ICO.deplacer}<div><b>Déplacer les blocs</b><small>Glisse chaque bloc où tu veux ; double-clic pour le remettre</small></div></div>` +
        ligne(ICO.style, 'Aimanter à la grille', 'Les blocs s\'alignent sur la grille et au centre', inter('grille', r.grille !== false, 'Aimanter à la grille')) +
        `<div class="vy-editeur__profils" role="group" aria-label="Profils de disposition">${(r.profils || [null, null, null]).map((p, i) => `<div class="vy-editeur__profil${p ? ' plein' : ''}"><b>Profil ${i + 1}</b><small>${p ? 'rangé' : 'vide'}</small><span><button data-act="profilCharger" data-i="${i}" ${p ? '' : 'disabled'}>Charger</button><button data-act="profilRanger" data-i="${i}">Ranger</button></span></div>`).join('')}</div>` +
        `<div class="vy-editeur__onglets" role="tablist">${ONGLETS.map(([k, l]) => `<button class="vy-editeur__onglet${k === on ? ' on' : ''}" role="tab" data-act="onglet" data-onglet="${k}" aria-selected="${k === on}">${l}</button>`).join('')}</div>${corps}</div>` +
        `<footer class="vy-editeur__pied"><button data-act="reinit" class="vy-editeur__fantome">Réinitialiser</button><button data-act="terminer" class="vy-editeur__plein">Terminé</button></footer>`;
    },

    brancherEditeur(ov) {
      const pan = ov.querySelector('.vy-editeur__panneau');
      pan.addEventListener('click', evt => {
        const t = evt.target.closest('[data-act]');
        if (!t || t.dataset.act === 'taille') return;
        const ed = this.editeur, r = this.ihud, a = t.dataset.act;
        const b = this.blocHud(ed.onglet === 'vie' ? 'vital' : ed.onglet);
        if (a === 'onglet') ed.onglet = t.dataset.onglet;
        else if (a === 'cache') b.cache = !b.cache;
        else if (a === 'xp') { r.xp = r.xp === false; this.refreshVital(); }
        else if (a === 'alerte') r.alerte = r.alerte === false;
        else if (a === 'boussole') r.boussole = r.boussole === false;
        else if (a === 'grille') { r.grille = r.grille === false; ed.el.classList.toggle('grille', r.grille !== false); }
        else if (a === 'profilRanger') { r.profils = r.profils || [null, null, null]; r.profils[+t.dataset.i] = copieProfil(r, this.styleVital()); this.toast(`Disposition rangée dans le profil ${+t.dataset.i + 1}.`); }
        else if (a === 'profilCharger') {
          const pr = (r.profils || [])[+t.dataset.i]; if (!pr) return;
          r.blocs = JSON.parse(JSON.stringify(pr.blocs)); r.xp = pr.xp; r.alerte = pr.alerte; r.boussole = pr.boussole;
          if (pr.vital) this.choisirVital(pr.vital);
          this.refreshVital(); this.toast(`Profil ${+t.dataset.i + 1} chargé.`);
        }
        else if (a === 'style') { const S = Gemmes.STYLES, i = S.findIndex(s => s[0] === this.styleVital()); this.choisirVital(S[(i + Number(t.dataset.pas) + S.length) % S.length][0]); }
        else if (a === 'reinit') { if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Confirmer'; return; } this.reinitInterface(); return; }
        else if (a === 'terminer') { this.fermerEditeur(); return; }
        else return;
        this.garderInterface();
        this.appliquerInterface();
        this.rendreEditeur();
        this.majZones();
      });
      pan.addEventListener('input', evt => {
        const t = evt.target;
        if (t.dataset.act !== 'taille') return;
        const ed = this.editeur, b = this.blocHud(ed.onglet === 'vie' ? 'vital' : ed.onglet);
        b.taille = borne(t.value, 60, 140, 100);
        t.style.setProperty('--v', b.taille);
        const em = t.parentNode.querySelector('em'); if (em) em.textContent = `${b.taille} %`;
        this.appliquerInterface();
        this.majZones();
      });
      pan.addEventListener('change', evt => { if (evt.target.dataset.act === 'taille') this.garderInterface(); });
      const zones = ov.querySelector('.vy-editeur__zones');
      zones.addEventListener('pointerdown', evt => {
        const z = evt.target.closest('.vy-editeur__zone');
        if (!z || evt.button > 0) return;
        evt.preventDefault();
        const def = BLOCS.find(b => b.id === z.dataset.bloc), el = document.querySelector(def.sel), b = this.blocHud(def.id);
        const k = this.pasEcran(el), r0 = el.getBoundingClientRect(), st = document.getElementById('stage').getBoundingClientRect();
        const x0 = evt.clientX, y0 = evt.clientY, d0 = [b.dx, b.dy];
        let bouge = false;
        const suivre = e => {
          if (e.pointerId !== evt.pointerId) return;
          let mx = e.clientX - x0, my = e.clientY - y0;
          if (!bouge && Math.hypot(mx, my) < 3) return;
          bouge = true;
          let gv = false, gh = false;
          if (this.ihud.grille !== false) {
            const cx = r0.left + mx + r0.width / 2, cy = r0.top + my + r0.height / 2, sx = st.left + st.width / 2, sy = st.top + st.height / 2;
            if (Math.abs(cx - sx) <= CENTRE) { mx += sx - cx; gv = true; } else mx = Math.round((r0.left - st.left + mx) / PAS) * PAS - (r0.left - st.left);
            if (Math.abs(cy - sy) <= CENTRE) { my += sy - cy; gh = true; } else my = Math.round((r0.top - st.top + my) / PAS) * PAS - (r0.top - st.top);
          }
          const ov = this.editeur && this.editeur.el;
          if (ov) { ov.querySelector('.vy-editeur__guide.v').classList.toggle('on', gv); ov.querySelector('.vy-editeur__guide.h').classList.toggle('on', gh); }
          mx = Math.max(st.left - r0.left, Math.min(st.right - r0.right, mx));
          my = Math.max(st.top - r0.top, Math.min(st.bottom - r0.bottom, my));
          b.dx = Math.round(d0[0] + mx / k); b.dy = Math.round(d0[1] + my / k);
          el.style.translate = b.dx || b.dy ? `${b.dx}px ${b.dy}px` : '';
          this.majZones();
        };
        const lacher = e => {
          if (e.pointerId !== evt.pointerId) return;
          if (this.editeur) for (const g of this.editeur.el.querySelectorAll('.vy-editeur__guide')) g.classList.remove('on');
          window.removeEventListener('pointermove', suivre);
          window.removeEventListener('pointerup', lacher);
          window.removeEventListener('pointercancel', lacher);
          if (bouge) this.garderInterface();
          else if (def.onglet && this.editeur && this.editeur.onglet !== def.onglet) { this.editeur.onglet = def.onglet; this.rendreEditeur(); this.majZones(); }
        };
        window.addEventListener('pointermove', suivre);
        window.addEventListener('pointerup', lacher);
        window.addEventListener('pointercancel', lacher);
      });
      zones.addEventListener('dblclick', evt => {
        const z = evt.target.closest('.vy-editeur__zone');
        if (!z) return;
        const b = this.blocHud(z.dataset.bloc);
        b.dx = 0; b.dy = 0;
        this.garderInterface();
        this.appliquerInterface();
        this.majZones();
      });
    },
  });
})();
