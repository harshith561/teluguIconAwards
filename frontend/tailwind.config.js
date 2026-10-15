/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#fdf2f4',
          100: '#fbe4e8',
          200: '#f7cdd5',
          300: '#f2a8b6',
          400: '#e7798e',
          500: '#d9596b',
          600: '#c1353f',
          700: '#a12631',
          800: '#8a2232',
          900: '#70182c',
          950: '#4c0d1f',
        },
        champagne: {
          50: '#fbf8f0',
          100: '#f5edd7',
          200: '#eadbad',
          300: '#ddc380',
          400: '#d2a95c',
          500: '#c89143',
          600: '#b87836',
          700: '#995c2f',
          800: '#7e4a2c',
          900: '#683d28',
          950: '#3b1f13',
        },
        ink: {
          900: '#0a0a0a',
          800: '#121212',
          700: '#1a1a1a',
          600: '#222222',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #4c0d1f 50%, #0a0a0a 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};