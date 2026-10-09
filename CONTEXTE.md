# CloverIA FicheTech — Contexte projet

> Dernière mise à jour : 2026-10-09 (Sprint 1 — prompts IA alignés sur les 7 unités officielles, commit b556585 ; Sprint 2 — normalisation des unités dans conversions.js, commit c7d7c95 ; Sprint 3 — signal des lignes incomplètes, commit e16f136 ; correctif matching prix IA (apostrophes/ligatures/espaces), commit 66fde6a ; Sprint 4 — signal d'incohérence de famille d'unité (pièce vs masse/volume), commit bbdf126 ; Sprint 5 — message d'information sur le prix d'un ingrédient du catalogue en mode édition, commit aa40d5a ; Sprint 6 — reconnaissance d'une ligne issue d'une sous-recette et avertissements adaptés, commit 32e3804 ; Sprint 7 — fin des ingrédients catalogue fantômes créés pour un nom de sous-recette, commit 3b670d0 ; Sprint 8 — identifiant de sous-recette stocké dans la ligne, commit 255cb1b ; Sprint 9 — préparation serveur du calcul de prix d'une sous-recette, commit ee73ccd ; Sprint 10 — effacement de l'identifiant de sous-recette sur association catalogue/prix modifié à la main, commit fe90bbc ; Sprint 11 — catalogue chargé une seule fois par appel au lieu d'une fois par recette, commit e138634 ; Sprint 12 — prix d'une ligne suivie recalculé depuis sa sous-recette, commit f8ffb88 ; Sprint 13 — libellé du coût unitaire des sous-recettes corrigé (EUR/kg, EUR/L, EUR/pièce), commit c8240ec ; Sprint 14 — affichage d'une ligne suivie comme un ingrédient (prix verrouillé, étiquette cohérente), commit ab36acd ; Sprint 15 — suppression de l'avertissement trompeur des anciennes lignes de sous-recette, commit 193780e ; 2026-10-08 — audit de pré-lancement : S1 écritures multi-tenant, commit e3eb40e ; S2a webhook Stripe, commit b9bd046 ; S3 suppression de la bibliothèque xlsx, commit 7fd5c94 ; S4 fin du repli sur les ingrédients demo, commit 61fc55e ; 2026-10-09 — S5 alias par utilisateur (d640173) ; S2b Stripe identifiant utilisateur et handlers (84e4833) ; S2c portail client (2e85441) ; S6 réponses de profil sans jetons (b3faf40) ; S7 quota IA (d1ba0fe) ; S2d délai de grâce 7 jours (594c521) ; S8 erreurs IA et finitions (056b95e))

---

## Vision produit

CloverIA FicheTech est un **assistant chef hybride** pour restaurateurs indépendants. L'application couvre :
- **Fiches techniques** : création par IA (description libre → fiche structurée), calcul food cost temps réel, export PDF
- **Food cost** : suivi coût matière par portion, food cost cible paramétrable, prix de vente suggéré
- **Organisation quotidienne** : agenda intégré, rappels/événements/notes, widget J0→J+2 sur le dashboard, anecdote du jour
- **CRM interne** : page admin protégée, vue complète des inscrits, pilotage commercial

---

## Clients cibles

- Restaurateurs indépendants
- Chefs de cuisine
- Traiteurs
- Cuisines professionnelles souhaitant maîtriser leurs coûts

---

## Business model

- Abonnement **39 €/mois** sans engagement
- Essai gratuit **14 jours** sans carte bancaire
- Stripe en mode **live** configuré
- **Accès à vie** possible manuellement via CRM admin (`subscriptionStatus: 'lifetime'`)
- Cible : restaurateurs indépendants, chefs, traiteurs

---

## État actuel du projet

- V1 en **production** sur `app.cloveria-pro.fr`
- 1 bêta-testeur actif ; 2 comptes bêta (betaAccess) créés mais inutilisés
- Google Search Console en attente de validation DNS

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

**Render — Root Directory = `server`** : le service Render est configuré (tableau de bord Render, pas dans le dépôt) avec Root Directory `server` — le Build Command s'exécute depuis `server/`. **`render.yaml` du dépôt ne reflète pas ce réglage** : c'est le tableau de bord Render qui fait foi. Conséquence directe : **le serveur ne doit importer aucun fichier situé hors de `server/`** (voir Sprint 9, `server/lib/conversions.js`).

**Un commit qui ne touche que `client/` ne redéploie pas le serveur** (Render) — seul Vercel se redéploie dans ce cas.

**`CORS_ORIGIN` sur Render** : les requêtes venant de l'adresse technique Vercel `cloveria-fichetech.vercel.app` sont refusées par le serveur (non incluse dans `CORS_ORIGIN`) — l'application y affiche des listes vides, **sans aucun message d'erreur visible**. Toujours utiliser `app.cloveria-pro.fr`.

**Cache du bundle client** : après un déploiement du frontend, un rechargement forcé (Ctrl+Maj+R) peut être nécessaire pour obtenir le nouveau bundle JS (cache navigateur).

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
│   │   ├── ventes.js               # CRUD + GET /dates + GET /by-date — rapports Menu Engineering
│   │   ├── stripe.js               # /checkout, /portal, /webhook
│   │   ├── documents.js            # GET/POST/DELETE — archive factures fournisseurs
│   │   ├── agenda.js               # CRUD rappels/événements/notes
│   │   └── onboarding.js           # inject-example / skip-example (pack démarrage)
│   ├── lib/
│   │   ├── conversions.js          # copie de client/src/conversions.js (voir Sprint 9)
│   │   └── prixSousRecette.js      # calculerPrixUnitaireSousRecette, memeFamilleUnite (Sprint 9)
│   ├── emails/
│   │   ├── verification.js         # envoyerConfirmationEmail, envoyerResetEmail (Resend)
│   │   ├── relances.js             # envoyerRelance (essai), envoyerLifecycle (onboarding)
│   │   └── notifications.js        # notifierNouveauClient, notifierSuppressionCompte (interne)
│   ├── scripts/
│   │   ├── change-demo-password.js # utilitaire ponctuel reset mdp démo
│   │   └── verifier-conversions.js # test de cohérence server/lib/conversions.js vs client/src/conversions.js (Sprint 9)
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
  "stripeLastEventAt": "nombre (horodatage Unix du dernier événement Stripe appliqué, Sprint S2b)",
  "pastDueSince": "ISO8601|null (Sprint S2d — premier échec de paiement de l'épisode en cours)",
  "iaCallsCount": "nombre (Sprint S7 — compteur de points IA consommés dans la fenêtre courante)",
  "iaCallsWindow": "AAAA-MM (Sprint S7 — fenêtre mensuelle UTC du compteur iaCallsCount)",
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
  "ingredients": [{ "nom", "quantite", "unite", "prixUnitaire", "tva", "sousRecetteId" }],
  "etapes": ["string"],
  "prixVentePratiqueTTC": 18.50,
  "_source": "example|undefined",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

> `sousRecetteId` (string|null) (Sprint 8) : identifiant de la sous-recette quand la ligne est choisie depuis la liste « Prépa. » ; effacé (null) si la ligne est ensuite saisie à la main, associée à un ingrédient du catalogue ou si son prix est modifié à la main ; le serveur recalcule alors le prix depuis la sous-recette (Sprint 12). Les lignes antérieures au Sprint 8 n'ont pas ce champ.

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

