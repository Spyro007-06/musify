import SlugifyLib from 'slugify';

/**
 * Generate a URL-safe slug from a string.
 * Appends a random suffix to guarantee uniqueness.
 */
export const slugify = (text: string, suffix?: string): string => {
  const base = SlugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });
  if (suffix) return `${base}-${suffix}`;
  return base;
};

/**
 * Generate a unique slug by appending a short random string.
 */
export const uniqueSlug = (text: string): string => {
  const random = Math.random().toString(36).substring(2, 7);
  return slugify(text, random);
};

