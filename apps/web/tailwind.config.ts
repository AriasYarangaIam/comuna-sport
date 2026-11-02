import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4FAFF',
        surface: '#FFFFFF',
        tint: '#E9F4FD',
        border: { DEFAULT: '#CDE4F7', strong: '#A9BDCD' },
        ink: { DEFAULT: '#0C1F2E', soft: '#56718A', muted: '#8FA6B8' },
        sky: {
          50: '#F2F9FF',
          100: '#E3F2FF',
          200: '#C9E6FE',
          300: '#A5D5FB',
          400: '#74BEF5',
          500: '#3FA3E8',
          600: '#1E86C9',
          700: '#15699E',
          800: '#124F77',
          900: '#0D3A58',
        },
        success: { bg: '#E4F7F1', text: '#0E7C63' },
        warning: { bg: '#FFF3E0', text: '#9A5B00' },
        danger: { bg: '#FDECEA', text: '#B42318' },
        info: { bg: '#E3F2FF', text: '#124F77' },
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        sheet: '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,31,46,0.06)',
        raised: '0 8px 24px rgba(18,79,119,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '600' }],
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-md': ['22px', { lineHeight: '30px', fontWeight: '600' }],
        'headline-sm': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        small: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'space-2xl': '2rem',
        'space-3xl': '3rem',
        'space-4xl': '4rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
