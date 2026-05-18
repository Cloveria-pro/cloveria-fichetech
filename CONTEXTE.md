# CloverIA FicheTech — Contexte projet

> Dernière mise à jour : 2026-05-18

---

## URLs de déploiement

| Environnement | URL |
|---|---|
| **Backend (Render)** | `https://cloveria-fichetech.onrender.com` |
| **API base** | `https://cloveria-fichetech.onrender.com/api` |
| **Frontend (Vercel)** | configuré via `client/vercel.json` |
| **Health check** | `GET /api/health` → `{ "status": "ok" }` |

**Compte démo** : `demo@cloveria.fr` / `Demo1234!`  
Créé automatiquement au démarrage du serveur si absent (`user_id: "demo"`).

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
- Dev : `node --watch index.js`

### Frontend (`client/`)
- React 18, Vite 5
- React Router v6
- Recharts 3 (graphiques sparkline historique prix)
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (drag & drop)
- Build : `vite build` | Dev : `vite`

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

---

## Structure des fichiers

```
cloveria-fichetech/
├── package.json                    # scripts dev + install:all (concurrently)
├── CONTEXTE.md                     # ce fichier
├── server/
│   ├── index.js                    # point d'entrée Express, montage routes, fail-fast MongoDB
│   ├── db.js                       # singleton getDb() + seed automatique si collection vide
│   ├── env.js                      # chargement dotenv
│   ├── middleware/auth.js           # vérifie JWT → req.userId
│   ├── routes/
│   │   ├── auth.js                 # /auth/login, /auth/register
│   │   ├── recettes.js             # CRUD + PUT /:id/prix (sync cascade)
│   │   ├── ingredients.js          # CRUD
│   │   ├── cartes.js               # CRUD
│   │   ├── parametres.js           # GET/PUT (1 doc par user)
│   │   ├── ia.js                   # /structurer, /description-commerciale, /analyser-facture
│   │   ├── aliases.js              # GET/POST (upsert) — mapping noms ingrédients
│   │   └── historique_prix.js      # GET/POST/DELETE — horodatage ISO 8601 complet
│   └── data/                       # JSON de seed (insérés si collection vide au démarrage)
│       ├── users.json, ingredients.json, recettes.json
│       ├── cartes.json, parametres.json, historique_prix.json
└── client/
    ├── vercel.json
    └── src/
        ├── main.jsx                # ReactDOM + BrowserRouter
        ├── App.jsx                 # Layout sidebar + routes protégées
        ├── api.js                  # Toutes les fonctions fetch centralisées
        ├── utils.js                # coutIng, coutPortionHT/TTC, foodCostPct, prixSuggereTTC
        ├── conversions.js          # Table unités → base (kg, L, pièce)
        ├── pages/
        │   ├── Dashboard.jsx       # KPIs globaux + food cost moyen
        │   ├── Recettes.jsx        # Liste fiches techniques
        │   ├── NouvelleRecette.jsx # Création par IA (description libre)
        │   ├── FicheTechnique.jsx  # Détail + édition + calculs + export PDF
        │   ├── Ingredients.jsx     # CRUD + historique prix + comparaison fournisseurs
        │   ├── Cartes.jsx          # Éditeur cartes (EditeurCarte) + vue consultant (VueCarte)
        │   ├── Parametres.jsx      # Food cost cible, TVA, nom établissement
        │   └── Login.jsx / Register.jsx
        └── components/
            ├── EtapesEditor.jsx    # Éditeur étapes avec DnD + insert gap
            └── IngredientAutocomplete.jsx
```

---

## Modèle de données MongoDB

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
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

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

---

## Routes API

Toutes les routes sauf `/api/auth/*` et `/api/health` requièrent `Authorization: Bearer <token>`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion → JWT |
| GET | `/api/health` | Health check public |
| GET | `/api/recettes` | Liste + enrichissement prixUnitaire |
| GET | `/api/recettes/:id` | Détail + enrichissement |
| POST | `/api/recettes` | Création |
| PUT | `/api/recettes/:id` | Mise à jour complète |
| **PUT** | **`/api/recettes/:id/prix`** | **Met à jour `prixVentePratiqueTTC` ET synchronise `prixVente` dans TOUTES les cartes contenant cette recette** |
| DELETE | `/api/recettes/:id` | Suppression |
| GET/POST/PUT/DELETE | `/api/ingredients/:id?` | CRUD ingrédients |
| GET/POST/PUT/DELETE | `/api/cartes/:id?` | CRUD cartes |
| GET/PUT | `/api/parametres` | Paramètres utilisateur |
| POST | `/api/ia/structurer` | Description libre → fiche complète (JSON) |
| POST | `/api/ia/description-commerciale` | Génère `description_commerciale` pour fiche existante |
| POST | `/api/ia/analyser-facture` | Image/PDF facture → liste produits JSON |
| GET/POST/DELETE | `/api/historique-prix` | Historique prix ingrédients |
| GET/POST | `/api/aliases` | Mapping noms ingrédients (upsert) |

---

## Fonctionnalités implémentées

### Authentification
- Inscription / connexion email + mot de passe (bcrypt round 10, JWT 7j)
- Compte démo auto-créé au démarrage : `demo@cloveria.fr` / `Demo1234!`
- Token en `localStorage`, headers `Authorization: Bearer` sur tous les appels
- Isolation stricte par `user_id` — les ingrédients `demo` sont visibles par tous les utilisateurs

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

---

## Bugs connus

| # | Description | Impact | Contournement |
|---|---|---|---|
| 1 | **`bar` absent du scan allergènes auto** : mot trop ambigu (bar = établissement). | Mineur — faux négatif sur le poisson "bar". | Activer manuellement le badge "poisson". |
| 2 | **`vin` absent du scan sulfites** : risquerait de matcher dans "vinaigre". Seuls "vinaigre balsamique" et "vinaigre de vin" déclenchent sulfites. | Mineur — faux négatif sur les recettes avec du vin. | Activer manuellement "sulfites". |
| 3 | **Allergènes détectés en editMode non sauvegardés immédiatement** : le scan dans EtapesEditor met à jour `form.allergenes` mais la sauvegarde MongoDB n'arrive qu'au clic "Sauvegarder". En mode lecture, le toggle badge sauvegarde immédiatement. | Mineur — risque de perte si fermeture sans sauvegarde. | Toujours cliquer "Sauvegarder" après avoir modifié les étapes. |
| 4 | **Render cold start** : backend en plan gratuit, peut mettre 30-60 s à répondre après inactivité. | Gênant en démo — première requête lente. | Aucun — limitation plan gratuit Render. |

---

## Ce qui reste à faire

### Priorité haute
- [ ] Isolation des données démo : les données du compte `demo` ne devraient pas être partagées entre tous les utilisateurs non-démo
- [ ] Duplication d'une fiche technique
- [ ] Import/export CSV des ingrédients

### Priorité moyenne
- [ ] Recherche et filtres sur la liste des fiches (par catégorie, food cost, allergène présent)
- [ ] Export PDF de la carte complète (menu imprimable client)
- [ ] Indicateurs visuels fiches incomplètes dans la liste (sans prix, sans ingrédients)
- [ ] Historique des modifications d'une fiche (versioning léger)
- [ ] Section "Plat du jour" dans les cartes (mise en avant visuelle)

### Priorité basse / idées
- [ ] QR Code allergènes (lien vers Format B en ligne)
- [ ] Calcul commandes fournisseurs depuis un nombre de couverts prévu
- [ ] Multi-restaurants (1 compte = N établissements)
- [ ] Application mobile (PWA)
