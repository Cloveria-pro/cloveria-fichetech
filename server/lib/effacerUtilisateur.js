// Les 12 collections qui portent un user_id et doivent être effacées avec le compte (Sprint S10).
export const COLLECTIONS_UTILISATEUR = [
  'recettes',
  'ingredients',
  'cartes',
  'sous_recettes',
  'aliases',
  'historique_prix',
  'parametres',
  'agenda',
  'ventes_imports',
  'documents_ventes',
  'documents_fiches',
  'documents_factures',
];

// Efface réellement toutes les données d'un utilisateur. Idempotente : relançable sans erreur
// (deleteMany sur un filtre déjà vide ne fait rien ; deleteOne sur un document déjà supprimé ne
// fait rien). Ordre : (a) users.deleted/disabled d'abord pour couper l'accès immédiatement,
// (b) les 12 collections, (c) le document users en dernier, pour ne libérer l'adresse email que
// si tout le reste a réussi. Si une étape échoue, l'erreur est relancée et users n'est JAMAIS
// supprimé. Ne retourne jamais d'adresse ni de donnée personnelle — uniquement des comptages.
export async function effacerDonneesUtilisateur(db, userId) {
  try {
    await db.collection('users').updateOne({ id: userId }, { $set: { deleted: true, disabled: true } });
    await db.collection('users').updateOne(
      { id: userId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date().toISOString() } }
    );
  } catch (err) {
    err.collection = 'users';
    throw err;
  }

  const comptages = {};
  for (const collection of COLLECTIONS_UTILISATEUR) {
    try {
      const { deletedCount } = await db.collection(collection).deleteMany({ user_id: userId });
      comptages[collection] = deletedCount;
    } catch (err) {
      err.collection = collection;
      throw err;
    }
  }

  try {
    await db.collection('users').deleteOne({ id: userId });
  } catch (err) {
    err.collection = 'users';
    throw err;
  }

  return comptages;
}
