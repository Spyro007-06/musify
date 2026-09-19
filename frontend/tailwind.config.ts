import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const mint = {
  50: '#eefcf6', 100: '#d5f8e9', 200: '#aff0d6',
  300: '#8ce9cb', 400: '#75e2c0', 500: '#52cda7',
  600: '#27866b', 700: '#236d57', 800: '#205645',
  900: '#1c463a', 950: '#102d24',
};

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Midnight Mint: quiet forest surfaces, mint actions, blue AI accents.
        canvas: '#0b1210',
        surface: '#101916',
        neutral: {
          50: '#f5f5ef', 100: '#e9eee7', 200: '#d3ddd4',
          300: '#b5c4ba', 400: '#9aad9f', 500: '#829589',
          600: '#62776a', 700: '#394b42', 800: '#26382e',
          900: '#15211b', 950: '#101916',
        },
        brand: mint,
        // Compatibility for older components using literal color utilities.
        emerald: mint,
        indigo: colors.blue,
        accent: colors.blue,
        danger: colors.red,
        warning: colors.amber,
        info: colors.sky,
      },
    },
  },
  plugins: [],
};

export default config;
