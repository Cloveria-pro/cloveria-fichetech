import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, 'data.sqlite');
let db;

export async function initDatabase() {
  db = await open({ filename: dbFile, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON');

  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    etablissement TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    tva_defaut REAL DEFAULT 10,
    food_cost_cible REAL DEFAULT 30,
    plan TEXT DEFAULT 'gratuit',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    unite TEXT NOT NULL,
    prix_unitaire REAL NOT NULL,
    categorie TEXT DEFAULT 'autre',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS recettes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    nom_carte TEXT,
    categorie TEXT DEFAULT 'plat',
    nb_couverts INTEGER DEFAULT 4,
    temps_preparation INTEGER DEFAULT 0,
    temps_cuisson INTEGER DEFAULT 0,
    etapes TEXT DEFAULT '[]',
    allergenes TEXT DEFAULT '[]',
    conseils_dressage TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS recette_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recette_id INTEGER NOT NULL,
    ingredient_id INTEGER,
    nom_libre TEXT,
    quantite REAL NOT NULL,
    unite TEXT NOT NULL,
    FOREIGN KEY (recette_id) REFERENCES recettes(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  );`);

  await db.exec(`CREATE TABLE IF NOT EXISTS cartes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    saison TEXT DEFAULT '',
    template TEXT DEFAULT 'classique',
    sections TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`);
}

export async function getDB() {
  if (!db) await initDatabase();
  return db;
}

export async function ensureDemoData() {
  const database = await getDB();
  const user = await database.get('SELECT * FROM users WHERE email = ?', 'demo@cloveria.fr');
  if (user) return;

  const passwordHash = await bcrypt.hash('Demo1234!', 10);
  const result = await database.run('INSERT INTO users (email, password_hash, etablissement, tva_defaut, food_cost_cible, plan) VALUES (?, ?, ?, ?, ?, ?)', 'demo@cloveria.fr', passwordHash, 'CloverIA Demo', 10, 30, 'gratuit');
  const userId = result.lastID;

  const ingredients = [
    ['magret de canard', 'kg', 18, 'viande'],
    ['miel', 'kg', 12, 'condiment'],
    ['vinaigre balsamique', 'L', 8, 'condiment'],
    ['patate douce', 'kg', 3, 'légume'],
    ['beurre', 'kg', 9, 'produit laitier']
  ];

  const insertIngredient = await database.prepare('INSERT INTO ingredients (user_id, nom, unite, prix_unitaire, categorie) VALUES (?, ?, ?, ?, ?)');
  const ingredientMap = {};
  for (const [nom, unite, prix, categorie] of ingredients) {
    const res = await insertIngredient.run(userId, nom, unite, prix, categorie);
    ingredientMap[nom] = res.lastID;
  }
  await insertIngredient.finalize();

  const recettes = [
    {
      nom: 'Salade tiède de magret fumé',
      nom_carte: 'Salade magret',
      categorie: 'entree',
      nb_couverts: 4,
      temps_preparation: 15,
      temps_cuisson: 5,
      etapes: ['Trancher le magret en fines lamelles.', 'Dresser sur un lit de salade verte.', 'Ajouter filet de miel et de balsamique.'],
      allergenes: ['lait'],
      conseils_dressage: 'Servir tiède avec une touche de miel.',
      ingredients: [
        { nom: 'magret de canard', quantite: 0.4, unite: 'kg' },
        { nom: 'miel', quantite: 0.05, unite: 'kg' },
        { nom: 'vinaigre balsamique', quantite: 0.03, unite: 'L' }
      ]
    },
    {
      nom: 'Magret de canard sauce miel balsamique',
      nom_carte: 'Magret miel',
      categorie: 'plat',
      nb_couverts: 4,
      temps_preparation: 25,
      temps_cuisson: 20,
      etapes: ['Saisir le magret côté peau.', 'Cuire au four 10 min.', 'Réduire le miel avec balsamique.'],
      allergenes: ['lait'],
      conseils_dressage: 'Trancher finement et napper de sauce.',
      ingredients: [
        { nom: 'magret de canard', quantite: 1.2, unite: 'kg' },
        { nom: 'miel', quantite: 0.08, unite: 'kg' },
        { nom: 'vinaigre balsamique', quantite: 0.05, unite: 'L' },
        { nom: 'beurre', quantite: 0.08, unite: 'kg' }
      ]
    },
    {
      nom: 'Purée de patate douce au beurre',
      nom_carte: 'Purée patate douce',
      categorie: 'dessert',
      nb_couverts: 4,
      temps_preparation: 20,
      temps_cuisson: 30,
      etapes: ['Cuire les patates douces.', 'Écraser avec le beurre.', 'Assaisonner et servir chaud.'],
      allergenes: ['lait'],
      conseils_dressage: 'Servir avec un filet de beurre fondu.',
      ingredients: [
        { nom: 'patate douce', quantite: 1.2, unite: 'kg' },
        { nom: 'beurre', quantite: 0.12, unite: 'kg' }
      ]
    }
  ];

  const insertRecette = await database.prepare('INSERT INTO recettes (user_id, nom, nom_carte, categorie, nb_couverts, temps_preparation, temps_cuisson, etapes, allergenes, conseils_dressage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertRecetteIngredient = await database.prepare('INSERT INTO recette_ingredients (recette_id, ingredient_id, nom_libre, quantite, unite) VALUES (?, ?, ?, ?, ?)');

  const recetteIds = [];
  for (const recette of recettes) {
    const res = await insertRecette.run(userId, recette.nom, recette.nom_carte, recette.categorie, recette.nb_couverts, recette.temps_preparation, recette.temps_cuisson, JSON.stringify(recette.etapes), JSON.stringify(recette.allergenes), recette.conseils_dressage);
    const rid = res.lastID;
    recetteIds.push(rid);
    for (const ingredient of recette.ingredients) {
      const ingredientId = ingredientMap[ingredient.nom] || null;
      await insertRecetteIngredient.run(rid, ingredientId, ingredient.nom, ingredient.quantite, ingredient.unite);
    }
  }
  await insertRecette.finalize();
  await insertRecetteIngredient.finalize();

  const sections = JSON.stringify([
    { titre: 'Entrées', recettes: [recetteIds[0]] },
    { titre: 'Plats', recettes: [recetteIds[1]] },
    { titre: 'Desserts', recettes: [recetteIds[2]] }
  ]);
  await database.run('INSERT INTO cartes (user_id, nom, saison, template, sections) VALUES (?, ?, ?, ?, ?)', userId, 'Carte de printemps 2026', 'Printemps 2026', 'classique', sections);
}

export async function getUserByEmail(email) {
  const database = await getDB();
  return database.get('SELECT * FROM users WHERE email = ?', email);
}

export async function getUserById(id) {
  const database = await getDB();
  return database.get('SELECT * FROM users WHERE id = ?', id);
}

export async function getRecipeWithIngredients(id, userId) {
  const database = await getDB();
  const recette = await database.get('SELECT * FROM recettes WHERE id = ? AND user_id = ?', id, userId);
  if (!recette) return null;
  const ingredients = await database.all(`SELECT ri.id, ri.ingredient_id, ri.nom_libre, ri.quantite, ri.unite, i.nom AS ingredient_nom, i.prix_unitaire
    FROM recette_ingredients ri
    LEFT JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE ri.recette_id = ?`, id);
  return { ...recette, ingredients };
}

export async function getCarteWithSections(id, userId) {
  const database = await getDB();
  const carte = await database.get('SELECT * FROM cartes WHERE id = ? AND user_id = ?', id, userId);
  if (!carte) return null;
  return carte;
}
