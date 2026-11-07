(() => {
  const app = document.getElementById('app');
  if (!app) return;
  const m = /[?&]da=([a-z0-9]+)/i.exec(location.search);
  let v = m ? (m[1] === '0' || m[1] === 'off' ? '0' : 'eternaris') : null;
  if (m) { try { localStorage.setItem('veylan.da', v); } catch (e) {   } }
  if (v == null) { try { v = localStorage.getItem('veylan.da'); } catch (e) { v = null; } }
  app.classList.toggle('vy-eter', v !== '0');
})();
