// Script exécuté automatiquement par GitHub Actions à chaque push.
// Il scanne les fichiers .html à la racine du dépôt et met à jour
// nav-links.json en conséquence :
//  - nouvelle page .html trouvée  -> elle est ajoutée (icône/label devinés)
//  - page existante déjà connue   -> son icône/label perso est conservé
//  - fichier .html supprimé       -> son entrée est retirée du menu
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const NAV_JSON = path.join(ROOT, 'nav-links.json');

// Fichiers .html à ne jamais afficher dans le menu
const IGNORE = ['404.html', 'offline.html'];

function guessIcon(filename) {
  const n = filename.toLowerCase();
  if (n.includes('foot')) return '⚽';
  if (n.includes('petanque')) return '🎱';
  if (n.includes('buvette')) return '🍹';
  if (n.includes('belote')) return '🃏';
  if (n.includes('loto')) return '🎟️';
  if (n.includes('index')) return '🏠';
  return '🔗';
}

function guessLabel(filename) {
  let name = filename.replace(/\.html$/i, '').replace(/^tournoi-/, '').replace(/[-_]/g, ' ');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const htmlFiles = fs.readdirSync(ROOT)
  .filter(f => f.toLowerCase().endsWith('.html'))
  .filter(f => !IGNORE.includes(f))
  .sort();

let existing = [];
if (fs.existsSync(NAV_JSON)) {
  try {
    existing = JSON.parse(fs.readFileSync(NAV_JSON, 'utf8'));
  } catch (e) {
    console.warn('⚠️ nav-links.json illisible, reconstruction complète.');
  }
}
const existingMap = new Map(existing.map(e => [e.href, e]));

const updated = htmlFiles.map(href => {
  if (existingMap.has(href)) return existingMap.get(href);
  console.log(`+ Nouvelle page détectée : ${href}`);
  return { href, icon: guessIcon(href), label: guessLabel(href) };
});

existing
  .filter(e => !htmlFiles.includes(e.href))
  .forEach(e => console.log(`- Page retirée (fichier supprimé) : ${e.href}`));

fs.writeFileSync(NAV_JSON, JSON.stringify(updated, null, 2) + '\n');
console.log('✅ nav-links.json mis à jour.');
