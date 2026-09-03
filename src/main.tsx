import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from '@/ui/App';
import { useGameStore } from '@/store/gameStore';
import { startGameLoop } from '@/services/gameLoop';
import { loadSave, startAutosave } from '@/services/localSave';

const saved = loadSave();
if (saved) useGameStore.getState().replace(saved);

startGameLoop(useGameStore);
startAutosave(useGameStore);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
