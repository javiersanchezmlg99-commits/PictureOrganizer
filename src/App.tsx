import { useState } from 'react';
import Sidebar from './components/Sidebar';
import PhotoUpload from './components/PhotoUpload';
import Identifications from './components/Identifications';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

export type Screen = 'upload' | 'identifications' | 'dashboard';

export default function App() {
  const [screen, setScreen] = useState<Screen>('upload');

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar current={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-auto p-6">
        <ErrorBoundary>
          {screen === 'upload' && <PhotoUpload />}
          {screen === 'identifications' && <Identifications />}
          {screen === 'dashboard' && <Dashboard />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
