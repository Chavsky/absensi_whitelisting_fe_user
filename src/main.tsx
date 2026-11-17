import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('PWA update available; service worker updated.');
  },
  onOfflineReady() {
    console.info('PWA is ready for on-premise usage.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
