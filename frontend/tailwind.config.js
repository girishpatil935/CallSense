/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B090D',
        shell: '#100D12',
        surface: '#19151C',
        raised: '#231C27',
        mauve: '#72566F',
        dusty: '#9B7A9C',
        pink: '#D8A5D2',
        lavender: '#E6B8E3',
        paper: '#F5F0F6',
        muted: '#A69BA9',
        line: '#332A36',
        success: '#65D6A6',
        warning: '#E9BB76',
        negative: '#F08A9B',
      },
      fontFamily: {
        display: ['Sora', 'DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 34px rgba(216,165,210,.12)',
        card: '0 18px 48px rgba(0,0,0,.18)',
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(125deg, #72566F 0%, #9B7A9C 55%, #D8A5D2 100%)',
      },
    },
  },
  plugins: [],
};
