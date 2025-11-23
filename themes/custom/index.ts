import { defineTheme } from '@slidev/types'
import './style.css'

export default defineTheme({
  theme: {
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#10b981',
      background: '#0f172a',
      foreground: '#f1f5f9',
      border: '#334155',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    },
  },
})

