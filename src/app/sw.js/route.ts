import {
  getFirebaseClientConfig,
  isFirebaseClientConfigured,
} from '@/lib/firebase/config'

export async function GET() {
  const firebaseBlock = isFirebaseClientConfigured()
    ? `
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(getFirebaseClientConfig())});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function (payload) {
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || 'New WhatsApp Message';
  const options = {
    body: n.body || '',
    icon: n.icon || '/globe.svg',
    badge: '/globe.svg',
    tag: data.conversationId ? 'wacrm-message-' + data.conversationId : 'wacrm-message',
    data: data,
    vibrate: [100, 50, 100],
  };
  self.registration.showNotification(title, options);
});
`
    : ''

  const body = `${firebaseBlock}
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const conversationId = event.notification.data?.conversationId;
  const targetUrl = conversationId
    ? self.location.origin + '/inbox?id=' + conversationId
    : self.location.origin + '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.pathname.startsWith('/inbox') || clientUrl.pathname.startsWith('/dashboard')) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
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
