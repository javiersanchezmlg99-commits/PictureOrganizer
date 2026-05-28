import type { Screen } from '../App';
import { useI18n, type Lang } from '../shared/i18n';

const NAV_ITEMS: Array<{ key: Screen; labelKey: string; icon: string }> = [
  { key: 'upload', labelKey: 'nav.upload', icon: '📷' },
  { key: 'identifications', labelKey: 'nav.identifications', icon: '🔬' },
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: '📊' },
];

const LANG_LABELS: Record<Lang, string> = { en: 'EN', es: 'ES' };

interface SidebarProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const { t, lang, setLang } = useI18n();

  const toggleLang = () => setLang(lang === 'es' ? 'en' : 'es');

  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wide">
          {t('sidebar.title')}
        </h1>
        <p className="text-xs text-gray-400 mt-1">{t('sidebar.subtitle')}</p>
      </div>

      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              current === item.key
                ? 'bg-emerald-600/20 text-emerald-400 border-r-2 border-emerald-400'
                : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-sm font-medium">{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 space-y-3">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <span className="text-xs text-gray-400">{t('common.language')}</span>
          <div className="flex items-center gap-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${lang === 'es' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
              ES
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${lang === 'en' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
              EN
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-gray-400">{t('sidebar.models')}</span>
        </div>
      </div>
    </aside>
  );
}
