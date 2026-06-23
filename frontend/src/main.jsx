import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Admin from './Admin.jsx'

// Theme Initialization
const initTheme = () => {
  const tg = window.Telegram?.WebApp;
  const isInsideTelegram = tg && tg.platform && tg.platform !== 'unknown';

  const updateClass = () => {
    let isDark = true;
    if (isInsideTelegram && tg.colorScheme) {
      isDark = tg.colorScheme === 'dark';
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.classList.toggle('theme-dark', isDark);
    document.documentElement.classList.toggle('theme-light', !isDark);
  };

  if (isInsideTelegram) {
    tg.onEvent('themeChanged', updateClass);
  }

  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    if (!isInsideTelegram) {
      updateClass();
    }
  };
  
  if (media.addEventListener) {
    media.addEventListener('change', handleMediaChange);
  } else {
    media.addListener(handleMediaChange);
  }
  
  updateClass();
};

initTheme();


const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/admin' ? <Admin /> : <App />}
  </StrictMode>,
)

