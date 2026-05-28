import { useState, useEffect, useCallback } from 'react';
import type { Photo, PhotoFilter } from '../shared/types';

const CATEGORIES = ['All', 'Mammal', 'Bird', 'Reptile', 'Amphibian', 'Fish', 'Insect'];

export default function History() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [minConfidence, setMinConfidence] = useState(0);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const filter: PhotoFilter = {};
    if (search.trim()) filter.search = search.trim();
    if (category !== 'All') filter.category = category;
    if (minConfidence > 0) filter.minConfidence = minConfidence / 100;
    const data = await window.electronAPI.getPhotos(filter);
    setPhotos(data);
    setLoading(false);
  }, [search, category, minConfidence]);

  useEffect(() => {
    const timer = setTimeout(loadPhotos, 300);
    return () => clearTimeout(timer);
  }, [loadPhotos]);

  const handleDelete = async (id: string) => {
    await window.electronAPI.deletePhoto(id);
    loadPhotos();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold">History</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-800 rounded-xl p-4">
        <input
          type="text"
          placeholder="Search species, filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-emerald-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">Min confidence:</label>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-24 accent-emerald-500"
          />
          <span className="text-xs text-gray-300 w-8">{minConfidence}%</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg">
            {search || category !== 'All' || minConfidence > 0
              ? 'No photos match filters'
              : 'No photos processed yet'}
          </p>
          <p className="text-sm mt-1">
            {search || category !== 'All' || minConfidence > 0
              ? 'Try adjusting your filters'
              : 'Upload and identify photos to see them here'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
          <div className="space-y-3">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
                <img
                  src={`file://${photo.file_path}`}
                  alt={photo.filename}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).className = 'w-20 h-20 rounded-lg bg-gray-700 flex-shrink-0';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{photo.species_name ?? 'Unknown'}</p>
                  <p className="text-sm text-gray-400 italic">{photo.scientific_name ?? '—'}</p>
                  <div className="flex gap-2 mt-1">
                    {photo.category && (
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{photo.category}</span>
                    )}
                    <span className="text-xs text-gray-500">{photo.filename}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-emerald-400">
                    {(photo.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                  {photo.inference_time_ms && (
                    <p className="text-xs text-gray-600">{photo.inference_time_ms}ms</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
