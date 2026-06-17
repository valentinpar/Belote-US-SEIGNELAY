const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Se déclenche quand un élément est ajouté à /foot_push_queue
 * Envoie la notification FCM aux bons appareils et supprime l'entrée
 */
exports.sendPushNotification = functions.database
  .ref('/foot_push_queue/{pushId}')
  .onCreate(async (snap, context) => {
    const data = snap.val();

    // Supprimer l'entrée de la queue immédiatement (évite les doublons)
    await snap.ref.remove();

    if (!data || !data.ts) return null;

    const target = data.target || 'all';
    const title  = data.title  || '📢 US Seignelay';
    const body   = data.body   || '';

    // Récupérer tous les tokens FCM enregistrés
    const tokensSnap = await admin.database().ref('foot_fcm_tokens').once('value');
    const tokensData = tokensSnap.val() || {};

    // Filtrer selon la cible
    const validTokens = [];
    Object.values(tokensData).forEach(entry => {
      if (!entry || !entry.token) return;
      if (target === 'all') {
        validTokens.push(entry.token);
      } else {
        // Cible = id d'une équipe → envoyer seulement aux abonnés de cette équipe
        if (entry.teams && entry.teams[target]) {
          validTokens.push(entry.token);
        }
      }
    });

    if (!validTokens.length) return null;

    // Dédoublonner
    const tokens = [...new Set(validTokens)];

    // Envoyer par lots de 500 (limite FCM)
    const batchSize = 500;
    const batches   = [];
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch =>
        admin.messaging().sendEachForMulticast({
          tokens: batch,
          notification: { title, body },
          webpush: {
            notification: {
              icon:  'https://valentinpar.github.io/Belote-US-SEIGNELAY/logo-192.png',
              badge: 'https://valentinpar.github.io/Belote-US-SEIGNELAY/logo-192.png',
              vibrate: [200, 100, 200]
            },
            fcm_options: {
              link: 'https://valentinpar.github.io/Belote-US-SEIGNELAY/tournoi-foot.html'
            }
          }
        })
      )
    );

    // Nettoyer les tokens invalides de la base
    const invalidTokens = [];
    results.forEach((result, batchIdx) => {
      result.responses.forEach((resp, tokenIdx) => {
        if (!resp.success) {
          const code = resp.error && resp.error.code;
          if (code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(batches[batchIdx][tokenIdx]);
          }
        }
      });
    });

    if (invalidTokens.length > 0) {
      const updates = {};
      Object.entries(tokensData).forEach(([key, entry]) => {
        if (entry && invalidTokens.includes(entry.token)) {
          updates['foot_fcm_tokens/' + key] = null;
        }
      });
      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }
    }

    return null;
  });
