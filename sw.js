importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDnjxRbAzDJPMUcvoNsB5hoHQnMTP7lZb4",
  authDomain: "belote-us-seignelay.firebaseapp.com",
  databaseURL: "https://belote-us-seignelay-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "belote-us-seignelay",
  storageBucket: "belote-us-seignelay.firebasestorage.app",
  messagingSenderId: "881100486907",
  appId: "1:881100486907:web:a04a29dd9683ad8fa9d85e"
});

const messaging = firebase.messaging();

// Reçoit uniquement les messages "data only" (pas de doublon avec notification auto)
messaging.onBackgroundMessage(function(payload) {
  var title = (payload.data && payload.data.title) || 'US Seignelay';
  var body  = (payload.data && payload.data.body)  || '';
  return self.registration.showNotification(title, {
    body:    body,
    icon:    '/Belote-US-SEIGNELAY/logo-192.png',
    badge:   '/Belote-US-SEIGNELAY/logo-192.png',
    vibrate: [200, 100, 200],
    data:    { url: 'https://valentinpar.github.io/Belote-US-SEIGNELAY/tournoi-foot.html' }
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url)
    || 'https://valentinpar.github.io/Belote-US-SEIGNELAY/tournoi-foot.html';
  event.waitUntil(clients.openWindow(url));
});
