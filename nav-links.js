// Chargeur du menu hamburger — US Seignelay
// Ce fichier ne bouge plus. La liste des pages vit dans nav-links.json,
// qui est régénéré automatiquement par GitHub Actions à chaque ajout
// de page (voir .github/workflows/update-nav.yml).
async function renderNavLinks(containerId) {
  const el = document.getElementById(containerId || 'drawer-sites');
  if (!el) return;
  try {
    const res = await fetch('nav-links.json');
    const links = await res.json();
    const current = (location.pathname.split('/').pop() || 'index.html');
    el.innerHTML = links
      .filter(l => l.href !== current)
      .map(l => '<a class="drawer-item" href="' + l.href + '">' + l.icon + ' ' + l.label + '</a>')
      .join('');
  } catch (e) {
    console.warn('nav-links.json introuvable ou invalide :', e);
  }
}
