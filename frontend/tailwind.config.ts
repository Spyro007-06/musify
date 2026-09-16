import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Semantic aliases for the palette families already in consistent
        // use across the app: emerald for primary actions/success/likes,
        // purple for AI/accent surfaces, rose for destructive/error states.
        // Aliasing rather than hardcoding shades keeps these in lockstep
        // with Tailwind's own scale.
        brand: colors.emerald,
        accent: colors.purple,
        danger: colors.rose,
      },
    },
  },
  plugins: [],
};

export default config;
