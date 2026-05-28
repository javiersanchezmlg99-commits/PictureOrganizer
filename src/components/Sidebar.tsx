import type { Screen } from '../App';

const NAV_ITEMS: Array<{ key: Screen; label: string; icon: string }> = [
  { key: 'upload', label: 'Upload', icon: '📷' },
  { key: 'history', label: 'History', icon: '📋' },
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
];

interface SidebarProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wide">
          FAUNA ID
        </h1>
        <p className="text-xs text-gray-400 mt-1">Wildlife Identification</p>
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
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-xs text-gray-400">Demo Mode</span>
        </div>
      </div>
    </aside>
  );
}