> `prixUnitaire` n'a pas d'unité attachée en base. Le coût d'une ligne est toujours `convertirEnUniteBase(quantité, unité de la ligne) × prixUnitaire` — `baseUnit()` ne sert qu'à l'étiquette affichée (`EUR HT / kg`, etc.), jamais au calcul. La signification réelle du prix dépend donc entièrement de l'unité utilisée au moment où il a été saisi ou copié.

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
{ "from": "crevettes roses", "to": "crevette", "user_id": "uuid (Sprint S5)" }
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

### `ventes_imports`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "periode": "string|null",
  "lignes": [...],
  "dateDebut": "YYYY-MM-DD|null",
  "dateFin": "YYYY-MM-DD|null",
  "cartesIds": ["uuid"],
  "matchings": [...],
  "hasLineDates": false,
  "nomFichier": "string|null",
  "statut": "validé",
  "reportDate": "YYYY-MM-DD",
  "_reportDateSource": "dateDebut|dateFin|backfill",
  "sourceFileName": "string|null",
  "sourceFileMimeType": "string|null",
  "sourceDocumentId": "uuid|null",
  "extractedData": {}|null,
  "validatedData": [...],
  "status": "validated",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

> `reportDate` est la date métier du rapport (YYYY-MM-DD). `_reportDateSource` trace l'origine : `'dateDebut'` | `'dateFin'` | `'backfill'` (dérivée de `createdAt`). `validatedData` = lignes confirmées par l'utilisateur (avec quadrants BCG). `extractedData` = sortie brute IA avant validation. `sourceDocumentId` = référence vers `documents_ventes` pour accéder au fichier source.

### `documents_ventes`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nomFichier": "string",
  "fileBase64": "string",
  "fileMimeType": "string",
  "dateImport": "ISO8601",
  "statut": "validé",
  "lignesCount": 12
}
```

> Stocké automatiquement à chaque appel `POST /api/ia/analyser-ventes`. Accessible via `GET /api/documents/ventes/:id/file` → `{ base64, mimeType, nomFichier }`. Jamais exposé en liste sans le `fileBase64` (projection exclut le contenu binaire du listing).

### `documents_fiches`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "nomFichier": "string",
  "fileBase64": "string",
  "fileMimeType": "string",
  "dateImport": "ISO8601",
  "statut": "validé",
  "version": 1,
  "nomPlat": "string|null",
  "categoriePlat": "string|null",
  "recetteLiee": "uuid|null"
}
```

> Stocké automatiquement à chaque appel `POST /api/ia/analyser-fiche` — le fichier complet (image/PDF) est écrit en base à chaque analyse, indépendamment de toute sauvegarde de fiche ultérieure par l'utilisateur. Absente du reste de cette documentation jusqu'ici.

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
| GET/POST/PUT/DELETE | `/api/ventes` | Rapports de ventes Menu Engineering |
| GET | `/api/ventes/dates?month=` | Dates distinctes avec imports pour un mois (YYYY-MM) |
| GET | `/api/ventes/by-date?date=` | Rapports d'une date donnée (YYYY-MM-DD) |
| GET/POST/DELETE | `/api/documents/:type/:id?` | Archive documents (factures fournisseurs, scans ventes) |
| GET | `/api/documents/:type/:id/file` | Fichier brut base64 d'un document (`{ base64, mimeType, nomFichier }`) |
| GET/POST/PUT/DELETE | `/api/agenda/:id?` | CRUD rappels/événements/notes |
| POST | `/api/onboarding/inject-example` | Injecte le pack démarrage exemple |
| POST | `/api/onboarding/skip-example` | Passe le pack exemple |
| POST | `/api/stripe/create-checkout-session` | Crée session Stripe Checkout |
| POST | `/api/stripe/create-portal-session` | Crée une session du portail client Stripe (gestion abonnement, Sprint S2c) |
| POST | `/api/stripe/webhook` | Webhook Stripe (activation/désactivation) |

> `DELETE /api/auth/delete-test-account` a existé puis a été supprimée (Sprint S1, `e3eb40e`) — elle n'apparaît plus ci-dessus. Depuis le Sprint S2c (`2e85441`), le portail client Stripe existe (`create-portal-session` ci-dessus) — la page `Abonnement.jsx` et la section « Mon abonnement » de `Parametres.jsx` y renvoient.
>
> Depuis le Sprint S7, les routes `/api/ia/*` répondent `429 { code: 'quota_ia_atteint' }` au-delà du quota mensuel, et `503`/`500` avec `code: 'ia_indisponible'`/`'ia_erreur'` en cas d'erreur Anthropic (Sprint S8) — jamais le message brut d'Anthropic.

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
- Isolation stricte par `user_id` — le compte `demo` n'est plus un repli de lecture pour les autres utilisateurs (Sprint S4, commit `61fc55e`)

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

