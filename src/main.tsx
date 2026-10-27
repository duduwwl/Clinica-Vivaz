import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/site.css'
import App from './App'

// Redirecionamento de rotas profundas no GitHub Pages (ver public/404.html)
const redirect = sessionStorage.getItem('vivaz-redirect')
if (redirect) {
  sessionStorage.removeItem('vivaz-redirect')
  history.replaceState(null, '', redirect)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
