import { useEffect } from 'react';

const MESSAGE = 'Des modifications ne sont pas enregistrées. Quitter quand même ?';

// Tant que `actif` est vrai, avertit avant de quitter la page : fermeture ou actualisation de l'onglet
// (fenêtre du navigateur) et clic sur un lien interne (confirmation). Ne couvre pas le bouton retour
// du navigateur, les navigations faites par le code ni la déconnexion.
export function useAvertirAvantDepart(actif) {
  useEffect(() => {
    if (!actif) return;

    function avantDechargement(e) {
      e.preventDefault();
      e.returnValue = '';
    }

    // Phase de capture sur le document : passe avant le onClick des <Link> de React Router.
    function clic(e) {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const lien = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!lien || lien.hasAttribute('download')) return;
      const cible = lien.getAttribute('target');
      if (cible && cible !== '_self') return;
      const url = new URL(lien.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', avantDechargement);
    document.addEventListener('click', clic, true);
    return () => {
      window.removeEventListener('beforeunload', avantDechargement);
      document.removeEventListener('click', clic, true);
    };
  }, [actif]);
}
