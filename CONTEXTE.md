# CloverIA FicheTech — Contexte projet

> Dernière mise à jour : 2026-05-27

---

## Vision produit

CloverIA FicheTech est un **assistant chef hybride** pour restaurateurs indépendants. L'application couvre :
- **Fiches techniques** : création par IA (description libre → fiche structurée), calcul food cost temps réel, export PDF
- **Food cost** : suivi coût matière par portion, food cost cible paramétrable, prix de vente suggéré
- **Organisation quotidienne** : agenda intégré, rappels/événements/notes, widget J0→J+2 sur le dashboard, anecdote du jour
- **CRM interne** : page admin protégée, vue complète des inscrits, pilotage commercial

---

## URLs de déploiement

| Environnement | URL |
|---|---|
| **Backend (Render)** | `https://cloveria-fichetech.onrender.com` |
| **API base** | `https://cloveria-fichetech.onrender.com/api` |
| **Frontend app (Vercel)** | `https://app.cloveria-pro.fr` — configuré via `client/vercel.json` |
| **Landing page (Vercel)** | `https://cloveria-pro.fr` — repo séparé `cloveria-landing` |
| **Health check** | `GET /api/health` → `{ "status": "ok" }` |

**Compte démo** : `demo@cloveria.fr`  
Créé automatiquement au démarrage du serveur si absent (`user_id: "demo"`). Champs `emailVerified: true` et `onboardingComplete: true` forcés à chaque démarrage via `db.js`.

---

## Stack technique

### Backend (`server/`)
- Node.js 20+, ES modules (`"type": "module"`)
- Express 4.18
- **MongoDB Atlas M0**, driver natif `mongodb` v6 (pas Mongoose), base : `cloveria`
- Auth : `jsonwebtoken` (JWT 7j) + `bcryptjs`, `req.userId` injecté par middleware
- IA : `@anthropic-ai/sdk`, modèle `claude-sonnet-4-6`
- Upload : `multer` (mémoire, 10 Mo max, JPEG/PNG/WebP/PDF)
- IDs : `uuid` v4 pour toutes les entités
- Emails : **Resend uniquement** (`resend` package) — nodemailer non utilisé
- Cron : `node-cron` (quotidien 9h00 — relances essai + lifecycle)
- Dev : `node --watch index.js`

### Frontend (`client/`)
- React 18, Vite 5
- React Router v6
- Recharts 3 (graphiques sparkline historique prix, Menu Engineering)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (drag & drop)
- `html2pdf.js` (export PDF fiches techniques)
- `driver.js` (product tour onboarding)
- Build : `vite build` avec code splitting manuel (vendor-react, vendor-charts, vendor-dnd, vendor-pdf, vendor-tour) | Dev : `vite`

### Lancer en local
```bash
npm run install:all   # installe server + client
npm run dev           # lance les deux en parallèle (concurrently)
```

---

## Variables d'environnement (serveur)

