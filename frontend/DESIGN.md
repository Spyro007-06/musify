# Musify visual identity

## Frontend audit and direction

The interface mixed pure black backgrounds, default system typography, small navigation text, white primary buttons, and hard-coded emerald/indigo accents. The refresh uses a shared Midnight Mint palette and a clearer type hierarchy while retaining existing routes and application behavior.

- Canvas: `#0B1210`; surface: `#101916`; raised surface: `#15211B`.
- Primary action / active state: mint `#75E2C0`, with dark text.
- Main text: warm white `#F5F5EF`; secondary text: `#9AAD9F`.
- AI accent: blue; danger, warning, and information retain separate semantic colors.
- DM Sans: body, controls, metadata. Space Grotesk: headings and the lowercase wordmark.

Fonts are bundled locally through `next/font/local`. Original SIL Open Font Licenses are in `public/fonts`. Existing emerald and indigo utilities alias the shared brand and accent palettes so older screens remain consistent.

## Logo

Final asset: `public/brand/musify-mark.png`. A mint waveform arranged into an M-shaped silhouette on forest charcoal. `components/layout/brand.tsx` pairs the mark with the wordmark for navigation and authentication screens. The landing page uses the larger mark, and root metadata includes it as a browser icon. Existing installable-app icon metadata is preserved.

Generated with the built-in image generation tool. Final prompt:

> Create a clean, flat, professional music app icon for MUSIFY. Strictly TWO flat colors only: background opaque dark forest #101916 and symbol solid mint #75E2C0. A centered bold capital M made as a rounded audio waveform: thick rounded vertical lines and diagonal valley, recognizable M silhouette. Icon fills 70% of square canvas. Geometric Swiss graphic design, perfectly crisp edges, absolutely NO transparency, NO glow, NO bevel, NO shadows, NO texture, NO noise, NO gradients, NO text. Single icon.

## Accessibility and verification

Visible mint keyboard outlines, explicit authentication form labels, reduced-motion support, and mint active navigation states with both a stripe and `aria-current`. Shared section titles use heading level 2.

TypeScript and targeted ESLint checks pass. Browser checks cover the landing page, login, Search app shell, and mobile navigation. The home dashboard redirects to login without an authenticated session; authenticated content and audio playback were not verified as part of this visual refresh.
