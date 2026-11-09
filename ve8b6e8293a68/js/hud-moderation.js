(() => {
const esc = s => Util.esc(s);
const date = t => (Number.isFinite(t) ? new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
const MIN = 60000, H = 60 * MIN, J = 24 * H;
const duree = d => (d === null ? 'définitif' : !d ? '' : d % J === 0 ? `${d / J} jour${d / J > 1 ? 's' : ''}` : d % H === 0 ? `${d / H} heure${d / H > 1 ? 's' : ''}` : `${Math.round(d / MIN)} min`);
const SUITE = { sanction: 'sanctionné', sans_suite: 'sans suite', abusif: 'abusif' };

Object.assign(Hud.prototype, {
  etatModeration() {
    const S = this.admin;
    if (!S.mod) S.mod = { charge: false, enCours: false, refs: null, file: [], contestations: [], failles: [], journal: null, dossier: null, bareme: null, compte: '', faute: '', signalement: null, message: '' };
    return S.mod;
  },
  async envoyerModeration(cmd) {
    const r = await ConseilServeur.envoyer(cmd, this.world.ch);
    if (!r.ok) this.toast(r.raison || 'Refusé par le serveur.');
    return r;
  },
  async chargerModeration() {
    const M = this.etatModeration();
    if (M.enCours) return;
    M.enCours = true;
    const [refs, file, cont, failles, journal] = await Promise.all(['references', 'file', 'contestations', 'failles', 'journal'].map(op => ConseilServeur.envoyer({ op }, this.world.ch)));
    M.enCours = false; M.charge = true;
    M.erreur = refs.ok ? null : refs.raison;
    if (refs.ok) M.refs = refs;
    M.file = file.ok ? file.signalements : [];
    M.contestations = cont.ok ? cont.contestations : [];
    M.failles = failles.ok ? failles.failles : [];
    M.journal = journal.ok ? journal.journal : null;
    if (M.compte) { const d = await ConseilServeur.envoyer({ op: 'dossier', compte: M.compte }, this.world.ch); M.dossier = d.ok ? d : null; }
    if (this.elAdmin && this.admin.page === 'moderation') this.rendreAdmin();
  },

  adminPage_moderation() {
    const M = this.etatModeration();
    if (!ConseilServeur.disponible()) return '<p class="vy-admin__vide">Le Conseil se branche sur le serveur du jeu en ligne : les signalements, les sanctions et les contestations y vivent, jamais dans le navigateur. Il n\'est pas encore en ligne.</p>';
    if (!M.charge) { this.chargerModeration(); return '<p class="vy-admin__vide">Le serveur répond…</p>'; }
    if (M.erreur) return `<p class="vy-admin__vide">${esc(M.erreur)}</p>`;
    const refs = M.refs || { fautes: [], sanctions: [] };
    const nomSanction = id => ((refs.sanctions.find(x => x.id === id) || {}).nom || id);
    const tete = `<div class="vy-admin__boutons"><span class="vy-admin__etat">Branché : ${esc(ConseilServeur.etat() || '-')}</span>
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="modRafraichir">Rafraîchir</button>
      ${Admin.dev() ? '<button type="button" class="vy-bouton vy-bouton--petit" data-act="modEssai">Signalement d\'essai</button>' : ''}</div>`;

    const file = M.file.map(x => `<div class="vy-admin__ligne vy-mod__signalement"><span class="vy-admin__nom">${esc(x.nomCible)}<small>${esc(x.serveur ? 'signalé par le serveur' : 'signalé par un joueur')} · ${esc(x.raison)} · ${date(x.t)}</small>
        ${x.note ? `<em>${esc(x.note)}</em>` : ''}
        ${(x.messages || []).map(m => `<q>${esc(m.texte)}</q>`).join('')}
        ${x.preuves && x.preuves.alertes ? x.preuves.alertes.map(a => `<em>${esc(a.texte)}</em>`).join('') : ''}</span>
      <button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="modDossier" data-compte="${esc(x.cible)}" data-signalement="${esc(x.numero)}">Dossier</button>
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="modTraiter" data-numero="${esc(x.numero)}" data-suite="sans_suite">Sans suite</button>
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="modTraiter" data-numero="${esc(x.numero)}" data-suite="abusif">Abusif</button></div>`).join('') || '<p class="vy-admin__vide">Aucun signalement à traiter.</p>';

    let dossier = `<div class="vy-admin__champ"><label for="adm-mod-compte">Compte</label><input id="adm-mod-compte" type="text" value="${esc(M.compte)}" placeholder="L'identifiant du compte" data-entree="1"><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="modOuvrir" data-champ="#adm-mod-compte">Ouvrir</button></div>`;
    if (M.dossier) {
      const D = M.dossier;
      const lignes = D.sanctions.map(x => `<div class="vy-admin__ligne"><span class="vy-admin__nom">${esc(nomSanction(x.type))}<small>${esc(x.raison)} · ${date(x.debut)}${x.fin === null ? ' · définitif' : x.fin > x.debut ? ' → ' + date(x.fin) : ''}${x.contestee ? ' · contestée' : ''}</small></span>
        ${x.levee ? '<span class="vy-admin__etat">Levée</span>' : `<button type="button" class="vy-bouton vy-bouton--petit" data-act="modLever" data-sanction="${esc(x.id)}">Lever</button>`}</div>`).join('') || '<p class="vy-admin__vide">Aucune sanction.</p>';
      const fautes = refs.fautes.map(f => `<option value="${esc(f.id)}"${M.faute === f.id ? ' selected' : ''}>${esc(f.nom)}</option>`).join('');
      const bareme = M.bareme ? `<p class="vy-note">Le barème${M.bareme.fois > 1 ? ` (récidive : ${M.bareme.fois}e fois)` : ''} : ${M.bareme.sanctions.map(x => esc(nomSanction(x.type) + (duree(x.duree) ? ' ' + duree(x.duree) : ''))).join(', ')}</p>` : '';
      dossier += `<h4>${esc(D.nom)} <small>${D.enCours.length ? 'en cours : ' + esc(D.enCours.map(nomSanction).join(', ')) : 'aucune sanction en cours'}${D.lies && D.lies.length ? ' · comptes liés : ' + esc(D.lies.join(', ')) : ''}</small></h4>
        <div class="vy-admin__table">${lignes}</div>
        <div class="vy-admin__champ"><label for="adm-mod-faute">Faute</label><select id="adm-mod-faute"><option value="">Choisir la faute…</option>${fautes}</select></div>
        ${bareme}
        <div class="vy-admin__champ"><label for="adm-mod-raison">Raison</label><input id="adm-mod-raison" type="text" placeholder="Ce qui s'est passé, pour le joueur et le dossier"><button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="modSanctionner" ${M.bareme ? '' : 'disabled title="Choisis d\'abord la faute"'}>Sanctionner selon le barème</button></div>`;
    }

    const cont = M.contestations.map(x => `<div class="vy-admin__ligne vy-mod__contestation"><span class="vy-admin__nom">${esc(x.nomCompte)} · ${esc(nomSanction(x.type))}<small>${esc(x.raison)} · contestée le ${date(x.t)}</small><q>${esc(x.texte)}</q></span>
      <input id="adm-mod-rep-${esc(x.id)}" type="text" placeholder="La réponse au joueur">
      <label class="vy-mod__vol"><input id="adm-mod-vol-${esc(x.id)}" type="checkbox"> compte volé</label>
      <button type="button" class="vy-bouton vy-bouton--petit vy-bouton--primaire" data-act="modRepondre" data-sanction="${esc(x.id)}" data-lever="1">Lever</button>
      <button type="button" class="vy-bouton vy-bouton--petit" data-act="modRepondre" data-sanction="${esc(x.id)}" data-lever="0">Maintenir</button></div>`).join('') || '<p class="vy-admin__vide">Aucune contestation à relire.</p>';
    const failles = M.failles.map(x => `<div class="vy-admin__ligne"><span class="vy-admin__nom">${date(x.t)}<small>${esc(x.texte)}</small></span></div>`).join('') || '<p class="vy-admin__vide">Aucune faille signalée.</p>';
    const journal = M.journal ? `<h3>Le journal du staff</h3><ul class="vy-admin__journal">${M.journal.slice(0, 20).map(j => `<li><small>${date(j.t)}</small> <b>${esc(j.nomStaff || j.staff || '')}</b> ${esc(j.quoi)}${j.type ? ' · ' + esc(nomSanction(j.type)) : ''}${j.suite ? ' · ' + esc(SUITE[j.suite] || j.suite) : ''}${j.raison ? ' · ' + esc(j.raison) : ''}</li>`).join('') || '<li>Vide.</li>'}</ul>` : '';
    return `${tete}
      <h3>Les signalements <small>${M.file.length}</small></h3><div class="vy-admin__table">${file}</div>
      <h3>Le dossier</h3>${dossier}
      <h3>Les contestations à relire <small>${M.contestations.length}</small></h3><div class="vy-admin__table">${cont}</div>
      <h3>Les failles <small>lues par le Conseil seulement</small></h3><div class="vy-admin__table">${failles}</div>
      ${journal}`;
  },

  async clicModeration(d, b, val) {
    const M = this.etatModeration();
    switch (d.act) {
      case 'modRafraichir': M.charge = false; this.rendreAdmin(); break;
      case 'modEssai': { const r = await ConseilServeur.essai(this.world.ch); if (r.ok) this.toast('Un signalement d\'essai attend dans la file.'); else this.toast(r.raison); await this.chargerModeration(); break; }
      case 'modTraiter': { const r = await this.envoyerModeration({ op: 'traiter', numero: d.numero, suite: d.suite }); if (r.ok) this.toast('Signalement traité.'); await this.chargerModeration(); break; }
      case 'modOuvrir':
      case 'modDossier': {
        M.compte = d.compte || val('#adm-mod-compte').trim(); M.signalement = d.signalement || null; M.bareme = null; M.faute = '';
        const r = await this.envoyerModeration({ op: 'dossier', compte: M.compte });
        M.dossier = r.ok ? r : null;
        this.rendreAdmin();
        break;
      }
      case 'modSanctionner': {
        const raison = val('#adm-mod-raison').trim();
        const cmd = { op: 'sanctionner', compte: M.compte, faute: M.faute, raison };
        if (M.signalement) cmd.signalement = M.signalement;
        const r = await this.envoyerModeration(cmd);
        if (r.ok) { this.toast('Sanction donnée, notifiée au joueur.'); M.signalement = null; M.bareme = null; M.faute = ''; }
        await this.chargerModeration();
        break;
      }
      case 'modLever': {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Confirmer'; return; }
        const r = await this.envoyerModeration({ op: 'lever', sanction: d.sanction, raison: 'Levée par le Conseil' });
        if (r.ok) this.toast('Sanction levée.');
        await this.chargerModeration();
        break;
      }
      case 'modRepondre': {
        const reponse = val('#adm-mod-rep-' + d.sanction).trim();
        const vol = !!(this.elAdmin.querySelector('#adm-mod-vol-' + d.sanction) || {}).checked;
        const r = await this.envoyerModeration({ op: 'repondre', sanction: d.sanction, lever: d.lever === '1', vol, reponse });
        if (r.ok) this.toast(d.lever === '1' ? 'Contestation acceptée : la sanction est levée.' : 'Contestation relue : la sanction est maintenue.');
        await this.chargerModeration();
        break;
      }
      default: break;
    }
  },

  async fauteModeration(faute) {
    const M = this.etatModeration();
    M.faute = faute; M.bareme = null;
    if (faute && M.compte) { const r = await this.envoyerModeration({ op: 'bareme', compte: M.compte, faute }); if (r.ok) M.bareme = r; }
    this.rendreAdmin();
  },
});

const champ = Hud.prototype.champAdmin;
Hud.prototype.champAdmin = function (evt, kind) {
  if (evt.target && evt.target.id === 'adm-mod-faute' && kind === 'change') { this.fauteModeration(evt.target.value); return; }
  return champ.call(this, evt, kind);
};
})();
