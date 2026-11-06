import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';

// Route to navigate when clicking NEXT from each step (indexed by current step)
const NEXT_ROUTES = [
  '/parametres',        // step 0 (welcome) → step 1
  '/ingredients',       // step 1 (Paramètres) → step 2
  '/fiches-techniques', // step 2 (Ingrédients) → step 3
  null,                 // step 3 (Fiches) → step 4 (btn always in sidebar)
  '/cartes',            // step 4 (Nouvelle fiche) → step 5
  '/menu-engineering',  // step 5 (Cartes) → step 6
  '/',                  // step 6 (Menu Engineering) → step 7
  null,                 // step 7 (Dashboard) → done
];

// Route to navigate when clicking PREV from each step (indexed by current step)
const PREV_ROUTES = [
  null,                 // step 0 — no prev
  null,                 // step 1 → welcome (no page)
  '/parametres',        // step 2 → step 1
  '/ingredients',       // step 3 → step 2
  '/fiches-techniques', // step 4 → step 3
  null,                 // step 5 → step 4 (sidebar btn, no page)
  '/cartes',            // step 6 → step 5
  '/menu-engineering',  // step 7 → step 6
];

// Même seuil que isMobile d'App.jsx (largeur < 768 px) : sur mobile, la fenêtre reste centrée sur l'écran.
const estMobile = () => window.innerWidth < 768;

// Portrait du chef à gauche du titre de chaque étape ciblée (chef-etape.webp, rond de 56 px).
const titreAvecLogo = title =>
  `<span style="display:inline-flex;align-items:center;gap:12px"><img src="/chef-etape.webp" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid #E5E0D8" />${title}</span>`;

// Popover config shared by all sidebar steps — à droite de l'élément du menu (centrée sur mobile),
// compteur « Étape N sur 7 » propre à l'étape, close button always visible.
const sidebarPopover = (numero, title, description, alignOrdinateur = 'start') => ({
  title: titreAvecLogo(title),
  description,
  side: estMobile() ? 'over' : 'right',
  align: estMobile() ? 'center' : alignOrdinateur,
  showProgress: true,
  progressText: `Étape ${numero} sur 7`,
  showButtons: ['next', 'previous', 'close'],
});

export function startTour(navigate) {
  let driverObj;

  function handleNext() {
    const idx = driverObj.getActiveIndex();
    const route = NEXT_ROUTES[idx] ?? null;
    if (route && navigate) {
      navigate(route);
      setTimeout(() => driverObj.moveNext(), 400);
    } else {
      driverObj.moveNext();
    }
  }

  function handlePrev() {
    const idx = driverObj.getActiveIndex();
    const route = PREV_ROUTES[idx] ?? null;
    if (route && navigate) {
      navigate(route);
      setTimeout(() => driverObj.movePrevious(), 400);
    } else {
      driverObj.movePrevious();
    }
  }

  driverObj = driver({
    animate: true,
    smoothScroll: true,
    allowClose: false,
    stagePadding: 4,
    overlayColor: 'rgba(0,0,0,0.75)',
    // Désactivé ici : driver.js 1.4.0 ignore un showProgress: false d'étape quand l'option globale est vraie.
    // Le compteur est activé dans sidebarPopover (étapes ciblées) ; l'accueil n'en a pas.
    showProgress: false,
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent',
    doneBtnText: 'Terminer',
    onNextClick: handleNext,
    onPrevClick: handlePrev,
    onDestroyed: () => {
      localStorage.setItem('onboarding_done', '1');
    },
    steps: [
      {
        // Étape d'accueil — centrée, sans spotlight sur un élément
        popover: {
          title: `<div style="text-align:center;padding-top:4px"><img src="/chef-accueil.webp" alt="" style="height:220px;width:auto;display:block;margin:0 auto 12px" /></div>`,
          description: `<div style="text-align:center"><p style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:#1C2B1E;margin:0 0 10px;line-height:1.3">Bienvenue sur CloverIA FicheTech</p><p style="font-family:'DM Sans',sans-serif;font-size:0.9rem;color:#6B7280;line-height:1.6;margin:0">Laissez-nous vous faire découvrir l'outil en 7 étapes.</p></div>`,
          showButtons: ['next', 'close'],
          nextBtnText: 'Commencer →',
          showProgress: false,
        },
      },
      {
        element: '[data-tour="nav-parametres"]',
        popover: sidebarPopover(
          1,
          'Paramètres',
          "Commencez ici : définissez votre food cost cible et votre TVA. Tout se calcule automatiquement à partir de ces valeurs.",
          'end' // bas du menu : fenêtre alignée sur le bas de l'élément, la flèche reste en face
        ),
      },
      {
        element: '[data-tour="nav-ingredients"]',
        popover: sidebarPopover(
          2,
          'Ingrédients',
          "Ajoutez vos ingrédients avec leurs prix, ou scannez directement une facture fournisseur. L'IA détecte les produits automatiquement."
        ),
      },
      {
        element: '[data-tour="nav-fiches"]',
        popover: sidebarPopover(
          3,
          'Fiches Techniques',
          "Vous avez des fiches papier ? Importez-les en photo ou PDF : l'IA extrait les ingrédients et les quantités."
        ),
      },
      {
        element: '[data-tour="btn-nouvelle-fiche"]',
        popover: sidebarPopover(
          4,
          'Nouvelle fiche',
          "Ou décrivez un plat avec vos mots. La fiche technique complète est générée en quelques secondes.",
          'end' // bouton en bas du menu : la fenêtre remonte au lieu de sortir de l'écran
        ),
      },
      {
        element: '[data-tour="nav-cartes"]',
        popover: sidebarPopover(
          5,
          'Cartes',
          "Assemblez vos fiches en cartes de restaurant. Visualisez le food cost par section et ajustez les prix de vente."
        ),
      },
      {
        element: '[data-tour="nav-menu-engineering"]',
        popover: sidebarPopover(
          6,
          'Menu Engineering',
          "Importez vos récapitulatifs de ventes caisse pour analyser la popularité et la rentabilité de chaque plat."
        ),
      },
      {
        element: '[data-tour="nav-dashboard"]',
        popover: sidebarPopover(
          7,
          'Dashboard',
          "Votre tableau de bord : suivez le food cost global et les actions prioritaires du jour en un coup d'œil."
        ),
      },
    ],
  });

  driverObj.drive();
}
