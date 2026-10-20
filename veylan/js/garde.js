// Garde-fou : chargé en premier. Toute erreur non rattrapée (au chargement ou en jeu) s'affiche
// en haut de l'écran, avec le fichier et la ligne, pour qu'un testeur puisse l'envoyer en
// capture au lieu de voir un écran noir. Sans dépendance : il doit marcher même si le reste casse.
(function () {
  let box = null, count = 0;
  function show(text) {
    count++;
    if (count > 6) return;
    try {
      if (!box) {
        box = document.createElement('div');
        box.id = 'garde';
        box.setAttribute('role', 'alert');
        box.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;padding:10px 40px 10px 12px;background:rgba(20,8,10,0.94);color:#ffd9cf;border:1.5px solid #f07a5c;border-radius:6px;font:13px/1.4 system-ui,sans-serif;white-space:pre-wrap;word-break:break-word;max-height:45vh;overflow:auto';
        const close = document.createElement('button');
        close.textContent = '×';
        close.setAttribute('aria-label', 'Fermer');
        close.style.cssText = 'position:absolute;right:6px;top:4px;width:30px;height:30px;border:0;background:transparent;color:#ffd9cf;font-size:22px;cursor:pointer';
        close.onclick = () => { box.remove(); box = null; };
        box.appendChild(close);
        const title = document.createElement('b');
        title.textContent = 'Veylan : une erreur est survenue. Fais une capture de cet encadré et envoie-la.\n';
        box.appendChild(title);
        document.body ? document.body.appendChild(box) : addEventListener('DOMContentLoaded', () => document.body.appendChild(box));
      }
      const line = document.createElement('div');
      line.textContent = text;
      box.appendChild(line);
    } catch (e) { /* rien à faire de plus */ }
  }
  const where = () => {
    const ua = navigator.userAgent || '';
    const m = ua.match(/(iPhone|iPad|Android [\d.]+|Windows|Macintosh|Linux)/);
    return (m ? m[1] : 'appareil inconnu') + ' · ' + innerWidth + '×' + innerHeight + ' · ×' + (devicePixelRatio || 1);
  };
  addEventListener('error', e => {
    const src = e.filename ? e.filename.split('/').slice(-2).join('/') + ':' + e.lineno : '';
    show((e.message || 'erreur') + (src ? '  (' + src + ')' : '') + '\n' + where());
  });
  addEventListener('unhandledrejection', e => {
    const r = e.reason;
    show('Promesse rejetée : ' + (r && r.message ? r.message : String(r)) + (r && r.stack ? '\n' + String(r.stack).split('\n').slice(1, 3).join('\n') : '') + '\n' + where());
  });
  window.VEYLAN_GARDE = { show, where };
})();
