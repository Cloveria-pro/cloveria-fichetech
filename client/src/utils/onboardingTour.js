import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function startTour() {
  const driverObj = driver({
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayColor: 'rgba(0,0,0,0.6)',
    showProgress: true,
    nextBtnText: 'Suivant',
    prevBtnText: 'Précédent',
    doneBtnText: 'Terminer',
    onDestroyed: () => {
      localStorage.setItem('onboarding_done', '1');
    },
    steps: [
      {
        element: '[data-tour="nav-parametres"]',
        popover: {
          title: 'Paramètres',
          description: "Commencez ici — définissez votre food cost cible et votre TVA. Tout se calcule automatiquement à partir de ces valeurs.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-ingredients"]',
        popover: {
          title: 'Ingrédients',
          description: "Ajoutez vos ingrédients avec leurs prix, ou scannez directement une facture fournisseur — l'IA détecte les produits automatiquement.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-fiches"]',
        popover: {
          title: 'Fiches Techniques — Importer',
          description: "Vous avez des fiches papier ? Importez-les en photo ou PDF — l'IA extrait les ingrédients et les quantités.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="btn-nouvelle-fiche"]',
        popover: {
          title: 'Nouvelle fiche',
          description: "Ou décrivez un plat en langage naturel — l'IA génère la fiche technique complète en quelques secondes.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-cartes"]',
        popover: {
          title: 'Cartes',
          description: "Assemblez vos fiches en cartes de restaurant. Visualisez le food cost par section et ajustez les prix de vente.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-menu-engineering"]',
        popover: {
          title: 'Menu Engineering',
          description: "Importez vos récapitulatifs de ventes caisse pour analyser la popularité et la rentabilité de chaque plat.",
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="nav-dashboard"]',
        popover: {
          title: 'Dashboard',
          description: "Votre tableau de bord — suivez le food cost global et les actions prioritaires du jour en un coup d'œil.",
          side: 'right',
          align: 'start',
        },
      },
    ],
  });

  driverObj.drive();
}