| Variable | Obligatoire | Description |
|---|---|---|
| `MONGODB_URI` | Oui | URI MongoDB Atlas |
| `ANTHROPIC_API_KEY` | Oui | Clé API Anthropic |
| `JWT_SECRET` | Non | Défaut : `cloveria-fichetech-secret-2026` |
| `PORT` | Non | Défaut : `3001` |
| `CORS_ORIGIN` | Non | Origines autorisées, séparées par virgule (défaut : `*`) |
| `RESEND_API_KEY` | Oui (prod) | Clé API Resend — emails transactionnels et relances |
| `APP_URL` | Non | URL de l'app (défaut : `https://app.cloveria-pro.fr`) — utilisé dans les liens des emails |
| `ADMIN_SECRET` | Oui (prod) | Clé secrète pour l'accès à la route `/api/admin` (header `X-Admin-Key`) |
| `INTERNAL_NOTIFICATION_EMAIL` | Non | Email interne pour notifications nouveau client / suppression compte (défaut : `contact@cloveria.fr`) |
| `STRIPE_SECRET_KEY` | Oui (prod) | Clé secrète Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Oui (prod) | Clé publique Stripe (exposée côté client via l'API) |
| `STRIPE_PRICE_ID` | Oui (prod) | ID du prix Stripe pour l'abonnement 39 €/mois |
| `STRIPE_WEBHOOK_SECRET` | Oui (prod) | Secret de signature des webhooks Stripe (`whsec_...`) |
| ~~`EMAIL_USER`~~ | — | Obsolète — remplacé par Resend |
| ~~`EMAIL_PASS`~~ | — | Obsolète — remplacé par Resend |

---

## Structure des fichiers

```
cloveria-fichetech/
├── package.json                    # scripts dev + install:all (concurrently)
├── CONTEXTE.md                     # ce fichier
├── server/
│   ├── index.js                    # point d'entrée Express, montage routes, crons quotidiens
│   ├── db.js                       # singleton getDb() + seed automatique + fix compte démo
│   ├── env.js                      # chargement dotenv
│   ├── middleware/
│   │   ├── auth.js                 # vérifie JWT → req.userId + updateLastSeen (throttle 5min)
│   │   └── checkAccess.js          # vérifie trial/active/lifetime → 403 trial_expired si expiré
│   ├── routes/
│   │   ├── admin.js                # CRM admin (X-Admin-Key) — users, disable, archive, lifetime
│   │   ├── auth.js                 # register, login, verify-email, forgot/reset-password, profil
│   │   ├── recettes.js             # CRUD + PUT /:id/prix (sync cascade)
│   │   ├── ingredients.js          # CRUD
│   │   ├── cartes.js               # CRUD
│   │   ├── parametres.js           # GET/PUT (1 doc par user)
│   │   ├── ia.js                   # /structurer, /description-commerciale, /analyser-fiche, /analyser-ventes
│   │   ├── aliases.js              # GET/POST (upsert) — mapping noms ingrédients
│   │   ├── historique_prix.js      # GET/POST/DELETE — horodatage ISO 8601 complet
│   │   ├── sous_recettes.js        # CRUD sous-recettes (préparations de base réutilisables)
│   │   ├── ventes.js               # GET/POST/DELETE — ventes pour menu engineering
│   │   ├── stripe.js               # /checkout, /portal, /webhook
│   │   ├── documents.js            # GET/POST/DELETE — archive factures fournisseurs
│   │   ├── agenda.js               # CRUD rappels/événements/notes
│   │   └── onboarding.js           # inject-example / skip-example (pack démarrage)
│   ├── emails/
│   │   ├── verification.js         # envoyerConfirmationEmail, envoyerResetEmail (Resend)
│   │   ├── relances.js             # envoyerRelance (essai), envoyerLifecycle (onboarding)
│   │   └── notifications.js        # notifierNouveauClient, notifierSuppressionCompte (interne)
│   ├── scripts/
│   │   └── change-demo-password.js # utilitaire ponctuel reset mdp démo
│   └── data/                       # JSON de seed (insérés si collection vide au démarrage)
│       ├── users.json, ingredients.json, recettes.json
│       ├── cartes.json, parametres.json, historique_prix.json
│       └── example_pack.json       # pack démarrage : ingrédients + fiches + sous-recettes + carte
└── client/
    ├── vercel.json
    └── src/
        ├── main.jsx                # ReactDOM + BrowserRouter + intercepteur fetch global (401)
        ├── App.jsx                 # Layout sidebar + routes protégées + gates (email, onboarding, trial)
        ├── api.js                  # Toutes les fonctions fetch centralisées
        ├── utils.js                # coutIng, coutPortionHT/TTC, foodCostPct, prixSuggereTTC
        ├── conversions.js          # Table unités → base (kg, L, pièce)
        ├── pages/
        │   ├── Admin.jsx               # CRM admin (accès direct /admin, sans sidebar)
        │   ├── Dashboard.jsx           # KPIs globaux + food cost moyen + widget agenda + anecdote
        │   ├── Recettes.jsx            # Liste fiches techniques (+ duplication)
        │   ├── NouvelleRecette.jsx     # Création par IA (description libre)
        │   ├── FicheTechnique.jsx      # Détail + édition + calculs + export PDF
        │   ├── Ingredients.jsx         # CRUD + historique prix + comparaison fournisseurs + scan caméra mobile
        │   ├── Cartes.jsx              # Éditeur cartes (EditeurCarte) + vue consultant (VueCarte)
        │   ├── SousRecettes.jsx        # CRUD sous-recettes (préparations de base)
        │   ├── MenuEngineering.jsx     # Analyse ventes + matrice BCG (Stars/Plowhorses/Puzzles/Dogs)
        │   ├── Organisation.jsx        # Agenda, rappels, événements, notes
        │   ├── Documents.jsx           # Archive factures fournisseurs
        │   ├── Parametres.jsx          # Food cost cible, TVA, nom établissement
        │   ├── Abonnement.jsx          # Page paywall fin d'essai → Stripe Checkout (39 €/mois)
        │   ├── AbonnementConfirme.jsx  # Page succès post-paiement Stripe
        │   ├── Onboarding.jsx          # Onboarding inscription 3 écrans (déclencheur post-register)
        │   ├── Aide.jsx                # FAQ + liens vers sections + documents légaux
        │   ├── Login.jsx / Register.jsx
        │   ├── ForgotPassword.jsx      # Demande de réinitialisation mot de passe
        │   ├── ResetPassword.jsx       # Saisie nouveau mot de passe (depuis lien email)
        │   ├── VerifyEmail.jsx         # Confirmation email (depuis lien email)
        │   ├── CGU.jsx                 # Conditions Générales d'Utilisation (12 articles, public)
        │   ├── PolitiqueConfidentialite.jsx # Politique RGPD (11 sections, public)
        │   └── MentionsLegales.jsx     # Mentions légales (public)
        ├── hooks/
        │   └── useWindowWidth.js       # Hook responsive → isMobile (< 768px)
        ├── utils/
        │   ├── onboardingTour.js       # Product tour driver.js (7 étapes)
        │   └── tour.css
        ├── data/
        │   └── anecdotes.js            # Anecdotes culinaires pour widget dashboard
        └── components/
            ├── EtapesEditor.jsx        # Éditeur étapes avec DnD + insert gap
            ├── ImportFicheModal.jsx    # Import fiche depuis image/PDF (IA)
            └── IngredientAutocomplete.jsx
```

---

## Modèle de données MongoDB

### `users`
```json
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "etablissement": "string",
  "prenom": "string",
  "plan": "free",
  "subscriptionStatus": "trial|active|lifetime",
  "trialStartDate": "ISO8601",
  "trialEndDate": "ISO8601",
  "emailVerified": true,
  "emailVerifiedAt": "ISO8601",
  "emailVerificationToken": "string",
  "emailVerificationExpiry": "ISO8601",
  "onboardingComplete": true,
  "examplePackChoice": "example|skip|null",
  "typeEtablissement": "string",
  "role": "string",
  "objectifs": ["string"],
  "nbPlats": "string",
  "foodCostCible": 30,
  "sourceDecouverte": "string",
  "betaAccess": false,
  "disabled": false,
  "deleted": false,
  "deletedAt": "ISO8601|null",
  "lastLoginAt": "ISO8601",
  "lastSeenAt": "ISO8601",
  "emailsEnvoyes": ["j9", "j12", "j14"],
  "lifecycleEmailsSent": ["lifecycle_j4"],
  "stripeCustomerId": "string|null",
  "stripeSubscriptionId": "string|null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

> **Champ clé** : `subscriptionStatus` — valeurs possibles : `trial` (essai en cours), `active` (abonné Stripe), `lifetime` (accès à vie accordé manuellement via CRM admin).  
> **Champ clé** : `trialEndDate` (pas `trialEndsAt`) — c'est le champ réel en base, référence dans tous les middlewares et routes.

### `recettes`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nom": "string",
  "categorie": "Amuse-bouche|Entrée|Plat viande|Plat poisson|Plat végétarien|Dessert|Autre",
  "portions": 4,
  "tempsPreparation": 20,
  "tempsCuisson": 15,
  "description": "string",
  "description_commerciale": "string",
  "allergenes": ["gluten", "lait"],
  "ingredients": [{ "nom", "quantite", "unite", "prixUnitaire", "tva" }],
  "etapes": ["string"],
  "prixVentePratiqueTTC": 18.50,
  "_source": "example|undefined",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

> `_source: 'example'` identifie les fiches injectées par le pack démarrage — exclues des compteurs CRM (`{ _source: { $ne: 'example' } }`).

### `cartes`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nom": "string",
  "saison": "string",
  "sections": [
    { "titre": "Entrées", "plats": [{ "recetteId": "uuid", "nom": "string", "prixVente": 12.00 }] }
  ],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `ingredients`
```json
{
  "id": "uuid",
  "user_id": "uuid|demo",
  "nom": "string",
  "prixUnitaire": 8.50,
  "unite": "kg",
  "fournisseur": "string",
  "updatedAt": "ISO8601"
}
```

### `historique_prix`
```json
{
  "user_id": "uuid",
  "nom": "string",
  "prix": 8.50,
  "unite": "kg",
  "fournisseur": "string",
  "date": "ISO8601 complet (secondes incluses)"
}
```

### `parametres`
```json
{ "user_id": "uuid", "foodCostCible": 30, "tva": 10, "etablissement": "string" }
```

### `aliases`
```json
{ "from": "crevettes roses", "to": "crevette" }
```

### `agenda`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "titre": "string",
  "date": "ISO8601",
  "type": "rappel|evenement|note",
  "note": "string"
}
```

---

## Routes API

Toutes les routes sauf `/api/auth/*`, `/api/admin/*` et `/api/health` requièrent `Authorization: Bearer <token>`.  
Les routes `/api/admin/*` requièrent le header `X-Admin-Key`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription → JWT + envoi email confirmation |
| POST | `/api/auth/login` | Connexion → JWT + mise à jour `lastLoginAt` |
| GET | `/api/auth/verify-email?token=` | Confirmation email (lien depuis email) |
| POST | `/api/auth/resend-verification` | Renvoie l'email de confirmation (throttle 60s) |
| POST | `/api/auth/forgot-password` | Envoie lien de réinitialisation (rate limit 3/15min) |
| POST | `/api/auth/reset-password` | Réinitialise le mot de passe depuis token |
| GET | `/api/auth/profil` | Lecture profil utilisateur |
| PUT | `/api/auth/profil` | Mise à jour profil (onboarding inclus) |
| DELETE | `/api/auth/account` | Suppression compte (soft delete, mot de passe requis) |
| GET | `/api/health` | Health check public |
| GET | `/api/admin/users` | Liste enrichie tous les users (CRM) |
| POST | `/api/admin/reset-user-password` | Reset mot de passe user par email |
| PATCH | `/api/admin/users/:id/disable` | Toggle activation/désactivation compte |
| PATCH | `/api/admin/users/:id/lifetime` | Accorde accès à vie (`subscriptionStatus: 'lifetime'`) |
| PATCH | `/api/admin/users/:id/remove-lifetime` | Révoque accès à vie → repasse en `trial` (trialEndDate = createdAt + 14j) |
| PATCH | `/api/admin/users/:id/restore` | Restaure un compte archivé |
| DELETE | `/api/admin/users/:id` | Archive compte (soft delete) + notification interne |
| DELETE | `/api/admin/test-accounts/:id` | Suppression définitive compte test |
| DELETE | `/api/admin/test-accounts` | Suppression définitive tous les comptes test |
| GET | `/api/recettes` | Liste + enrichissement prixUnitaire |
| GET | `/api/recettes/:id` | Détail + enrichissement |
| POST | `/api/recettes` | Création |
| PUT | `/api/recettes/:id` | Mise à jour complète |
| **PUT** | **`/api/recettes/:id/prix`** | **Met à jour `prixVentePratiqueTTC` ET synchronise dans TOUTES les cartes** |
| DELETE | `/api/recettes/:id` | Suppression |
| GET/POST/PUT/DELETE | `/api/ingredients/:id?` | CRUD ingrédients |
| GET/POST/PUT/DELETE | `/api/cartes/:id?` | CRUD cartes |
| GET/PUT | `/api/parametres` | Paramètres utilisateur |
| POST | `/api/ia/structurer` | Description libre → fiche complète (JSON) |
| POST | `/api/ia/description-commerciale` | Génère `description_commerciale` pour fiche existante |
| POST | `/api/ia/analyser-fiche` | Image/PDF fiche → JSON structuré (multipart) |
| POST | `/api/ia/analyser-ventes` | Fichier ventes → données menu engineering (multipart) |
| GET/POST/DELETE | `/api/historique-prix` | Historique prix ingrédients |
| GET/POST | `/api/aliases` | Mapping noms ingrédients (upsert) |
| GET/POST/PUT/DELETE | `/api/sous-recettes/:id?` | CRUD sous-recettes |
| GET/POST/DELETE | `/api/ventes` | Ventes par plat (pour menu engineering) |
| GET/POST/DELETE | `/api/documents/:id?` | Archive factures fournisseurs |
| GET/POST/PUT/DELETE | `/api/agenda/:id?` | CRUD rappels/événements/notes |
| POST | `/api/onboarding/inject-example` | Injecte le pack démarrage exemple |
| POST | `/api/onboarding/skip-example` | Passe le pack exemple |
| POST | `/api/stripe/create-checkout-session` | Crée session Stripe Checkout |
| POST | `/api/stripe/webhook` | Webhook Stripe (activation/désactivation) |

---

## Fonctionnalités implémentées

### Authentification
- Inscription / connexion email + mot de passe (bcrypt round 10, JWT 7j)
- **Confirmation email obligatoire** : lien envoyé à l'inscription via Resend, valable 24h. L'app bloque sur `/verify-email` tant que l'email n'est pas confirmé.
- **Mot de passe oublié** : lien de réinitialisation envoyé par email (token SHA-256, valable 1h, rate limit 3 demandes/15min par IP)
- **Soft delete / archivage** : suppression = `deleted: true + disabled: true` sur le document user. Les comptes archivés ne peuvent plus se connecter. Restauration possible depuis le CRM admin.
- **Accès à vie** : `subscriptionStatus: 'lifetime'` — accordé manuellement depuis le CRM admin. Ces utilisateurs ne sont jamais bloqués par `checkAccess`, ne voient jamais la page `/abonnement`.
- Token en `localStorage`, headers `Authorization: Bearer` sur tous les appels
- Intercepteur `fetch` global dans `main.jsx` : 401 → déconnexion automatique + redirect `/login`
- `lastLoginAt` mis à jour à chaque connexion réussie (non-bloquant)
- `lastSeenAt` mis à jour via middleware auth sur chaque requête (throttle 5 min, 1 seule op MongoDB)
- Isolation stricte par `user_id` — les ingrédients `demo` sont visibles par tous les utilisateurs

### CRM Admin

Page `/admin` — accès direct sans sidebar, protégée par header `X-Admin-Key` (variable `ADMIN_SECRET`).

**Tableau CRM :**
- Colonnes : Email, Établissement, Inscription, Email vérifié, Onboarding, Fiches/Cartes*, Abonnement, Statut commercial, Essai, Dernière connexion, 1ère fiche, Dernière activité
- Toutes les colonnes sont triables (clic, toggle asc/desc, nulls last)
- Filtres : statut compte (non archivés/archivés/tous), statut commercial, email vérifié, abonnement, recherche texte
- Emoji 🎁 devant l'email des utilisateurs avec accès à vie
- Compteurs de fiches/ingrédients/cartes excluent le contenu du pack exemple (`_source: 'example'`)

**Statut commercial** calculé côté serveur :
- `client engagé` → `subscriptionStatus === 'active'` ou `'lifetime'`
- `activé` → email vérifié + au moins 1 fiche réelle, ou compte démo
- `à relancer` → email vérifié + 0 fiches
- `lead` → email non vérifié

**Fiche client (drawer latéral) :**
- Ouvre au clic sur une ligne, panneau 400px fixe à droite
- Sections : Compte (email, prénom, inscription, email vérifié, onboarding, statut, abonnement), Profil onboarding (type établissement, rôle, objectifs, nb plats, food cost cible, source découverte, pack exemple), Activité (fiches, ingrédients, cartes, 1ère fiche, dernière connexion, dernière activité)
- Bouton **🎁 Offrir accès à vie** (jaune) → appelle `PATCH /admin/users/:id/lifetime` avec confirmation
- Bouton **🎁 Révoquer accès à vie** (rouge) si déjà lifetime → appelle `PATCH /admin/users/:id/remove-lifetime`

**Actions par ligne :**
- Désactiver / Réactiver compte (`PATCH /disable`)
- Archiver compte (`DELETE /users/:id`) avec confirmation email saisi
- Restaurer compte archivé (`PATCH /restore`)
- Supprimer définitivement (comptes test uniquement)
- Suppression en masse des comptes test

### Emails (Resend)

Tous les emails sont envoyés via **Resend** (`from: CloverIA <contact@cloveria.fr>`). Nodemailer n'est plus utilisé.

**Emails transactionnels :**
| Email | Déclencheur |
|---|---|
| Confirmation inscription | À l'inscription (`/auth/register`) |
| Réinitialisation mot de passe | Sur demande (`/auth/forgot-password`) |
| Notification interne nouveau client | Quand un user vérifie son email |
| Notification interne suppression | Quand un compte est archivé (admin ou user) |

**Relances essai (cron quotidien 9h00) :**
| Clé | Timing | Condition |
|---|---|---|
| `j9` | J+9 depuis début essai | subscriptionStatus ≠ active |
| `j12` | J+12 | idem |
| `j14` | J+14 (fin d'essai) | idem |
| `post2` | J+2 après expiration | idem |
| `post7` | J+7 après expiration | idem |
| `post15` | J+15 après expiration | idem |
| `post40` | J+40 après expiration | idem |

Anti-doublon : chaque clé envoyée est pushée dans `user.emailsEnvoyes`.

**Emails lifecycle (cron quotidien 9h00) :**
| Clé | Timing | Condition |
|---|---|---|
| `lifecycle_j4` | J+4 depuis inscription | onboardingComplete=true ET 0 fiche réelle |
| `lifecycle_j8` | J+8 depuis inscription | 0 fiche réelle |
| `lifecycle_onboarding_j4` | J+4 depuis vérification email | onboardingComplete=false |

Anti-doublon : chaque clé envoyée est pushée dans `user.lifecycleEmailsSent`.

### Fiches techniques
- **Création IA** : description libre en langage naturel → fiche complète (ingrédients avec quantités, étapes, temps de préparation/cuisson calculés analytiquement, catégorie, allergènes, description commerciale)
- **Calcul food cost temps réel** : coût HT et TTC par portion, taux de coût matière (%), coefficient multiplicateur, marge brute par couvert
- **Prix de vente suggéré** depuis food cost cible des paramètres
- **Échelle dynamique** : ajuster le nombre de couverts recalcule quantités et coûts
- **Export PDF** : window.open HTML inline (donut SVG coûts, tableau ingrédients, analyse financière, allergènes, étapes)
- Ajout / retrait d'une fiche dans une carte directement depuis la fiche
- **Description commerciale** : bouton "Générer" → IA, ou saisie manuelle. Affichée dans VueCarte et dans l'export Argumentation.

### Allergènes
- 14 allergènes réglementaires (Règlement UE n°1169/2011)
- **Détection automatique** depuis le texte des étapes de préparation : ~60 mots-clés, insensible à la casse et aux accents, word-boundary `(?<![a-z])..(?![a-z])`. Les allergènes détectés sont ajoutés (union) aux allergènes existants — jamais retirés automatiquement.
- **Badges cliquables** en bas de la fiche (mode lecture ET édition) : toggle + sauvegarde immédiate MongoDB.
- Actif = badge ambre `#FEF9EC / #92400e` | Inactif = badge gris

### Ingrédients
- CRUD avec prix unitaire par unité de base (€/kg, €/L, €/pièce)
- **Historique des prix** : graphique sparkline recharts, horodatage ISO 8601 complet
- **Comparaison fournisseurs** par ingrédient
- **Enrichissement automatique** : `prixUnitaire` des ingrédients de recette est résolu depuis le catalog (matching normalisé accents)
- **Système d'aliases** : association mémorisée entre noms différents d'un même ingrédient

### Cartes
- CRUD cartes avec sections par catégorie
- **Éditeur** (EditeurCarte) : drag & drop sections (@dnd-kit), ajout/suppression plats, recherche fiches
- **Vue consultant** (VueCarte) deux panneaux :
  - Gauche : menu visuel, accordion par section, prix TTC éditables inline (label "Prix TTC"), badges food cost
  - Droite : KPIs globaux, food cost par section, 10 recommandations automatiques
- **Sync prix bidirectionnelle** : modification dans VueCarte ou dans FicheTechnique propage dans les deux sens via `PUT /api/recettes/:id/prix`
- Auto-save debounced 500 ms
- **Export Allergènes** : ouvre Format A (tableau paysage serveurs, 14 colonnes) dans nouvel onglet
- **Export Argumentation** : document A4 par catégorie, nom en gras + `description_commerciale`
- Aucun `window.print()` automatique — le chef choisit d'imprimer ou non

### Sous-recettes
- CRUD de préparations de base (fond de veau, pâte sablée, sauce…) avec coût calculé
- Réutilisables comme ingrédient dans n'importe quelle fiche technique
- Même modèle de calcul que les recettes (`coutPortionHT`)

### Menu Engineering
- Import des ventes (nom plat + quantité vendue sur une période)
- Matrice BCG automatique : **Stars** (marge haute + ventes hautes), **Plowhorses** (marge faible + ventes hautes), **Puzzles** (marge haute + ventes faibles), **Dogs** (marge faible + ventes faibles)
- Recommandations automatiques par catégorie (garder, valoriser, ajuster prix, retirer)

### Organisation / Calendrier
- Module accessible depuis la sidebar
- Gestion de rappels, événements et notes avec date
- **Widget dashboard** : affiche les éléments d'agenda du jour (J0) jusqu'à J+2
- **Anecdote du jour** : citation ou fait culinaire affiché sur le dashboard (données statiques `anecdotes.js`)

### Onboarding & Product Tour
- **Onboarding inscription** : 3 écrans au premier login (bienvenue → type établissement → objectif)
- **Product tour driver.js** : visite guidée 7 étapes déclenchée post-onboarding, relançable depuis Aide → "Revoir la démonstration"
- `localStorage.onboarding_done` contrôle le déclenchement

### Pack démarrage exemple
Proposé à la fin de l'onboarding (choix UX : "Explorer avec des exemples" ou "Partir de zéro").  
Si accepté, injecte via `POST /api/onboarding/inject-example` :
- ~15 ingrédients (À vérifier — nombre exact dans `data/example_pack.json`)
- ~3 fiches techniques (À vérifier)
- ~2 sous-recettes (À vérifier)
- ~1 carte (À vérifier)
- Éléments d'organisation / agenda (À vérifier)

Tous les éléments injectés ont `_source: 'example'` pour être exclus des compteurs CRM et des critères d'activation.  
Choix mémorisé dans `user.examplePackChoice` (`'example'` ou `'skip'`).

### Abonnement Stripe
- Essai gratuit 14 jours dès l'inscription (sans carte bancaire)
- Abonnement mensuel 39 €/mois sans engagement, via Stripe Checkout
- Page `/abonnement` (paywall) affichée automatiquement après expiration de l'essai (event `trial_expired` dispatché par `api.js` sur réponse 403)
- Page `/abonnement-confirme` (succès post-paiement)
- Webhook Stripe gère activation/désactivation du compte
- Champ `trialEndDate` + `subscriptionStatus` sur le document `users`
- `subscriptionStatus: 'lifetime'` → accès permanent, jamais bloqué par `checkAccess`

### Documents
- Archive des factures fournisseurs uploadées (JPEG/PNG/PDF)
- Lié au scan facture de la page Ingrédients

### Landing page
- Fichier HTML statique dans `landing/index.html`, repo séparé `cloveria-landing`
- Déployée sur `cloveria-pro.fr` (Vercel)
- Sections : Hero, Reassurance, Features (4 blocs alternés), How it works, Pricing, FAQ, Footer
- Lightbox images, FAQ accordion, fade-up animations

### SEO (À vérifier — non confirmé depuis le code)
- Bing Webmaster Tools : vérifié
- `sitemap.xml` : présent
- `robots.txt` : présent
- IndexNow : configuré
- Google Search Console : en attente validation DNS
- Meta tags optimisés sur la landing

### Légal & Conformité RGPD
- **CGU** : 12 articles (Objet → Droit applicable), accessible sans login sur `/cgu`
- **Politique de confidentialité** : 11 sections RGPD, données obligatoires/facultatives labellisées, sous-traitants, transferts hors UE, cookies, droits exercice — accessible sans login sur `/politique-confidentialite`
- Case à cocher CGU obligatoire à l'inscription
- Liens CGU/Politique dans : Login, Register, Abonnement, Aide, footer landing

### Autres fonctionnalités
- **Duplication de fiche technique** : depuis la liste Recettes
- **Scan caméra mobile** : capture photo facture directement depuis l'appareil photo du téléphone
- **Responsive mobile** : `useWindowWidth` hook, `isMobile` dans toutes les pages, sidebar hamburger
- **Page Aide** : FAQ, raccourcis vers sections principales, product tour, documents légaux

### IA — qualité des prompts
- **Temps de cuisson** : calculés analytiquement ingrédient par ingrédient. Si aucun ingrédient n'est soumis à chaleur directe, `tempsCuisson = 0`.
- **description_commerciale** : ton naturel d'ami qui recommande, 2-3 phrases, goûts/textures. Mots bannis : sublimé, nappé, réalisé, élaboré, déglacer, thermoplongeur, bain-marie, blanchir, monter, infuser, chiffonnade + températures + temps de cuisson.

### Interface
- Sidebar fixe desktop (224px), hamburger mobile avec overlay
- Responsive : < 768px mobile, 768-1024px tablet, > 1024px desktop
- Police : Playfair Display (titres) + DM Sans (corps)
- Couleurs : vert `#2D6A4F`, or `#C9A84C`, fond `#F8F6F1`, texte `#1C2B1E`

---

## Conventions de calcul

```
coutIng(ing) = ing.quantite × CONVERSIONS[ing.unite] × ing.prixUnitaire
  masse  : prixUnitaire en €/kg  — g=0.001, kg=1
  volume : prixUnitaire en €/L   — ml=0.001, cl=0.01, L=1
  pièce  : prixUnitaire en €/pièce — facteur=1

coutPortionHT(r)  = Σ coutIng(i) / r.portions
coutPortionTTC(r) = Σ (coutIng(i) × (1 + ing.tva/100)) / r.portions

foodCostPct = coutPortionTTC / prixVentePratiqueTTC × 100
  vert < 30% | orange 30-35% | rouge ≥ 35%

prixSuggereTTC = coutPortionHT / (foodCostCible/100) × (1 + tva/100)
```

---

## Patterns techniques importants

### MongoDB — règles absolues
```js
const PROJ = { projection: { _id: 0 } };     // toujours exclure _id
await col.insertOne(item); delete item._id;   // supprimer avant de renvoyer
await col.replaceOne({ id, user_id }, doc);   // PUT = replaceOne, jamais updateOne
const db = await getDb();                     // singleton Promise, réutilisé
```

### Isolation des données
```js
// Données privées
db.collection('recettes').find({ user_id: req.userId })

// Ingrédients : user voit les siens + ceux du compte demo
db.collection('ingredients').find({ $or: [{ user_id: req.userId }, { user_id: 'demo' }] })
```

### Sync prix bidirectionnelle — règle impérative
`PUT /api/recettes/:id/prix` est le seul point d'entrée pour modifier `prixVentePratiqueTTC`.  
Il met à jour la recette ET parcourt toutes les cartes de l'utilisateur pour y synchroniser `prixVente`.  
Ne jamais modifier `prixVentePratiqueTTC` via `PUT /api/recettes/:id` seul si on veut la propagation aux cartes.

### Auto-save debounced (pattern VueCarte)
```js
clearTimeout(timerRef.current);
timerRef.current = setTimeout(() => {
  api.cartes.update(id, data).then(saved => callback?.(saved));
}, 500);
```

### editKey — forcer le remontage d'EditeurCarte
`editKey` est un compteur incrémenté dans `Cartes.jsx` après chaque auto-save de VueCarte.  
Il est passé en `key` à `<EditeurCarte key={...}>` pour forcer son remontage et resynchroniser les sections locales.

### checkAccess — middleware d'accès
Appliqué sur toutes les routes protégées sauf `/auth/*` et `/stripe/*`.  
Ordre des vérifications : `trialStartDate` absent → accès libre (anciens comptes) | `betaAccess: true` | `subscriptionStatus: 'active'` | `subscriptionStatus: 'lifetime'` | `trial` non expiré → sinon 403 `trial_expired`.

### SAFE_PROJECTION (admin)
```js
const SAFE_PROJECTION = {
  projection: { _id: 0, password_hash: 0, emailVerificationToken: 0,
    emailVerificationExpiry: 0, emailVerificationSentAt: 0,
    stripeCustomerId: 0, stripeSubscriptionId: 0 }
};
```
Les champs sensibles ne sont jamais renvoyés par les routes admin.

---

## Performance & maintenance

### Optimisations appliquées (2026-05-27)
- **Code splitting Vite** : 5 chunks séparés (`vendor-react`, `vendor-charts`, `vendor-dnd`, `vendor-pdf`, `vendor-tour`). Gain estimé : -30 à -50% sur le bundle initial chargé au premier accès.
- **`updateLastSeen` optimisé** : 1 seule opération MongoDB (`updateOne` avec filtre temporel) au lieu de `findOne` + `updateOne` conditionnelle.
- **`console.log` debug supprimés** : `FicheTechnique.jsx` (render + data dump), `relances.js` (startup + envois verbeux), `ia.js` (log clé API sur chaque appel), `verification.js` (logs envoi).
- **`trialEndDate` corrigé** : `sendTrialEmails()` utilisait `user.trialEndsAt` (champ inexistant) → corrigé en `user.trialEndDate`. Les relances essai étaient silencieusement désactivées.

### Recommandations non appliquées
- **Lazy loading React pages** : `React.lazy()` + `Suspense` sur les pages lourdes (MenuEngineering 74KB, Ingredients 65KB, FicheTechnique 60KB, Cartes 56KB). Fort ROI bundle mais touche au routing dans `App.jsx`.
- **Index MongoDB sur `users.id`** : `checkAccess` et `updateLastSeen` font un lookup par `id` sur chaque requête. Si l'index n'existe pas sur Atlas, c'est un full scan. À vérifier depuis la console Atlas.
- **CORS** : vérifier que `CORS_ORIGIN` est défini sur Render (sinon `*` en production).

---

## Bugs connus

| # | Description | Impact | Contournement |
|---|---|---|---|
| 1 | **`bar` absent du scan allergènes auto** : mot trop ambigu (bar = établissement). | Mineur — faux négatif sur le poisson "bar". | Activer manuellement le badge "poisson". |
| 2 | **`vin` absent du scan sulfites** : risquerait de matcher dans "vinaigre". Seuls "vinaigre balsamique" et "vinaigre de vin" déclenchent sulfites. | Mineur — faux négatif sur les recettes avec du vin. | Activer manuellement "sulfites". |
| 3 | **Allergènes détectés en editMode non sauvegardés immédiatement** : le scan dans EtapesEditor met à jour `form.allergenes` mais la sauvegarde MongoDB n'arrive qu'au clic "Sauvegarder". En mode lecture, le toggle badge sauvegarde immédiatement. | Mineur — risque de perte si fermeture sans sauvegarde. | Toujours cliquer "Sauvegarder" après avoir modifié les étapes. |
| 4 | **Render cold start** : backend en plan gratuit, peut mettre 30-60 s à répondre après inactivité. | Gênant en démo — première requête lente. | Aucun — limitation plan gratuit Render. |
| 5 | **Isolation données démo** : les ingrédients du compte `demo` sont visibles par tous les utilisateurs connectés (comportement voulu mais à revoir si multi-tenant). | Faible — aucun risque de fuite de données utilisateur. | — |

---

## Ce qui reste à faire

### Priorité haute
- [x] **Mentions légales** : page `/mentions-legales`
- [x] **Emails de relance essai** : séquence J+9 / J+12 / J+14 + post-essai J+2 / J+7 / J+15 / J+40
- [x] **Emails lifecycle** : J+4 (sans fiche), J+8 (sans fiche), J+4 post-vérification (onboarding incomplet)
- [x] **CRM Admin** : tableau, filtres, tri colonnes, fiche client drawer, accès à vie
- [ ] **Lazy loading React** : `React.lazy()` sur les pages > 50KB (MenuEngineering, Ingredients, FicheTechnique, Cartes)
- [ ] **Index MongoDB** : vérifier/créer index sur `users.id` dans Atlas
- [ ] Import/export CSV des ingrédients

### Priorité moyenne
- [ ] Recherche et filtres sur la liste des fiches (par catégorie, food cost, allergène présent)
- [ ] Export PDF de la carte complète (menu imprimable client)
- [ ] Indicateurs visuels fiches incomplètes dans la liste (sans prix, sans ingrédients)
- [ ] Historique des modifications d'une fiche (versioning léger)
- [ ] Section "Plat du jour" dans les cartes (mise en avant visuelle)
- [ ] Page Aide → lier le product tour aux vraies cibles DOM de chaque section

### Priorité basse / idées
- [ ] QR Code allergènes (lien vers Format B en ligne)
- [ ] Calcul commandes fournisseurs depuis un nombre de couverts prévu
- [ ] Multi-restaurants (1 compte = N établissements)
- [ ] Application mobile (PWA)

### Modifications diverses en attente
- [ ] Landing page : corriger le bug de remplacement des href footer par `/#` (source externe probable — extension navigateur ou service worker)
- [ ] Vérifier le déclenchement correct du product tour sur mobile (scroll + highlight)
- [ ] Ajouter `rel="noopener noreferrer"` systématiquement sur tous les liens externes `target="_blank"`
- [ ] CORS : confirmer que `CORS_ORIGIN` est défini sur Render
