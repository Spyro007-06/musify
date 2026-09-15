---
name: Vibe
colors:
  surface: '#0d150d'
  surface-dim: '#0d150d'
  surface-bright: '#333b32'
  surface-container-lowest: '#081008'
  surface-container-low: '#151e15'
  surface-container: '#192219'
  surface-container-high: '#232c23'
  surface-container-highest: '#2e372e'
  on-surface: '#dce5d8'
  on-surface-variant: '#bbcbb8'
  inverse-surface: '#dce5d8'
  inverse-on-surface: '#2a3329'
  outline: '#859583'
  outline-variant: '#3c4a3c'
  surface-tint: '#34e36a'
  primary: '#4cf479'
  on-primary: '#003913'
  primary-container: '#1ed760'
  on-primary-container: '#005721'
  inverse-primary: '#006e2c'
  secondary: '#c9bfff'
  on-secondary: '#2e009c'
  secondary-container: '#4720ca'
  on-secondary-container: '#baaeff'
  tertiary: '#bfd9ff'
  on-tertiary: '#00315b'
  tertiary-container: '#8cbeff'
  on-tertiary-container: '#004c87'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#69ff89'
  primary-fixed-dim: '#34e36a'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#00531f'
  secondary-fixed: '#e5deff'
  secondary-fixed-dim: '#c9bfff'
  on-secondary-fixed: '#1a0063'
  on-secondary-fixed-variant: '#441cc8'
  tertiary-fixed: '#d3e4ff'
  tertiary-fixed-dim: '#a2c9ff'
  on-tertiary-fixed: '#001c38'
  on-tertiary-fixed-variant: '#004881'
  background: '#0d150d'
  on-background: '#dce5d8'
  surface-variant: '#2e372e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system is centered on an immersive, "night-mode-first" experience designed for deep focus and emotional resonance with music. It targets a sophisticated audience that appreciates high-fidelity aesthetics and digital craftsmanship.

The visual style is a fusion of **Glassmorphism** and **Modern Minimalism**. It utilizes deep layers of transparency, background blurs, and vibrant accent glows to simulate a physical glass interface floating over a cosmic void. Every interaction should feel fluid and weightless, using subtle scaling and light-based feedback rather than heavy-handed transitions.

## Colors
This design system utilizes a high-contrast dark palette to make cover art and media content the focal point. 

- **Primary (Green):** Reserved for high-priority actions and active states (Play, Toggle ON).
- **Secondary (Purple) & Tertiary (Blue):** Used for ambient glows, mood-based gradients, and secondary visual interest.
- **Glass Surfaces:** Surface colors are implemented with varying degrees of opacity (typically 40-70%) combined with a `backdrop-filter: blur(20px)` to create depth.
- **Neon Accents:** Brand colors should be applied with an outer glow (box-shadow) to simulate neon lighting in active states.

## Typography
The typography system relies on **Inter** for its systematic clarity and modern neutral profile, which balances the expressive nature of the glassmorphic UI.

**Headings** utilize tight letter-spacing and heavy weights to command attention, especially for artist names and playlist titles. **Labels** are often uppercase with slight tracking to provide a technical, "instrument-panel" feel. All text levels must maintain high contrast against the dark background, defaulting to `Text Secondary` for metadata to maintain visual hierarchy.

## Layout & Spacing
The design system employs a **Fluid Grid** approach. 

- **Desktop:** 12-column grid with wide 48px margins to allow the glass elements room to breathe.
- **Mobile:** 4-column grid with 16px margins.
- **Spacing Rhythm:** Based on a 4px baseline. Components should generally use `16px (md)` or `24px (lg)` for internal padding to maintain a spacious, premium feel. 
- **Transitions:** Use a standard duration of `200ms` with a `cubic-bezier(0.4, 0, 0.2, 1)` easing for all layout shifts and hover states.

## Elevation & Depth
Depth is conveyed through **Backdrop Blurs** and **Ambient Glows** rather than traditional black shadows.

1.  **Level 0 (Base):** The solid `#0B0B0F` background.
2.  **Level 1 (Cards):** `#18181F` with 60% opacity, a 1px border of white at 10% opacity, and a 20px blur.
3.  **Level 2 (Modals/Overlays):** 80% opacity with a subtle outer glow using the secondary purple color at very low (5%) opacity.
4.  **Interactive Elements:** Active buttons or playing tracks should feature a "Neon Glow" using `box-shadow: 0 0 15px [accent-color]`.

## Shapes
This design system uses a generous roundedness profile to soften the technical nature of the dark mode. 

- **Standard Components:** Buttons and small input fields use a `0.5rem` (8px) radius.
- **Cards & Containers:** Track and Album cards use `rounded-lg` (16px) or `rounded-xl` (24px) for a more organic, modern look. 
- **Search Bars:** Should be fully pill-shaped (radius: 9999px) to differentiate input actions from content containers.

## Components

- **Glass Buttons:** Primary buttons use the Accent Green with a slight gradient. Secondary buttons use a glass effect: semi-transparent white background with a blur filter and a thin, high-contrast white border.
- **Media Cards:** Feature a `scale(1.04)` transition on hover. The card title should shift from `Text Secondary` to `Text Primary` upon interaction.
- **Progress Bars:** The track seeker should be a thin 4px line. The "active" portion should use a gradient from Blue to Green with a small circular handle that glows when hovered.
- **Search Inputs:** Minimalist, pill-shaped designs with a 10% white fill. The icon should be `Text Secondary` and shift to the Primary Green when the input is focused.
- **List Items:** Track lists should have no visible borders; instead, use a subtle `#FFFFFF` (alpha 0.05) background on hover to define the row.
- **Glow Accents:** Use "Ambient Orbs" (large, blurred radial gradients) in the background of the application that slowly move or change color based on the current track's genre or album art.