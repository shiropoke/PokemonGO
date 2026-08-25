import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FavoritesProvider } from './contexts/FavoritesContext';
import './styles.css';
import './styles/expansion.css';
import './styles/design-refresh.css';
import './styles/home-refresh.css';
import './styles/navigation-refresh.css';
import './styles/type-badge.css';
import './styles/refresh-button.css';
import './styles/global-search.css';
import './styles/evolution-pvp.css';
import './styles/legal.css';
import './styles/mobile-inputs.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FavoritesProvider>
      <App />
    </FavoritesProvider>
  </React.StrictMode>,
);
