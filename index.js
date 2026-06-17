const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendPushNotification = functions.region('europe-west1').database
  .ref('/foot_push_queue/{pushId}')
  .onCreate(async (snap, context) => {
    const data = snap.val();
    await snap.ref.remove();
    if (!data || !data.ts) return null;

    const target = data.target || 'all';
    const title  = data.title  || '📢 US Seignelay';
    const body   = data.body   || '';

    const tokensSnap = await admin.database().ref('foot_fcm_tokens').once('value');
    const tokensData = tokensSnap.val() || {};

    const validTokens = [];
    Object.values(tokensData).forEach(entry => {
      if (!entry || !entry.token) return;
      if (target === 'all') {
        // Tout le monde
        validTokens.push(entry.token);
      } else if (target === 'index') {
        // Visiteurs de la page d'accueil
        if (entry.source === 'index') validTokens.push(entry.token);
      } else if (target === 'tournoi') {
        // Visiteurs du tournoi (sans filtre équipe)
        if (entry.source === 'tournoi') validTokens.push(entry.token);
      } else {
        // Équipe spécifique (teamId)
        if (entry.teams && entry.teams[target]) validTokens.push(entry.token);
      }
    });

    if (!validTokens.length) return null;
    const tokens = [...new Set(validTokens)];

    const batchSize = 500;
    const batches = [];
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

    // Nettoyer les tokens invalides
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
