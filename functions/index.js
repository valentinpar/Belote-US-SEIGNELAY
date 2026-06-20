const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendPushNotification = functions.region('europe-west1').database
  .ref('/foot_push_queue/{pushId}')
  .onCreate(async (snap, context) => {
    const data = snap.val();
    await snap.ref.remove();
    if (!data || !data.ts) return null;

    const targets = data.targets || (data.target ? [data.target] : ['all']);
    const title   = data.title || 'US Seignelay';
    const body    = data.body  || '';

    const tokensSnap = await admin.database().ref('foot_fcm_tokens').once('value');
    const tokensData = tokensSnap.val() || {};

    const tokenSet = new Set();
    Object.values(tokensData).forEach(entry => {
      if (!entry || !entry.token) return;
      const matches = targets.some(target => {
        if (target === 'all') return true;
        if (target === 'index') return entry.source === 'index';
        if (target === 'tournoi') {
          const hasTeam = entry.teams && Object.values(entry.teams).some(v => v === true);
          return entry.source === 'tournoi' || hasTeam;
        }
        return entry.teams && entry.teams[target] === true;
      });
      if (matches) tokenSet.add(entry.token);
    });

    const tokens = [...tokenSet];
    if (!tokens.length) return null;

    const batchSize = 500;
    const batches = [];
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch =>
        admin.messaging().sendEachForMulticast({
          tokens: batch,
          // ⚠️ PAS de champ "notification" → évite l'affichage automatique par iOS
          // Le service worker gère l'affichage via onBackgroundMessage
          data: {
            title: title,
            body:  body
          },
          webpush: {
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
