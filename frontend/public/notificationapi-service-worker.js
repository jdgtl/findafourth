/**
 * NotificationAPI Service Worker
 * Handles web push notifications for FindaFourth
 *
 * This service worker is required for receiving push notifications
 * when the app is not in the foreground.
 */

self.addEventListener('push', function(event) {
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();

    const options = {
      body: data.body || data.message || '',
      icon: data.icon || '/logo192.png',
      badge: '/logo192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || data.link || '/',
        ...data
      },
      actions: data.actions || [],
      tag: data.tag || 'findafourth-notification',
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FindaFourth', options)
    );
  } catch (error) {
    console.error('Error processing push notification:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window/tab open with our app
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  // Optional: Track notification dismissals
  console.log('Notification closed:', event.notification.tag);
});
