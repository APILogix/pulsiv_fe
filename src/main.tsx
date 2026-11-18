
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import './app/index.css'
import '@/infrastructure/web-vitals'

createRoot(document.getElementById('root')!).render(
  
    <App />
 
)
