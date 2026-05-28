import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { StatsData, SpeciesCount, TimelineEntry, CategoryCount } from '../shared/types';
import { useI18n } from '../shared/i18n';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function Dashboard() {
  const { t, commonName } = useI18n();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [topSpecies, setTopSpecies] = useState<SpeciesCount[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, sp, tl, c] = await Promise.all([
      window.electronAPI.getStats(),
      window.electronAPI.getTopSpecies(10),
      window.electronAPI.getTimeline(),
      window.electronAPI.getCategoryDistribution(),
    ]);
    setStats(s);
    setTopSpecies(sp);
    setTimeline(tl);
    setCategories(c);
  };

  const handleExport = async () => {
    setExporting(true);
    await window.electronAPI.exportCsv();
    setExporting(false);
  };

  // Map species names to common names for charts
  const topSpeciesDisplay = topSpecies.map(s => ({
    ...s,
    display_name: commonName(s.species_name),
  }));

  const categoriesDisplay = categories.map(c => ({
    ...c,
    display_name: commonName(c.category),
  }));

  const statCards = stats
    ? [
        { label: t('dash.totalPhotos'), value: stats.total_photos, icon: '📷' },
        { label: t('dash.uniqueSpecies'), value: stats.unique_species, icon: '🦁' },
        { label: t('dash.avgConfidence'), value: `${(stats.avg_confidence * 100).toFixed(0)}%`, icon: '🎯' },
        { label: t('dash.today'), value: stats.photos_today, icon: '📅' },
      ]
    : [];

  const hasData = stats && stats.total_photos > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('dash.title')}</h2>
        <button
          onClick={handleExport}
          disabled={exporting || !hasData}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {exporting ? '...' : t('dash.exportCsv')}
        </button>
      </div>

      {!stats ? (
        <p className="text-gray-400">{t('id.loading')}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-gray-800 rounded-xl p-5 text-center">
                <span className="text-3xl">{card.icon}</span>
                <p className="text-2xl font-bold mt-2">{card.value}</p>
                <p className="text-sm text-gray-400 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {!hasData ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <span className="text-4xl">📊</span>
              <p className="mt-2">{t('dash.noData')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topSpeciesDisplay.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">{t('dash.topSpecies')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topSpeciesDisplay} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis type="number" stroke="#9ca3af" />
                      <YAxis
                        type="category"
                        dataKey="display_name"
                        width={160}
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {categoriesDisplay.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">{t('dash.categories')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoriesDisplay}
                        dataKey="count"
                        nameKey="display_name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ display_name, percent }) => `${display_name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoriesDisplay.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {timeline.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-5 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4 text-gray-300">{t('dash.timeline')}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
