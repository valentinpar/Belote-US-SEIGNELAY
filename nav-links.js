// Liste centralisée des pages du site US Seignelay.
// Pour ajouter une page à TOUS les menus hamburger d'un coup :
// il suffit d'ajouter une ligne ici, aucune autre modification nécessaire.
const NAV_LINKS = [
  { href: "index.html",              icon: "🏠", label: "Accueil" },
  { href: "tournoi-petanque.html",   icon: "🎱", label: "Pétanque" },
  { href: "tournoi-foot.html",       icon: "⚽", label: "Football" },
  { href: "buvette.html",            icon: "🍹", label: "Buvette" }
];

// Injecte les liens dans le conteneur du menu hamburger (id="drawer-sites"),
// en excluant automatiquement la page actuellement affichée.
function renderNavLinks(containerId) {
  const el = document.getElementById(containerId || 'drawer-sites');
  if (!el) return;
  const current = (location.pathname.split('/').pop() || 'index.html');
  el.innerHTML = NAV_LINKS
    .filter(l => l.href !== current)
    .map(l => '<a class="drawer-item" href="' + l.href + '">' + l.icon + ' ' + l.label + '</a>')
    .join('');
}
