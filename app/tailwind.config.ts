import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'jetbrains-mono': ['var(--font-jetbrains-mono)'],
      },
      colors: {
        // アラート状態の色トークン
        alert: {
          border:        '#f0b4b0',
          bg:            '#fceeec',
          text:          '#b9351f',
          'text-strong': '#7a1f10', // AlertBanner/AlertList 本文: アイコン・アクション要素(text)より暗いトーンで可読性を確保
          hover:         '#f5d0cc',
        },
        // サーフェス（カード・タイル背景）の色トークン
        surface: {
          border: '#e6e9e5',
          bg:     '#f7f8f6',
          muted:  '#eef1ed',
        },
        // テキストの色トークン
        content: {
          primary:   '#1a2e1a',
          secondary: '#6b7a69',
          muted:     '#8a978f',
        },
        // ブランドカラートークン
        brand: {
          default: '#246e3a',
        },
      },
    },
  },
  plugins: [],
}

export default config
