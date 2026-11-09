const ConseilServeur = (() => {
  let transport = null, nom = null, local = null, chargement = null;

  function brancher(fn, libelle) { transport = typeof fn === 'function' ? fn : null; nom = transport ? (libelle || 'serveur') : null; }
  const dev = () => typeof Admin === 'object' && Admin.dev();
  const disponible = () => !!transport || dev();
  const etat = () => (transport ? nom : dev() ? 'local (à démarrer)' : null);

  function charger(src) {
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => ko(new Error('introuvable : ' + src));
      document.head.appendChild(s);
    });
  }
  async function demarrerLocal(ch) {
    if (local) return local;
    if (!chargement) chargement = (async () => {
      if (typeof ModerationServeur !== 'object') await charger('serveur/moderation.js');
      if (typeof ConseilServeurCommandes !== 'object') await charger('serveur/conseil.js');
      const mod = new ModerationServeur.Moderation({});
      const moi = ch ? (ch.uid || ch.name) : 'moi';
      const r = Admin.rang(Admin.rangDe(ch)) || {};
      mod.compte(moi, { rang: Math.max(0, Math.min(5, r.niveau | 0)), nom: ch ? ch.name : 'moi' });
      for (const s of (typeof Save === 'object' && Save.list ? Save.list() : [])) if (s.uid && s.uid !== moi) mod.compte(s.uid, { nom: s.name });
      const conseil = new ConseilServeurCommandes.Conseil(mod);
      local = { mod, conseil, moi };
      brancher(cmd => Promise.resolve(conseil.traiter(moi, cmd)), 'local (mode développeur)');
      return local;
    })();
    return chargement;
  }

  async function envoyer(cmd, ch) {
    try {
      if (!transport && dev()) await demarrerLocal(ch);
      if (!transport) return { ok: false, raison: 'Le Conseil n\'est pas encore branché sur le serveur du jeu en ligne.' };
      const r = await transport(cmd);
      return r && typeof r === 'object' ? r : { ok: false, raison: 'Réponse illisible du serveur' };
    } catch (e) {
      return { ok: false, raison: 'Le serveur ne répond pas (' + (e && e.message ? e.message : e) + ')' };
    }
  }

  async function essai(ch) {
    if (!dev()) return { ok: false, raison: 'Réservé au mode développeur' };
    const L = await demarrerLocal(ch), m = L.mod;
    const n = m.signalements.size + 1, fautif = 'essai-fautif-' + n, temoin = 'essai-temoin-' + n;
    m.compte(fautif, { nom: 'Fautif d\'essai ' + n }); m.compte(temoin, { nom: 'Témoin d\'essai ' + n });
    const msg = m.ecrireMessage(fautif, { canal: 'public', texte: 'Un message grossier d\'essai, au canal public.' });
    return m.signaler(temoin, { cible: fautif, raison: 'insulte', messages: [msg.message], note: 'Signalement d\'essai du mode développeur' });
  }

  return { brancher, disponible, etat, envoyer, essai, local: () => local };
})();
