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
    allowClose: true,
    overlayColor: 'rgba(0,0,0,0.75)',
    showProgress: true,
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
          title: `<div style="text-align:center;padding-top:4px"><img src="/logo.png" style="width:200px;height:auto;display:block;margin:0 auto 16px;object-fit:contain" /></div>`,
          description: `<div style="text-align:center"><p style="font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;color:#1C2B1E;margin:0 0 10px;line-height:1.3">Bienvenue sur CloverIA FicheTech</p><p style="font-family:'DM Sans',sans-serif;font-size:0.9rem;color:#6B7280;line-height:1.6;margin:0">Laissez-nous vous faire découvrir l'outil en 7 étapes.</p></div>`,
          showButtons: ['next', 'close'],
          nextBtnText: 'Commencer →',
          showProgress: false,
        },
      },
      {
        element: '[data-tour="nav-parametres"]',
        popover: {
          title: 'Paramètres',
          description: "Commencez ici — définissez votre food cost cible et votre TVA. Tout se calcule automatiquement à partir de ces valeurs.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="nav-ingredients"]',
        popover: {
          title: 'Ingrédients',
          description: "Ajoutez vos ingrédients avec leurs prix, ou scannez directement une facture fournisseur — l'IA détecte les produits automatiquement.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="nav-fiches"]',
        popover: {
          title: 'Fiches Techniques',
          description: "Vous avez des fiches papier ? Importez-les en photo ou PDF — l'IA extrait les ingrédients et les quantités.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="btn-nouvelle-fiche"]',
        popover: {
          title: 'Nouvelle fiche',
          description: "Ou décrivez un plat en langage naturel — l'IA génère la fiche technique complète en quelques secondes.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="nav-cartes"]',
        popover: {
          title: 'Cartes',
          description: "Assemblez vos fiches en cartes de restaurant. Visualisez le food cost par section et ajustez les prix de vente.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="nav-menu-engineering"]',
        popover: {
          title: 'Menu Engineering',
          description: "Importez vos récapitulatifs de ventes caisse pour analyser la popularité et la rentabilité de chaque plat.",
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '[data-tour="nav-dashboard"]',
        popover: {
          title: 'Dashboard',
          description: "Votre tableau de bord — suivez le food cost global et les actions prioritaires du jour en un coup d'œil.",
          side: 'right',
          align: 'center',
        },
      },
    ],
  });

  driverObj.drive();
}
