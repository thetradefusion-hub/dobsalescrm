import {
  getFirebaseClientConfig,
  isFirebaseClientConfigured,
} from '@/lib/firebase/config'

/**
 * Firebase default web push worker path.
 * Data-only FCM messages → onBackgroundMessage → showNotification.
 */
export async function GET() {
  const config = getFirebaseClientConfig()
  const configured = isFirebaseClientConfigured()

  const body = configured
    ? `
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var n = (payload && payload.notification) || {};
  var data = (payload && payload.data) || {};
  var title = n.title || data.title || 'New WhatsApp Message';
  var bodyText = n.body || data.body || '';
  var conversationId = data.conversationId || '';
  return self.registration.showNotification(title, {
    body: bodyText,
    icon: '/dobicon.png',
    badge: '/dobicon.png',
    tag: conversationId ? 'wacrm-message-' + conversationId : 'wacrm-message',
    data: Object.assign({}, data, { conversationId: conversationId }),
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  var conversationId = data.conversationId;
  var targetUrl = data.url
    ? data.url
    : conversationId && conversationId !== 'test'
      ? self.location.origin + '/inbox?c=' + encodeURIComponent(conversationId)
      : self.location.origin + '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        try {
          if (new URL(client.url).origin === self.location.origin) {
            if ('navigate' in client) client.navigate(targetUrl);
            return client.focus();
          }
        } catch (e) {}
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
`
    : `
console.warn('[fcm-sw] Firebase is not configured');
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
