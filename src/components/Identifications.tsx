import { useState, useEffect, useCallback } from 'react';
import type { Photo, PhotoFilter } from '../shared/types';
import ThumbnailImage from './ThumbnailImage';
import { localFileUrl } from '../shared/utils';

type SortKey = 'date' | 'species' | 'confidence';
type SortDir = 'asc' | 'desc';

export default function Identifications() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('All');
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [speciesList, setSpeciesList] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Load distinct species for dropdown
  useEffect(() => {
    window.electronAPI.getDistinctSpecies().then(setSpeciesList);
  }, [photos]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const filter: PhotoFilter = {};
    if (search.trim()) filter.search = search.trim();
    if (speciesFilter !== 'All') filter.species = speciesFilter;
    if (minConfidence > 0) filter.minConfidence = minConfidence / 100;
    const data = await window.electronAPI.getPhotos(filter);
    setPhotos(data);
    setLoading(false);
  }, [search, speciesFilter, minConfidence]);

  useEffect(() => {
    const timer = setTimeout(loadPhotos, 300);
    return () => clearTimeout(timer);
  }, [loadPhotos]);

  const handleDelete = async (id: string) => {
    await window.electronAPI.deletePhoto(id);
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
    loadPhotos();
  };

  // Client-side sort
  const sorted = [...photos].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'species':
        return dir * (a.species_name ?? '').localeCompare(b.species_name ?? '');
      case 'confidence':
        return dir * (a.confidence - b.confidence);
      case 'date':
      default:
        return dir * a.created_at.localeCompare(b.created_at);
    }
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'confidence' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const hasFilters = search || speciesFilter !== 'All' || minConfidence > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Identifications</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            Grid
          </button>
        </div>
      </div>

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
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-emerald-500 max-w-[220px]"
        >
          <option value="All">All species</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>{s}</option>
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
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setSpeciesFilter('All'); setMinConfidence(0); }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-700 rounded-lg"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span>Sort by:</span>
        <button onClick={() => toggleSort('date')} className={`hover:text-white ${sortKey === 'date' ? 'text-emerald-400' : ''}`}>
          Date{sortIcon('date')}
        </button>
        <button onClick={() => toggleSort('species')} className={`hover:text-white ${sortKey === 'species' ? 'text-emerald-400' : ''}`}>
          Species{sortIcon('species')}
        </button>
        <button onClick={() => toggleSort('confidence')} className={`hover:text-white ${sortKey === 'confidence' ? 'text-emerald-400' : ''}`}>
          Confidence{sortIcon('confidence')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg">
            {hasFilters ? 'No identifications match filters' : 'No identifications yet'}
          </p>
          <p className="text-sm mt-1">
            {hasFilters ? 'Try adjusting your filters' : 'Upload and identify photos to see them here'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            {sorted.length} identification{sorted.length !== 1 ? 's' : ''}
            {speciesFilter !== 'All' && <span className="text-emerald-400 ml-1">— {speciesFilter}</span>}
          </p>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                >
                  <ThumbnailImage
                    photoId={photo.id}
                    originalPath={photo.file_path}
                    alt={photo.filename}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium italic truncate">{photo.species_name ?? 'Unknown'}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{new Date(photo.created_at).toLocaleDateString()}</span>
                      <span className="text-sm font-bold text-emerald-400">{(photo.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-gray-600 transition-all"
                >
                  <ThumbnailImage
                    photoId={photo.id}
                    originalPath={photo.file_path}
                    alt={photo.filename}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium italic truncate">{photo.species_name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500 mt-1">{photo.filename}</p>
                    <span className="text-xs text-gray-500">{new Date(photo.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-emerald-400">
                      {(photo.confidence * 100).toFixed(1)}%
                    </p>
                    {photo.inference_time_ms && (
                      <p className="text-xs text-gray-600">{photo.inference_time_ms}ms</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={localFileUrl(selectedPhoto.file_path)}
                alt={selectedPhoto.filename}
                className="w-full max-h-[50vh] object-contain bg-black rounded-t-2xl"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold italic">{selectedPhoto.species_name}</h3>
                  <p className="text-sm text-gray-400">{selectedPhoto.filename}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-400">
                    {(selectedPhoto.confidence * 100).toFixed(1)}%
                  </p>
                  {selectedPhoto.inference_time_ms && (
                    <p className="text-xs text-gray-500">{selectedPhoto.inference_time_ms}ms</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date</p>
                  <p>{new Date(selectedPhoto.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">File path</p>
                  <p className="text-xs text-gray-400 break-all">{selectedPhoto.file_path}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { handleDelete(selectedPhoto.id); }}
                  className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm"
                >
                  Delete identification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
