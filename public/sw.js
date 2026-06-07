// Service Worker for wacrm Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let title = 'New WhatsApp Message';
  let options = {
    body: '',
    icon: '/globe.svg',
    badge: '/globe.svg',
    vibrate: [100, 50, 100],
    data: {},
    tag: 'wacrm-message'
  };

  try {
    const payload = event.data.json();
    title = payload.title || title;
    options.body = payload.body || '';
    options.icon = payload.icon || options.icon;
    options.badge = payload.badge || options.badge;
    options.data = payload.data || {};
    options.tag = payload.tag || options.tag;
  } catch (e) {
    // Fallback if not JSON
    options.body = event.data.text() || '';
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const conversationId = event.notification.data?.conversationId;
  const targetUrl = conversationId
    ? `${self.location.origin}/inbox?id=${conversationId}`
    : `${self.location.origin}/inbox`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        // Find if any tab is already open with the dashboard / inbox URL
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname.startsWith('/inbox') || clientUrl.pathname.startsWith('/dashboard')) {
            // Focus current tab and navigate
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no tab is open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Pass-through fetch event handler required for PWA installability audits
self.addEventListener('fetch', function (event) {
  event.respondWith(fetch(event.request));
});

