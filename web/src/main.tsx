import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import './App.css'
import Root from './Root'
import i18n from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <Root />
    </I18nextProvider>
    <Analytics />
  </StrictMode>
)
