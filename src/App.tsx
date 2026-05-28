import { useState } from 'react';
import Sidebar from './components/Sidebar';
import PhotoUpload from './components/PhotoUpload';
import History from './components/History';
import Dashboard from './components/Dashboard';

export type Screen = 'upload' | 'history' | 'dashboard';

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload');

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar current={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-auto p-6">
        {screen === 'upload' && <PhotoUpload />}
        {screen === 'history' && <History />}
        {screen === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
