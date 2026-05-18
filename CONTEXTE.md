# CloverIA FicheTech — Contexte du projet

## Stack technique
- Frontend : React + Vite + Tailwind CSS (dossier /client)
- Backend : Node.js + Express (dossier /server)
- Base de données : fichiers JSON dans /server/data (recettes.json, ingredients.json, cartes.json, users.json)
- Auth : JWT + bcrypt
- IA : API Anthropic claude-sonnet-4-20250514
- Export PDF : puppeteer
- Graphiques : recharts

## Fonctionnalités implémentées
- Authentification complète (login/register/JWT) — isolation des données par utilisateur
- Dashboard avec food cost moyen, fiches rentables vs à retravailler, derniers mouvements
- Fiches techniques : création via IA (description libre) ou manuelle, calcul coût matière HT/TTC, food cost %, prix de vente suggéré, ajustement portions en temps réel, graphique donut répartition des coûts, allergènes réglementaires, étapes numérotées, export PDF
- Page Ingrédients : base de prix avec TVA par ingrédient, tri des colonnes, import de facture fournisseur par photo (IA vision)
- Constructeur de cartes : deux panneaux, sections par catégorie, food cost par plat
- Paramètres : nom établissement, food cost cible (slider), TVA par défaut
- Autocomplete ingrédients dans les fiches techniques
- Design premium : sidebar vert foncé #1C2B1E, accent or #C9A84C, fond crème #F8F6F1, logo CloverIA, police Inter + Playfair Display

## Catégories de fiches
Amuse-bouche / Entrée / Plat viande / Plat poisson / Plat végétarien / Dessert / Autre

## Bugs connus restants
- Food cost pas toujours identique entre la liste et la fiche détail (formule à unifier)
- Page "Nouvelle fiche" parfois page blanche (bug routing /nouvelle vs /:id)
- Conversion d'unités cuillères à café/soupe vers kg/L approximative

## Déploiement en cours
- Code sur GitHub : github.com/Cloveria-pro/cloveria-fichetech
- Backend : en cours de configuration sur Render (Web Service, repo sélectionné)
- Frontend : à déployer sur Vercel après Render
- Variables d'environnement à configurer sur Render : ANTHROPIC_API_KEY, JWT_SECRET, PORT

## Prochaines étapes
1. Finir configuration Render (Root Directory: server, Build: npm install, Start: node index.js)
2. Ajouter les env vars sur Render
3. Déployer frontend sur Vercel (Root Directory: client, VITE_API_URL = URL Render)
4. Tester l'app en ligne
5. Ajouter Stripe pour les paiements
6. Migrer de JSON vers Supabase PostgreSQL (V2)
7. Donner accès à l'ami chef pour les tests

## Compte démo
email: demo@cloveria.fr
password: Demo1234!