### Prix des sous-recettes dans les fiches (Sprints 6 à 15)
- **Sprint 6** (`32e3804`) : une ligne de fiche issue d'une sous-recette sans identifiant (ajoutée avant le Sprint 8) reçoit des avertissements adaptés dans `FicheTechnique.jsx` (`estSousRecette`), quand aucune entrée catalogue du même nom n'existe.
- **Sprint 7** (`3b670d0`) : `syncIngredientsToBase()` ne crée plus d'entrée catalogue fantôme pour un nom de sous-recette (lecture des sous-recettes de l'utilisateur, try/catch local).
- **Sprint 8** (`255cb1b`) : `selectSR` (`IngredientAutocomplete.jsx`) stocke `sousRecetteId` dans la ligne ; la saisie libre et la sélection d'un ingrédient catalogue le remettent à `null`.
- **Sprint 9** (`ee73ccd`) : `server/lib/conversions.js` (COPIE de `client/src/conversions.js`), `server/lib/prixSousRecette.js` (`calculerPrixUnitaireSousRecette`, `memeFamilleUnite`) et `server/scripts/verifier-conversions.js`. **Règle** : toute modification de `client/src/conversions.js` doit être reportée dans `server/lib/conversions.js`, puis lancer `node server/scripts/verifier-conversions.js` — le test n'est pas automatique.
- **Sprint 10** (`fe90bbc`) : `sousRecetteId` effacé quand la ligne est associée à un ingrédient du catalogue ou que son prix est modifié à la main (pas lors d'un changement d'unité).
- **Sprint 11** (`e138634`) : `GET /recettes` et `GET /recettes/:id` chargent le catalogue une seule fois par appel (`enrichirLignesAvecCatalogue`, fonction pure exportée) ; résultat identique, N+1 requêtes ramenées à 2.
- **Sprint 12** (`f8ffb88`) : une ligne qui porte un `sousRecetteId` voit son prix recalculé côté serveur depuis la sous-recette (recherche par identifiant, filtre strict `user_id` sans repli `demo`), seulement si la famille d'unité de la ligne et celle de la sous-recette sont identiques ; sinon comportement antérieur (catalogue puis prix de la ligne). Les ingrédients internes de la sous-recette sont enrichis avec la règle de `sous_recettes.js` (le catalogue écrase toujours, même à 0), reproduite dans `prixLigneSousRecette` (`recettes.js`) — **2 copies de cette règle à garder alignées**. Le prix est arrondi à 5 décimales, comme `selectSR`. L'unité de la ligne n'est jamais modifiée.
- **Sprint 13** (`c8240ec`) : libellé du coût unitaire des sous-recettes corrigé (`EUR/kg`, `EUR/L`, `EUR/pièce`) dans `SousRecettes.jsx` et `IngredientAutocomplete.jsx` ; calcul inchangé.
- **Sprint 14** (`ab36acd`) : `FicheTechnique.jsx` affiche une ligne suivie (`ligneSuivie` = identifiant trouvé et même famille d'unité) comme un ingrédient : étiquette d'unité cohérente sans `⚠️`, champ prix grisé en édition, `⚠️` « Prix manquant » si la sous-recette n'a pas de prix, pas de bannière « Associer ».
- **Sprint 15** (`193780e`) : le `⚠️` « Sous-recette : prix copié à l'ajout… » est supprimé pour les anciennes lignes sans identifiant (prix > 0) ; les `⚠️` « Prix manquant » des lignes à prix 0 sont conservés. **Limite connue** : une ancienne ligne ne suit pas la sous-recette et ne l'indique plus.

### Menu Engineering
- Import des ventes via scan IA (image/PDF rapport de caisse → extraction automatique nom plat + quantités)
- Matrice BCG automatique : **Stars** (marge haute + ventes hautes), **Plowhorses** (marge faible + ventes hautes), **Puzzles** (marge haute + ventes faibles), **Dogs** (marge faible + ventes faibles)
- Recommandations automatiques par catégorie (garder, valoriser, ajuster prix, retirer)
- **Calendrier des imports** : navigation mensuelle, dates occupées visuellement marquées (basées sur `reportDate`), clic date occupée → vue consultation, clic date libre → import
- **Vue consultation par date** (`DateReportViewer`) : sélecteur en pills si plusieurs rapports sur la même date, affiche `validatedData` (lignes confirmées avec quadrants) et `extractedData` (brut IA)
- **Édition inline** : bouton "Modifier" sur chaque rapport — édition des quantités ligne par ligne + modification de la `reportDate`. Sauvegarde via `PUT /api/ventes/:id`. Quadrants BCG non recalculés depuis la vue consultation (recalcul au prochain import complet).
- **Import multiple à la même date** : depuis la vue consultation, bouton "Ajouter un rapport" démarre un import sans écraser les existants. Bannière de contexte dans l'étape 1 + date verrouillée. Après sauvegarde, retour automatique à la vue consultation avec le nouveau rapport sélectionné.
- **Lien scan source** : chaque rapport mémorise `sourceDocumentId` pointant vers `documents_ventes`. Vue consultation lazy-fetch le fichier et affiche une prévisualisation inline (image) ou lien de téléchargement (PDF).
- **Flow d'import simplifié** : les blocs "Granularité des données" et "Période et carte concernée" ont été supprimés. La `reportDate` est directement la date sélectionnée dans le calendrier (fallback : date du jour). Plus de saisie manuelle de dateDebut/dateFin ni de sélecteur de carte à l'import. Les champs `dateDebut`, `dateFin`, `cartesIds` restent présents en base pour la compatibilité des anciens rapports.
- **Résultats** : seule la matrice 2×2 et l'analyse détaillée (tableau + graphiques) sont affichées. Les 4 cards de synthèse horizontales (⭐ À conserver / 🐄 À retravailler / 🔍 À pousser / 💀 À sortir) ont été supprimées comme redondantes.

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

// Ingrédients : isolation stricte, aucun repli sur un autre compte
db.collection('ingredients').find({ user_id: req.userId })
```

> **Décision prise le 2026-10-08 (Seb)** : isolation stricte, aucun repli sur le compte demo (Sprint S4, commit `61fc55e`). `GET /api/ingredients` (`server/routes/ingredients.js`) était déjà strict sur `{ user_id: req.userId }` avant ce sprint ; `recettes.js`, `sous_recettes.js` et `ia.js`, qui utilisaient un repli `$or` avec `user_id: 'demo'`, filtrent désormais eux aussi strictement sur `{ user_id: req.userId }`. Le compte demo lui-même reste inchangé : son `user_id` vaut `'demo'`, donc ce filtre continue de lui renvoyer ses propres données.

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

### Environnement — aucun environnement local isolé
`client/src/api.js` pointe en dur vers le backend de production (`https://cloveria-fichetech.onrender.com/api`) — `VITE_API_URL` est défini dans `vite.config.js` mais jamais utilisé dans `api.js`. Démarrer le serveur en local avec le `.env` actuel écrit directement dans la base de production dès `getDb()` (seed conditionnel, `createIndex` sur `users`, migration `ventes_imports`, reset du compte démo) — avant même toute requête API. **Il n'existe aujourd'hui aucun environnement local isolé pour ce projet.**

---

## Performance & maintenance

### Optimisations appliquées
- **Code splitting Vite** (2026-05-27) : 5 chunks séparés (`vendor-react`, `vendor-charts`, `vendor-dnd`, `vendor-pdf`, `vendor-tour`). Gain estimé : -30 à -50% sur le bundle initial chargé au premier accès.
- **`updateLastSeen` optimisé** (2026-05-27) : 1 seule opération MongoDB (`updateOne` avec filtre temporel) au lieu de `findOne` + `updateOne` conditionnelle.
- **`console.log` debug supprimés** (2026-05-27) : `FicheTechnique.jsx` (render + data dump), `relances.js` (startup + envois verbeux), `ia.js` (log clé API sur chaque appel), `verification.js` (logs envoi).
- **`trialEndDate` corrigé** (2026-05-27) : `sendTrialEmails()` utilisait `user.trialEndsAt` (champ inexistant) → corrigé en `user.trialEndDate`. Les relances essai étaient silencieusement désactivées.
- **Lazy loading React pages** (Sprint 2) : `React.lazy()` + `Suspense` sur les pages lourdes (MenuEngineering, Ingredients, FicheTechnique, Cartes). Implémenté dans `App.jsx`.
- **Index MongoDB sur `users.id`** (Sprint 1) : index créé sur Atlas — `checkAccess` et `updateLastSeen` font un lookup par `id` sur chaque requête. Plus de full scan.

### Recommandations non appliquées
- **CORS** : vérifier que `CORS_ORIGIN` est défini sur Render (sinon `*` en production).

---

## Audit de pré-lancement (2026-10-08)

### Corrigé
- **S1** (`e3eb40e`) : la route `DELETE /api/auth/delete-test-account` (publique, sans jeton) a été supprimée. Dans les `POST /` de `recettes.js`, `ingredients.js`, `cartes.js`, `sous_recettes.js`, `id` et `user_id` sont désormais placés **après** `...req.body`, pour qu'un corps de requête ne puisse plus les écraser (ex. imposer `user_id: 'demo'`). Le corps de la requête est toujours spreadé en entier — des champs parasites non attendus restent possibles, hors scope de ce correctif.
- **S2a** (`b9bd046`) : le webhook Stripe est monté avec `express.raw({ type: 'application/json' })` **avant** `express.json()` global (le corps brut est désormais disponible pour la vérification de signature). Si `STRIPE_WEBHOOK_SECRET` est absent, la route répond `500 { error: 'Webhook non configuré' }` au lieu de faire confiance à un corps non vérifié. Un `console.error` a été ajouté quand un événement valide ne trouve aucun utilisateur correspondant. Vérifié par un test de signature invalide (→ 400) et de secret absent (→ 500) ; **non vérifié par un vrai paiement** — la valeur du secret configurée sur Render n'est pas confirmée identique à celle de Stripe.
- **S3** (`7fd5c94`) : la bibliothèque `xlsx` (vulnérabilité élevée sans correctif disponible) a été supprimée ; l'import `.xlsx`/`.xls` dans `POST /api/ia/analyser-ventes` est désactivé. CSV, PDF et images restent acceptés. Les textes de `MenuEngineering.jsx` (formats acceptés, message d'erreur) ont été mis à jour en conséquence. `npm audit` côté serveur : 8 → 7 vulnérabilités. **Reste ouvert** : un fichier rejeté par `multer` (ex. `.xlsx` envoyé malgré tout) renvoie une erreur `500` faute de middleware d'erreur dédié — le client bloque déjà ces fichiers avant l'envoi, donc sans impact pour un usage normal de l'interface — [corrigé par S8, 056b95e : le middleware d'erreurs renvoie désormais 400 avec un message clair].
- **S4** (`61fc55e`) : suppression du repli `demo` à 4 endroits : `ia.js` (`matchIngredientPrice`), `recettes.js` (`syncIngredientsToBase` et `chargerCatalogue`), `sous_recettes.js` (`enrichIngredients`). Isolation stricte sur `{ user_id: req.userId }` pour la résolution des prix d'ingrédients. **Effets connus** : les prix déjà enregistrés dans les lignes de fiches restent affichés mais ne suivent plus le catalogue demo ; les nouvelles fiches créées par IA affichent `0` / `⚠️ Prix manquant` pour un ingrédient absent du catalogue de l'utilisateur ; `syncIngredientsToBase` peut créer une entrée à prix `0` dupliquant un nom qui n'existait que côté demo. **À vérifier, non confirmé** : une sous-recette dont un ingrédient n'existe plus que dans le catalogue `demo` pourrait voir son prix tomber à `0` si une entrée à prix `0` est créée dans le catalogue de l'utilisateur (la règle « le catalogue écrase toujours » des sous-recettes).
- **S5** (`d640173`) : `aliases.js` filtre désormais `GET /` sur `{ user_id: req.userId }` et `POST /` enregistre `user_id` dans l'upsert (`{ from, user_id }`). Les alias créés avant ce correctif, sans `user_id`, sont devenus invisibles pour tous les utilisateurs (non supprimés, toujours en base). Aucun index créé sur `aliases` ; aucune validation de longueur ajoutée.
- **S2b** (`84e4833`) : `create-checkout-session` envoie désormais `client_reference_id` et `subscription_data.metadata.userId` ; le webhook recherche l'utilisateur par cet identifiant, puis par `stripeCustomerId`, puis par e-mail (uniquement pour `checkout.session.completed`). Les 5 handlers (`checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`, `invoice.payment_failed`, `invoice.payment_succeeded`) ne modifient jamais un compte `lifetime` ; garde de rejeu via `stripeLastEventAt` (comparaison stricte) ; `mapStripeSubscriptionStatus()` centralise la correspondance statut Stripe → statut interne. L'endpoint Stripe « CloverIA Webhook Live » écoute désormais ces 5 événements (réglé dans le tableau de bord le 2026-10-08).
- **S2c** (`2e85441`) : ajout de `POST /api/stripe/create-portal-session` ; section « Mon abonnement » dans `Parametres.jsx` ; lien de gestion d'abonnement dans `Abonnement.jsx` ; `GET /profil` renvoie désormais `hasStripeCustomer` et plus `stripeCustomerId`/`stripeSubscriptionId`. Portail client Stripe configuré dans le tableau de bord (factures, informations client, moyens de paiement, annulation à la fin de la période, motif de résiliation demandé, abonnements désactivés dans le portail).
- **S6** (`b3faf40`) : `buildProfilResponse()` retire désormais de `GET` et `PUT /profil` : `password_hash`, `emailVerificationToken`/`Expiry`/`SentAt`, `passwordResetToken`/`Expiry`, `stripeCustomerId`, `stripeSubscriptionId` — ces champs restent écrits en base, seule la réponse change. `PUT /profil` utilise une liste blanche (`ALLOWED`) : `subscriptionStatus`, `betaAccess`, `trialEndDate`, `emailVerified`, `email` ne sont pas modifiables par l'utilisateur via cette route.
- **S7** (`d1ba0fe`) : quota IA mensuel par utilisateur, 300 points par fenêtre (`description-commerciale` = 1, `structurer` = 2, `analyser-facture`/`fiche`/`ventes` = 3), fenêtre au format `AAAA-MM` calculée en UTC, champs `iaCallsCount` et `iaCallsWindow` sur `users`, réservation atomique avant chaque appel Anthropic, remboursement si l'appel échoue, réponse `429` avec `code: 'quota_ia_atteint'`. Aucune exception pour le compte `demo`. **La limite de 300 est une valeur de départ, à recaler avec la consommation réelle.** Un incrément de compteur peut être écrasé en cas d'écriture simultanée du document utilisateur (`PUT /profil`, webhooks Stripe) — risque faible, noté.
- **S2d** (`594c521`) : délai de grâce de 7 jours après un premier échec de paiement — champ `pastDueSince` posé dans `invoice.payment_failed` et `customer.subscription.updated` (statut `past_due`), effacé au retour à `'active'` ; `checkAccess` laisse passer un compte `past_due` pendant 7 jours (lecture seule, aucune écriture) ; `'cancelled'` reste sans délai ; e-mail de prévenance `envoyerPastDue()` (`relances.js`), envoyé une seule fois par épisode ; page `Abonnement.jsx` adaptée pour un compte avec `hasStripeCustomer`. **Limite** : le câblage des événements et l'envoi réel de l'e-mail n'ont pas été testés de bout en bout (aucun paiement réel reçu à ce jour).
- **S8** (`056b95e`) : `messageErreurIA()` (`ia.js`) — les erreurs Anthropic ne renvoient plus `err.message` au client, remplacées par des messages génériques avec `code: 'ia_indisponible'` ou `'ia_erreur'` ; journal préfixé `[IA][ALERTE]` pour les erreurs de configuration ou de crédit épuisé ; `try/catch` ajouté autour de `getDb()`/`reserverQuota()` dans les 5 routes IA ; délai Anthropic fixé à 90 s, `maxRetries: 0` ; middleware d'erreurs à 4 arguments ajouté en fin de pile dans `index.js` (gère `MulterError`, fichier trop volumineux, erreurs `4xx`, `500` générique) ; `process.on('unhandledRejection')` journalise sans arrêter le processus ; bouton « Mettre à jour mon moyen de paiement » (page Abonnement) harmonisé en vert pleine largeur.

