/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand — deep indigo-violet (Silicon Valley premium)
        brand: {
          50:  '#f0f0ff',
          100: '#e0e0ff',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#6d28d9',
          600: '#4c1d95',
          700: '#3b1573',
          800: '#2a0f52',
          900: '#1a0a35',
        },
        // Savanna Green — M-Pesa trust, money, growth
        savanna: {
          50:  '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#00A550',  // M-Pesa green
          600: '#008a42',
          700: '#006d34',
          800: '#005229',
          900: '#003a1d',
        },
        // Amber — East African warmth, sun, energy
        ember: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Sidebar tones
        sidebar: {
          bg:     '#1e1b4b',  // deep indigo
          hover:  '#2e2a6e',
          active: '#3730a3',
          border: '#2d2a5e',
          text:   '#c4b5fd',
          muted:  '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient':    'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
        'savanna-gradient':  'linear-gradient(135deg, #005229 0%, #00A550 100%)',
        'ember-gradient':    'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
        'hero-gradient':     'linear-gradient(135deg, #1e1b4b 0%, #2d1b69 50%, #1e3a5f 100%)',
        'card-shimmer':      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        'warm-white':        'linear-gradient(135deg, #fafaf7 0%, #f8f7ff 100%)',
      },
      boxShadow: {
        'brand':   '0 4px 24px rgba(109,40,217,0.25)',
        'savanna': '0 4px 24px rgba(0,165,80,0.25)',
        'ember':   '0 4px 24px rgba(245,158,11,0.25)',
        'card':    '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.10)',
        'glass':   '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
        'nav':     'inset 3px 0 0 #7c3aed',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-in':   'slideIn 0.25s ease-out',
        'shimmer':    'shimmer 2s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-in':  'bounceIn 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:   { from: { opacity: '0', transform: 'translateY(-4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideUp:  { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:  { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer:  { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        bounceIn: { from: { opacity: '0', transform: 'scale(0.85)' }, to: { opacity: '1', transform: 'scale(1)' } },
        glow:     { from: { boxShadow: '0 0 8px rgba(109,40,217,0.3)' }, to: { boxShadow: '0 0 20px rgba(109,40,217,0.6)' } },
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      spacing: { '18': '4.5rem', '22': '5.5rem', '68': '17rem', '72': '18rem' },
      transitionDuration: { '250': '250ms' },
    },
  },
  plugins: [],
};
