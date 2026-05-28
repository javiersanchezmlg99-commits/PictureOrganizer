import { useState, useEffect } from 'react';
import type { StatsData } from '../shared/types';

export default function Dashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    window.electronAPI.getStats().then(setStats);
  }, []);

  const cards = stats
    ? [
        { label: 'Total Photos', value: stats.total_photos, icon: '📷' },
        { label: 'Unique Species', value: stats.unique_species, icon: '🦁' },
        { label: 'Avg Confidence', value: `${(stats.avg_confidence * 100).toFixed(0)}%`, icon: '🎯' },
        { label: 'Photos Today', value: stats.photos_today, icon: '📅' },
      ]
    : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {!stats ? (
        <p className="text-gray-400">Loading stats...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map((card) => (
              <div
                key={card.label}
                className="bg-gray-800 rounded-xl p-5 text-center"
              >
                <span className="text-3xl">{card.icon}</span>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
                <p className="text-sm text-gray-400 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-300">
              Charts & Analytics
            </h3>
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <span className="text-4xl">📊</span>
                <p className="mt-2">Charts will be added in Phase 4</p>
                <p className="text-sm text-gray-600">
                  Top species, timeline, category distribution
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
