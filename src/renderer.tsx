import { createRoot } from 'react-dom/client';
import App from './App';
import { I18nProvider, setCommonNames } from './shared/i18n';
import './index.css';

// Load common names JSON (bundled via Vite)
async function loadCommonNames() {
  try {
    const resp = await fetch('/common_names.json');
    if (resp.ok) {
      const data = await resp.json();
      setCommonNames(data);
    }
  } catch {
    // Common names file not available — fallback to scientific names
    console.warn('[i18n] common_names.json not found, using scientific names');
  }
}

loadCommonNames().then(() => {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <I18nProvider>
      <App />
    </I18nProvider>
  );
});