### Reste ouvert
- **Test réel d'un paiement** (39 € puis remboursement) à faire avant d'accepter un client payant : aucun paiement n'a jamais été reçu sur Stripe à ce jour (historique des webhooks vide, vérifié le 2026-10-08).
- Pas de rate-limit sur `/login` et `/register` ; pas de `helmet` ; pas de `app.set('trust proxy')` ; `JWT_SECRET` avec valeur par défaut codée en dur ; comparaison non constante dans le temps de `ADMIN_SECRET`.
- Les documents base64 stockés par les routes IA n'ont pas de purge (risque vis-à-vis du quota MongoDB Atlas M0).
- Aucun index MongoDB sur `user_id` (seul `users.id` est indexé) ; le champ `photo` est renvoyé en entier dans `GET /api/recettes` (liste, pas seulement le détail) ; pas de middleware de compression des réponses.
- Dépendances : `npm audit` côté serveur signale `proxy-addr` (critique), `qs`, `uuid`, et `nodemailer` (élevé) ; côté client, `dompurify` et `react-router` (modérés). `nodemailer` et les variables Render `EMAIL_USER`/`EMAIL_PASS` sont obsolètes (remplacés par Resend). Aucun champ `engines` déclaré dans les `package.json`.
- Le cron quotidien (relances/lifecycle, 9h00) n'a pas de rattrapage si le service Render dort à cette heure-là.
- `.catch(() => {})` silencieux (sans log) sur l'archivage des documents générés par les routes IA et sur `syncIngredientsToBase()`.
- Variables Render non documentées ici : `DEMO_PASSWORD`, `NODE_ENV` — aucune des deux n'est référencée dans le code serveur (recherche sans résultat dans `server/`, hors `node_modules`). Leur existence et leur usage réel sur Render restent à vérifier directement sur le tableau de bord ; rien n'est supposé sur leur rôle ici.
- (a) Les routes `recettes.js`, `ingredients.js`, `cartes.js`, `sous_recettes.js`, `aliases.js`, `parametres.js` n'ont pas de `try/catch` autour de leurs accès base — le filet `unhandledRejection` (Sprint S8) évite l'arrêt du processus, mais la requête concernée reste sans réponse.
- (b) La confirmation d'e-mail n'est contrôlée que côté client (`App.jsx`) — aucun middleware serveur ne vérifie `emailVerified`.
- (c) Le jeton de vérification d'e-mail est stocké en clair (non haché, contrairement au jeton de réinitialisation de mot de passe).
- (d) `POST /register` distingue « compte archivé » de « compte existant » dans sa réponse — énumération de comptes possible.
- (e) `resend-verification` a un délai de 60 s entre deux envois, mais aucun plafond quotidien.
- (f) `POST /api/ia/description-commerciale` renvoie le texte brut de l'IA (`raw`) dans une réponse `422` si le JSON retourné est invalide.
- (g) Les anciens alias sans `user_id` (créés avant le Sprint S5) restent en base, invisibles pour tous.
- (h) Le texte des CGU, Article 10, parle d'un « délai raisonnable » en plus des « 7 jours » de l'article sur le paiement.
- (i) Dans Stripe, l'e-mail de confirmation de paiement (3D Secure) et ses rappels à 3, 5 et 7 jours sont activés ; les e-mails Stripe d'échec de paiement restent désactivés.

