import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './lib/language';
import './styles/global.css';
import './styles/layout.css';
import './styles/journal.css';
import './styles/archive.css';
import './styles/responsive.css';
import './styles/motion.css';
import './styles/auth.css';
import './styles/controls.css';
import './styles/language.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
