// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Severity palette — badge + chart
        severity: {
          low:      '#10b981',
          medium:   '#f59e0b',
          high:     '#ef4444',
          critical: '#7c3aed',
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid-pattern': '32px 32px',
      },
      boxShadow: {
        'glow-indigo': '0 0 32px rgba(99,102,241,0.12)',
        'glow-sm':     '0 0 16px rgba(99,102,241,0.08)',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(110%)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(-8px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
      },
      animation: {
        'toast-in':  'toast-in 0.25s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':   'fade-in 0.15s ease-out',
        'scale-in':  'scale-in 0.2s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