---

## Bugs connus

| # | Description | Impact | Contournement |
|---|---|---|---|
| 1 | **`bar` absent du scan allergènes auto** : mot trop ambigu (bar = établissement). | Mineur — faux négatif sur le poisson "bar". | Activer manuellement le badge "poisson". |
| 2 | **`vin` absent du scan sulfites** : risquerait de matcher dans "vinaigre". Seuls "vinaigre balsamique" et "vinaigre de vin" déclenchent sulfites. | Mineur — faux négatif sur les recettes avec du vin. | Activer manuellement "sulfites". |
| 3 | **Allergènes détectés en editMode non sauvegardés immédiatement** : le scan dans EtapesEditor met à jour `form.allergenes` mais la sauvegarde MongoDB n'arrive qu'au clic "Sauvegarder". En mode lecture, le toggle badge sauvegarde immédiatement. | Mineur — risque de perte si fermeture sans sauvegarde. | Toujours cliquer "Sauvegarder" après avoir modifié les étapes. |
| 4 | **Render cold start** : backend en plan gratuit, peut mettre 30-60 s à répondre après inactivité. | Gênant en démo — première requête lente. | Aucun — limitation plan gratuit Render. |
| 5 | **[Corrigé — S4, commit `61fc55e`] Isolation données démo** : les ingrédients du compte `demo` étaient visibles par tous les utilisateurs connectés (comportement voulu à l'origine, mais revu pour une isolation stricte). | N/A — corrigé. | — |
| 6 | **Quadrants BCG non recalculés en édition** (Sprint D) : modifier les quantités depuis la vue consultation met à jour `validatedData` mais ne relance pas l'algorithme BCG. Les quadrants affichés restent ceux du dernier import complet. | Mineur — incohérence visuelle si les quantités éditées changeraient de catégorie. | Réimporter le fichier pour recalculer. |
| 7 | **Bouton "Modifier" masqué** (Sprint D) : si un rapport n'a que `extractedData` (brut IA, jamais validé) et pas de `validatedData`, le bouton d'édition n'apparaît pas. | Mineur — cas rare (import interrompu avant validation). | Aucun depuis l'UI. |
| 8 | **Pas de lien scan source sur anciens rapports** (Sprint E) : les rapports importés avant le déploiement de Sprint E ne portent pas `sourceDocumentId`. Le bloc "Document source" n'apparaît pas pour ces rapports. | Faible — informatif uniquement. | Aucun — limitation rétroactive. |
| 9 | **Fichiers base64 lourds sur mobile Safari** (Sprint E) : les images de prévisualisation embarquent le base64 complet en mémoire. Fichiers > 5 Mo peuvent causer des crashs sur mobile Safari. | Faible — usage Desktop majoritaire. | Éviter d'importer des scans > 5 Mo. |
| 10 | **[Corrigé — partiellement] Incohérence unité/prix ingrédients** (catalogue vs fiche technique) — commit `7a1ee78`. Unités officielles désormais : `g`, `kg`, `ml`, `L`, `pièce`, `c.s`, `c.c`. `botte`/`tranche` ne sont plus proposées pour les nouvelles lignes mais restent affichées pour les anciennes fiches (valeurs legacy préservées, non migrées). **Ce correctif ne couvrait que le frontend** — les prompts IA côté serveur n'étaient pas alignés (voir Sprint 1 ci-dessous). <br>**Sprint 1** (commit `b556585`) : les prompts `/structurer` et `/analyser-fiche` (`server/routes/ia.js`) sont désormais alignés sur les 7 unités officielles (`g`, `kg`, `ml`, `L`, `pièce`, `c.s`, `c.c`). Pour `pincée`, `gousse`, `feuille`, `tranche`, `sachet`, `botte` : aucune conversion inventée — la mention reste dans le nom (ex. "Ail (2 gousses)"), quantité à `0` (`/structurer`) ou `null` avec `incertain: true` (`/analyser-fiche`). <br>**Sprint 2** (commit `c7d7c95`) : `conversions.js` normalise désormais l'unité avant recherche (espaces, minuscules, point final supprimé) et ajoute l'alias `gr`. Exporte `estUniteConnue()` (pas encore utilisée ailleurs). Une unité toujours inconnue après normalisation retombe toujours sur le facteur `1`. | N/A — corrigé pour la partie frontend + prompts IA ; voir bugs #11-27 pour les points encore ouverts. | — |
| 11 | **[Corrigé — Sprint 3, commit `e16f136`] Ligne à quantité 0 associée au catalogue sans signal visuel** : une ligne de fiche avec `quantite: 0` mais `prixUnitaire` renseigné via association catalogue affiche `0,00 EUR` sans avertissement — le `⚠️` de `FicheTechnique.jsx` ne couvre que `prixUnitaire === 0`, jamais une quantité nulle. **Sprint 3** : un `⚠️` « Quantité à compléter » a été ajouté à côté de la quantité dans `FicheTechnique.jsx`, `NouvelleRecette.jsx` et `SousRecettes.jsx`, et une ligne « ⚠️ Total incomplet : N ligne(s) à compléter » s'affiche désormais sous les totaux de `FicheTechnique.jsx` dès qu'au moins une ligne est concernée. | N/A — corrigé (Sprint 3). | — |
| 12 | **Unité inconnue = facteur 1 silencieux** dans `convertirEnUniteBase()` (`conversions.js`). Après normalisation (Sprint 2), une unité toujours non reconnue (ex. `"carton"`) n'empêche aucun calcul — elle est traitée comme si elle valait déjà l'unité de référence (kg/L/pièce), sans erreur ni avertissement. **Sprint 3** : les unités vides, inconnues ou approximatives (`tranche`, `botte`, `pincée`, `gousse`, `feuille`, `sachet`, `bouquet`, `boîte`) sont désormais signalées visuellement via `uniteAVerifier()` (`conversions.js`) dans `FicheTechnique.jsx`, `NouvelleRecette.jsx` et `SousRecettes.jsx`. Le calcul lui-même n'a pas changé : une unité inconnue retombe toujours sur le facteur `1` dans `convertirEnUniteBase()`. | Modéré — un écart d'unité non couvert peut fausser silencieusement un coût ; le signal visuel aide à le repérer mais ne corrige pas le calcul. | Vérifier les lignes marquées `⚠️ Unité à vérifier`. |
| 13 | **4 tables d'unités codées en dur hors `conversions.js`** : `baseUnit()` dans `FicheTechnique.jsx` et `Ingredients.jsx` (dupliquée à l'identique), `CONV` dans `IngredientAutocomplete.jsx` et `SousRecettes.jsx`. Elles ne bénéficient pas de la normalisation ajoutée en Sprint 2 (casse, espaces, point final). **Depuis le Sprint 9** (`ee73ccd`), une 3ᵉ copie existe côté serveur, `server/lib/conversions.js` — nécessaire car Render n'autorise aucun import hors de `server/` ; synchronisée manuellement et vérifiée par `node server/scripts/verifier-conversions.js` (non automatique). **Depuis le Sprint 12** (`f8ffb88`), la règle de prix de `sous_recettes.js` (le catalogue écrase toujours) est également dupliquée dans `prixLigneSousRecette` (`recettes.js`) — 2 copies à garder alignées. | Modéré — incohérence potentielle entre l'affichage/calcul de ces endroits et le reste de l'application pour une unité mal formatée ou une règle modifiée d'un seul côté. | Aucun — contournement = toujours saisir les unités dans leur forme canonique exacte, et relancer le test de cohérence après toute modification de `conversions.js`. |
| 14 | **[Corrigé partiellement — commit `66fde6a`] `matchIngredientPrice()` (`ia.js`) : match exact uniquement** — un nom modifié comme `"Ail (2 gousses)"` ne retrouve pas le prix catalogue de `"Ail"`. Cas diagnostiqués : apostrophe typographique (`'` vs `’`) et ligatures `œ`/`æ` non gérées par l'ancienne `normalize()` — causes désormais corrigées : `normalize()` gère les apostrophes typographiques, les ligatures `œ`/`æ`, et les espaces multiples/de bord. **Reste ouvert** : les noms avec une mention entre parenthèses (ex. `"Ail (2 gousses)"`) ne matchent toujours pas — volontairement non traité (aucun matching partiel/substring) ; le singulier/pluriel n'est volontairement pas géré non plus (risque de collision avec des mots se terminant naturellement par `s` : ananas, cassis, radis). | Modéré à élevé selon fréquence — prix catalogue non appliqué silencieusement. | Vérifier et compléter manuellement le prix pour les noms avec parenthèse ou mismatch singulier/pluriel. |
| 15 | **`ImportFicheModal` — perte du nom d'origine et ingrédients parasites** : l'association à un ingrédient existant remplace le nom de la ligne par celui du catalogue (la mention d'origine, ex. "(2 gousses)", est perdue) ; l'option par défaut "Créer sans prix" crée un nouvel ingrédient catalogue pour chaque nom à parenthèse non associé manuellement. | Modéré — pollution progressive du catalogue, perte d'information de quantité d'origine. | Vérifier le catalogue après chaque import de fiche IA ; associer manuellement plutôt que laisser "Créer sans prix" par défaut. |
| 16 | **[Corrigé — S5, `d640173`] Aliases : création systématique et portée globale** : un alias est créé à chaque association dans `FicheTechnique.jsx`, y compris quand le nom source contient une quantité (ex. "Ail (2 gousses)" → "Ail") — alias à usage unique, jamais réutilisable pour une autre quantité. La collection `aliases` porte désormais `user_id` (isolation par utilisateur). **Reste ouvert** : les alias à usage unique continuent de s'accumuler, maintenant par utilisateur plutôt que globalement. | Faible — accumulation d'alias inutiles, désormais par utilisateur. | Aucun actuellement. |
| 17 | **`findSimilarInCatalog` (FicheTechnique) et le lookup `ingData` non synchronisés** : deux mécanismes de correspondance différents (l'un tolérant via substring, l'autre strict) peuvent désaccorder — l'avertissement "Ingrédient absent de la base — prix saisi manuellement" peut rester affiché sur une ligne pourtant déjà associée au catalogue. | Faible — trompeur visuellement, sans impact sur le calcul du coût lui-même. | Ignorer l'avertissement si le prix est confirmé correct par ailleurs. |
| 18 | **[Corrigé partiellement — Sprint 4, commit `bbdf126`] `matchIngredientPrice()` ne renvoie que le prix, jamais l'unité du catalogue** : une ligne en `g` associée (par nom) à un ingrédient catalogué en €/pièce est comptée avec l'unité de la ligne, pas celle du catalogue — aucune alerte sur ce décalage de famille (masse/volume/pièce). **Sprint 4** : un `⚠️` d'unité s'affiche désormais dans `FicheTechnique.jsx` quand la ligne et le catalogue sont de familles incompatibles (pièce contre masse ou volume), via `familleUnite()` et `famillesIncompatibles()` (`conversions.js`) ; l'infobulle indique les deux unités en cause. Ce signal n'est pas compté dans « Total incomplet ». **Limites** : masse contre volume volontairement non signalé (densité proche de 1 pour de nombreux liquides, aucun facteur de densité dans le code) ; absent de `NouvelleRecette.jsx` et `SousRecettes.jsx` (pas de recherche catalogue dans ces écrans) ; la recherche catalogue de `FicheTechnique.jsx` est insensible à la casse mais pas aux ligatures ni aux apostrophes (voir bug #17) — un nom comme « Œufs » face à « Oeufs » au catalogue n'est donc pas contrôlé ; les unités approximatives (`tranche`, `botte`, etc.) n'ont pas de famille et ne déclenchent que le signal « Unité à vérifier ». | Modéré à élevé — coût potentiellement très faux sans aucun signal pour les croisements masse/volume ou pour les écrans non couverts. | Vérifier manuellement pour `NouvelleRecette`/`SousRecettes`, et pour tout croisement masse/volume. |
| 19 | **[Traité — Sprint 5, commit `aa40d5a`, comportement voulu] Pas de message indiquant qu'un prix de ligne associée au catalogue sera remplacé au rechargement** : le prix saisi dans une fiche technique est écrit en base à la sauvegarde, mais `enrichirLignesAvecCatalogue()` (`server/routes/recettes.js`, anciennement `enrichIngredients()` avant le Sprint 11) le remplace à chaque lecture par le prix du catalogue dès que celui-ci est non nul — **comportement intentionnel (décision de Seb), pas un bug en soi**. Le prix de la ligne ne sert que si l'ingrédient est absent du catalogue ou sans prix. **Sprint 5** : une note fixe s'affiche désormais en mode édition sous le tableau des ingrédients : « Le prix d'un ingrédient du catalogue se modifie dans la page Ingrédients. ». Depuis le Sprint 14 (`ab36acd`), le champ prix est grisé (`disabled`) pour les lignes de sous-recette suivies (`ligneSuivie`), dont le prix suit la sous-recette. Il reste modifiable pour les lignes du catalogue, dont la valeur saisie est remplacée au rechargement (la note du Sprint 5 l'indique) : un blocage fiable n'est pas possible pour le catalogue tant que la recherche catalogue du client (casse seulement) et celle du serveur (accents, espaces) peuvent diverger. | Faible — comportement voulu, information désormais visible. | Modifier le prix depuis la page Ingrédients, pas depuis la fiche technique. |
| 20 | **`syncIngredientsToBase()` (`recettes.js`) crée des ingrédients catalogue avec `unite: ing.unite \|\| 'g'` et prix `0`** : l'étiquette d'unité du catalogue ainsi créée peut ne pas correspondre au prix saisi plus tard par l'utilisateur (ex. ingrédient auto-créé en `g` alors que le restaurateur le tarife naturellement à la pièce). | Faible à modéré — contribue en amont à la création de catalogues avec une famille d'unité potentiellement arbitraire. | Vérifier/corriger l'unité de l'ingrédient créé automatiquement avant de saisir son prix dans la page Ingrédients. |
| 21 | **Aucune confirmation visible après "Sauvegarder" dans `FicheTechnique.jsx`** : le toast « Sauvegardé » n'existe que pour le flux "Associer" (`associerIngredient()`), jamais pour le bouton "Sauvegarder" principal. **Trois comparaisons de noms différentes coexistent** : `ia.js` `normalize()` (apostrophes, `œ`/`æ`, espaces), `recettes.js` `norm()` (accents NFD, espaces, mais pas `œ` ni apostrophes), recherche catalogue côté client dans `FicheTechnique.jsx` (casse uniquement). Cela peut afficher à tort « Ingrédient absent de la base — prix saisi manuellement » pour un nom que le serveur reconnaît pourtant (ex. « Café » contre « Cafe »), et pourrait empêcher une fiche créée par IA de suivre ensuite les changements de prix du catalogue (ex. « Œufs » contre « Oeufs ») — **cette dernière conséquence est une hypothèse non vérifiée**. | Faible à modéré — confusion possible sur l'état de sauvegarde, et signaux d'unité/prix potentiellement trompeurs selon le nom. | Vérifier l'enregistrement par un rechargement manuel ; recouper le nom catalogue en cas de doute. |
| 22 | **[Corrigé pour les lignes ajoutées depuis le Sprint 8 — Sprints 6 à 15] Sous-recettes non reconnues comme ingrédients du catalogue** : une ligne de fiche issue d'une sous-recette portant un `sousRecetteId` voit désormais son prix recalculé automatiquement depuis la sous-recette et son affichage cohérent (voir « Prix des sous-recettes dans les fiches », Sprints 6 à 15). Le libellé « EUR/g » de la page Sous-recettes est **corrigé — Sprint 13** (`c8240ec`). **Reste ouvert** : les lignes ajoutées avant le Sprint 8 n'ont pas d'identifiant et gardent un prix figé (aucun lien déduit du nom) — pour les rattacher, supprimer la ligne et la rajouter depuis la liste ; envisager un bouton « Relier ». | Faible pour les lignes récentes (identifiant présent) ; modéré pour les anciennes lignes (prix figé silencieusement, sans avertissement dédié depuis le Sprint 15). | Pour une ancienne ligne : supprimer la ligne et la rajouter depuis la liste des sous-recettes. |
| 23 | **Ingrédients catalogue fantômes créés avant le Sprint 7** : avant le Sprint 7 (`3b670d0`), ajouter une ligne de sous-recette dans une fiche créait automatiquement un ingrédient catalogue fantôme (même nom, prix 0) via `syncIngredientsToBase()`. **[Corrigé pour l'avenir — Sprint 7]** : la fonction lit désormais aussi les sous-recettes de l'utilisateur et ne crée plus ces entrées. | Faible — les entrées déjà créées restent en base, sans impact sur le calcul si leur prix reste à 0. | Supprimer manuellement les entrées fantômes existantes dans la page Ingrédients. |
| 24 | **Changement de famille d'unité de production d'une sous-recette** : si une sous-recette change d'unité de production vers une autre famille (ex. `g` → `piece`), les lignes de fiche qui la référencent avec leur unité d'origine retombent sur le comportement antérieur (catalogue puis prix de la ligne) dès le prochain chargement, car `memeFamilleUnite` renvoie faux côté serveur. | Faible à modéré — le prix affiché peut redevenir un prix figé sans avertissement dédié à ce cas précis. | Vérifier les lignes concernées après tout changement d'unité de production d'une sous-recette. |
| 25 | **Infobulle du champ prix désactivé (`disabled`) potentiellement invisible** : le `title` HTML d'un `<input disabled>` peut ne pas s'afficher au survol selon le navigateur/la plateforme (comportement natif variable). | Faible — information redondante avec l'étiquette d'unité affichée en lecture. | Se fier à l'étiquette affichée en lecture plutôt qu'à l'infobulle en édition. |
| 26 | **`IngredientAutocomplete` non alimenté en sous-recettes dans `NouvelleRecette.jsx`** : la prop `sousRecettes` n'est pas passée depuis `NouvelleRecette.jsx`, donc aucune sous-recette ne peut y être choisie ni suivie lors de la création d'une fiche. | Modéré — une sous-recette ne peut être liée qu'après création, depuis `FicheTechnique.jsx`. | Créer la fiche puis ajouter les lignes de sous-recette depuis `FicheTechnique.jsx` en mode édition. |
| 27 | **Liste de suggestions `IngredientAutocomplete` à la largeur du champ nom** : les noms longs de catalogue ou de sous-recette sont coupés visuellement dans le menu déroulant. | Faible — cosmétique. | Élargir la fenêtre ou vérifier le nom complet dans le catalogue/la liste Sous-recettes. |
| 28 | **[À vérifier] Marge unitaire Menu Engineering potentiellement mélangeant TTC et HT** : la marge unitaire semble calculée avec un prix de vente TTC et un coût matière HT — **non confirmé dans le code**. | À déterminer — dépend de la confirmation. | Vérifier le calcul avant de communiquer les marges affichées comme fiables. |
| 29 | **[À vérifier] Message "Urgent, vous perdez de l'argent à chaque vente" sur marge négative** : un plat sans prix de vente est affiché avec ce message et une marge négative — **comportement et déclenchement exact non confirmés dans le code**. | À déterminer — dépend de la confirmation. | Vérifier si ce message s'affiche à tort pour un plat simplement sans prix renseigné, plutôt qu'à marge réellement négative. |

---

## Ce qui reste à faire

### Priorité haute
- [x] **Mentions légales** : page `/mentions-legales`
- [x] **Emails de relance essai** : séquence J+9 / J+12 / J+14 + post-essai J+2 / J+7 / J+15 / J+40
- [x] **Emails lifecycle** : J+4 (sans fiche), J+8 (sans fiche), J+4 post-vérification (onboarding incomplet)
- [x] **CRM Admin** : tableau, filtres, tri colonnes, fiche client drawer, accès à vie
- [x] **Lazy loading React** : `React.lazy()` sur les pages > 50KB (MenuEngineering, Ingredients, FicheTechnique, Cartes)
- [x] **Index MongoDB** : vérifier/créer index sur `users.id` dans Atlas
- [ ] Import/export CSV des ingrédients
- [x] Sprint 3 : signal visuel sur les lignes incomplètes (quantité 0 ou unité inconnue).
- [x] Diagnostic puis correction du matching de prix côté serveur (`matchIngredientPrice()` dans `ia.js`).
- [x] Message ou champ non modifiable sur le prix d'une ligne associée au catalogue (texte à valider avec Seb). (message : Sprint 5 ; champ grisé pour les lignes de sous-recette suivies : Sprint 14 ; reste modifiable pour les lignes du catalogue, voir bug #19)
- [x] Vérification de la famille d'unité (masse/volume/pièce) avant d'appliquer un prix catalogue. (Sprint 4, partiel : FicheTechnique uniquement, pièce vs masse/volume)
- [ ] Vérifier que l'IA convertit bien « cuillère à soupe » en `c.s` ou `ml` (cas observé : huile d'olive sortie à `0 g` sans mention).

### Priorité moyenne
- [ ] Recherche et filtres sur la liste des fiches (par catégorie, food cost, allergène présent)
- [ ] Export PDF de la carte complète (menu imprimable client)
- [ ] Indicateurs visuels fiches incomplètes dans la liste (sans prix, sans ingrédients)
- [ ] Historique des modifications d'une fiche (versioning léger)
- [ ] Section "Plat du jour" dans les cartes (mise en avant visuelle)
- [ ] Page Aide → lier le product tour aux vraies cibles DOM de chaque section
- [ ] `NouvelleRecette.jsx` et `SousRecettes.jsx` ont été alignés sur les unités officielles (`g`, `kg`, `ml`, `L`, `pièce`, `c.s`, `c.c`) lors du sprint unités/prix (commit `7a1ee78`), mais aucune migration des données existantes n'a été faite : certaines fiches anciennes peuvent encore contenir `tranche`, `botte` ou `piece` (sans accent) en base.
- [ ] Sprint 2b : supprimer les doublons de tables de conversion côté client (`baseUnit` dans `FicheTechnique.jsx`/`Ingredients.jsx`, `CONV` dans `IngredientAutocomplete.jsx`/`SousRecettes.jsx`) en les remplaçant par un import depuis `conversions.js` ; pour la copie serveur (`server/lib/conversions.js`, imposée par Render), s'appuyer sur `node server/scripts/verifier-conversions.js` pour valider l'alignement avant toute modification.
- [ ] Import de fiche (`ImportFicheModal`) : conserver le nom d'origine à l'association au catalogue, revoir l'option par défaut "Créer sans prix".
- [ ] Aliases : empêcher la création d'alias contenant une quantité, traiter les alias déjà créés en ce sens.
- [ ] Migration des unités legacy en base, après création d'un environnement isolé.
- [ ] Étendre le signal de famille d'unité à `NouvelleRecette.jsx` si besoin.
- [x] Diagnostic puis traitement des sous-recettes comme ingrédients (reconnaissance dans les fiches, prix suivi, faux avertissements, libellé "EUR/g") — Sprints 6 à 15.
- [ ] Bouton « Relier » pour associer une ancienne ligne de sous-recette (sans identifiant) à sa sous-recette, sans supprimer/rajouter la ligne.
- [ ] Élargir la liste de suggestions d'`IngredientAutocomplete` (bug #27).
- [ ] Harmoniser la comparaison de noms client/serveur/IA (fonction de normalisation commune).
- [ ] Confirmation visible après le bouton "Sauvegarder" de `FicheTechnique.jsx` (texte à valider avec Seb).
- [ ] Décider si l'adresse technique `cloveria-fichetech.vercel.app` doit être désactivée ou redirigée vers `app.cloveria-pro.fr` (bug CORS silencieux).

### Priorité basse / idées
- [ ] QR Code allergènes (lien vers Format B en ligne)
- [ ] Calcul commandes fournisseurs depuis un nombre de couverts prévu
- [ ] Multi-restaurants (1 compte = N établissements)
- [ ] Application mobile (PWA)

### Modifications diverses en attente
- [ ] Landing page : corriger le bug de remplacement des href footer par `/#` (source externe probable — extension navigateur ou service worker)
- [ ] Vérifier le déclenchement correct du product tour sur mobile (scroll + highlight)
- [ ] Ajouter `rel="noopener noreferrer"` systématiquement sur tous les liens externes `target="_blank"`
- [x] CORS : confirmer que `CORS_ORIGIN` est défini sur Render

### À vérifier, non confirmé
- [x] `JWT_SECRET` réellement défini sur Render (une valeur par défaut est codée en dur dans `server/middleware/auth.js` ET dans `server/routes/auth.js`) — confirmé par Seb le 2026-10-01
- [x] `CORS_ORIGIN` défini sur Render en production — confirmé par Seb le 2026-10-01 (ajouté)
- [ ] Exécution effective des crons quotidiens (relances/lifecycle) sur le plan gratuit Render
- [ ] Limite de stockage 512 Mo de MongoDB Atlas M0 — marge restante non vérifiée
- [ ] Quotas d'usage des appels IA (Anthropic) — aucun suivi/limite applicatif identifié — traité : quota mensuel par utilisateur, Sprint S7, d1ba0fe ; coût réel par appel non mesuré
- [ ] Route Stripe portal (gestion abonnement côté client) — traité : Sprint S2c, 2e85441 ; non testé de bout en bout
- [ ] Règle de purge RGPD des comptes archivés (soft delete) — délai de conservation non vérifié

---

## Règles de travail avec Claude Code

- Toujours **lire les fichiers concernés** avant de modifier
- **Scope lock** : préciser quels fichiers peuvent être modifiés dans chaque sprint
- Un seul repo à la fois (`cloveria-fichetech` ou `cloveria-landing`)
- Toujours terminer par `git add . && git commit && git push`
- Ne jamais modifier le design, les textes produit ou les données sans validation explicite
- Prompt en langage naturel — un sprint = une chose bien délimitée
