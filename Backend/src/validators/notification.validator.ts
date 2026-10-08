import { z } from 'zod';

// The backend POSTs to a device's endpoint when an alert goes out, so only
// real push services (Chrome/Android, Firefox, Safari, Edge) are accepted.
const PUSH_SERVICE = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/;

const endpoint = z
  .string()
  .url()
  .max(1000)
  .refine((url) => {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && PUSH_SERVICE.test(hostname);
  }, 'Not a push service address.');

/** A browser's PushSubscription.toJSON(). */
export const pushSubscriptionSchema = z.object({
  endpoint,
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export const pushEndpointSchema = z.object({ endpoint: z.string().max(1000) });
