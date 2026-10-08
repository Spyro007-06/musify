import { apiClient } from '@/lib/api/client';
import { toast } from '@/stores/toast-store';

/**
 * New-release alerts on this device (Web Push). The backend checks followed
 * artists a few times a day (Backend/src/services/releaseAlerts.service.ts)
 * and public/sw.js shows what it sends. iPhones only get them once Musify is
 * added to the home screen (iOS 16.4+).
 */

export function alertsSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function subscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function alertsOn(): Promise<boolean> {
  return alertsSupported() && Notification.permission === 'granted' && Boolean(await subscription());
}

// The server key in the form pushManager.subscribe takes everywhere.
const keyBytes = (base64url: string) => Uint8Array.from(atob(base64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

/** Call from a tap: asks for permission, then has the backend send this device alerts. */
export async function turnOnAlerts(): Promise<'on' | 'blocked' | 'unsupported'> {
  if (!alertsSupported()) return 'unsupported';
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked';
  const { data } = await apiClient.get<{ publicKey: string }>('/notifications/public-key', { requiresAuth: false });
  const registration = await navigator.serviceWorker.ready;
  const device =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data!.publicKey) }));
  await apiClient.post('/notifications/subscriptions', device.toJSON());
  return 'on';
}

/** Also on sign-out, so a shared phone stops getting the last person's alerts. */
export async function turnOffAlerts(): Promise<void> {
  const device = alertsSupported() ? await subscription() : null;
  if (!device) return;
  await device.unsubscribe();
  // Best effort: a row left behind is dropped the next time an alert to it bounces.
  await apiClient.delete('/notifications/subscriptions', { body: JSON.stringify({ endpoint: device.endpoint }) }).catch(() => {});
}

/** After a follow: offers alerts, unless they're already on or the browser blocks them. */
export async function offerAlerts(artistName: string): Promise<void> {
  if (!alertsSupported() || Notification.permission === 'denied' || (await alertsOn())) return;
  toast.success(`Following ${artistName}`, 8000, {
    label: 'Get new-song alerts',
    onClick: () => {
      turnOnAlerts()
        .then((result) => {
          if (result === 'on') toast.success("You'll get a notification when artists you follow release a song.");
          else toast.warning('Notifications are blocked for Musify. Allow them in your browser settings.');
        })
        .catch(() => toast.error("Couldn't turn on alerts. Try again."));
    },
  });
}
