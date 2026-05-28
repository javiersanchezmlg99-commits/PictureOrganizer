import { useState, useEffect, useCallback } from 'react';
import type { Photo, PhotoFilter } from '../shared/types';
import ThumbnailImage from './ThumbnailImage';
import { localFileUrl } from '../shared/utils';
import { useI18n } from '../shared/i18n';

type SortKey = 'date' | 'species' | 'confidence';
type SortDir = 'asc' | 'desc';

export default function Identifications() {
  const { t, commonName } = useI18n();
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

  useEffect(() => {
    window.electronAPI.getDistinctSpecies().then(setSpeciesList);
  }, [photos]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const filter: PhotoFilter = {};
    // Don't send search to DB — we filter by common name client-side
    if (speciesFilter !== 'All') filter.species = speciesFilter;
    if (minConfidence > 0) filter.minConfidence = minConfidence / 100;
    const data = await window.electronAPI.getPhotos(filter);
    // Client-side filter by common name or scientific name
    const q = search.trim().toLowerCase();
    const filtered = q
      ? data.filter(p => {
          const cn = commonName(p.species_name ?? '').toLowerCase();
          const sn = (p.species_name ?? '').toLowerCase();
          return cn.includes(q) || sn.includes(q);
        })
      : data;
    setPhotos(filtered);
    setLoading(false);
  }, [search, speciesFilter, minConfidence, commonName]);

  useEffect(() => {
    const timer = setTimeout(loadPhotos, 300);
    return () => clearTimeout(timer);
  }, [loadPhotos]);

  const handleDelete = async (id: string) => {
    await window.electronAPI.deletePhoto(id);
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
    loadPhotos();
  };

  // Client-side sort — use common names for species sort
  const sorted = [...photos].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortKey) {
      case 'species':
        return dir * commonName(a.species_name ?? '').localeCompare(commonName(b.species_name ?? ''));
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
        <h2 className="text-2xl font-bold">{t('id.title')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {t('id.list')}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {t('id.grid')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-gray-800 rounded-xl p-4">
        <input
          type="text"
          placeholder={t('id.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-emerald-500 max-w-[250px]"
        >
          <option value="All">{t('id.allSpecies')}</option>
          {speciesList.map((s) => (
            <option key={s} value={s}>{commonName(s)}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">{t('id.minConfidence')}</label>
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
            {t('id.clearFilters')}
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="flex gap-4 text-xs text-gray-400">
        <span>{t('id.sortBy')}</span>
        <button onClick={() => toggleSort('date')} className={`hover:text-white ${sortKey === 'date' ? 'text-emerald-400' : ''}`}>
          {t('id.sortDate')}{sortIcon('date')}
        </button>
        <button onClick={() => toggleSort('species')} className={`hover:text-white ${sortKey === 'species' ? 'text-emerald-400' : ''}`}>
          {t('id.sortSpecies')}{sortIcon('species')}
        </button>
        <button onClick={() => toggleSort('confidence')} className={`hover:text-white ${sortKey === 'confidence' ? 'text-emerald-400' : ''}`}>
          {t('id.sortConfidence')}{sortIcon('confidence')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-400">{t('id.loading')}</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg">{hasFilters ? t('id.noMatch') : t('id.noData')}</p>
          <p className="text-sm mt-1">{hasFilters ? t('id.adjustFilters') : t('id.uploadFirst')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400">
            {sorted.length} {sorted.length !== 1 ? t('id.identificationPlural') : t('id.identification')}
            {speciesFilter !== 'All' && (
              <span className="text-emerald-400 ml-1">— {commonName(speciesFilter)}</span>
            )}
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
                    alt={commonName(photo.species_name ?? '')}
                    className="w-full h-36 object-cover"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium truncate">{commonName(photo.species_name ?? '')}</p>
                    <p className="text-xs text-gray-500 italic truncate">{photo.species_name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(photo.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-bold text-emerald-400">
                        {(photo.confidence * 100).toFixed(0)}%
                      </span>
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
                  className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:ring-1 hover:ring-gray-600 transition-all"
                >
                  <ThumbnailImage
                    photoId={photo.id}
                    originalPath={photo.file_path}
                    alt={commonName(photo.species_name ?? '')}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{commonName(photo.species_name ?? '')}</p>
                    <p className="text-xs text-gray-500 italic">{photo.species_name}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </span>
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
                    title={t('id.deleteId')}
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
                alt={commonName(selectedPhoto.species_name ?? '')}
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
                  <h3 className="text-xl font-bold">{commonName(selectedPhoto.species_name ?? '')}</h3>
                  <p className="text-sm text-gray-400 italic">{selectedPhoto.species_name}</p>
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
              <div className="text-sm">
                <p className="text-gray-500">{t('id.date')}</p>
                <p>{new Date(selectedPhoto.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDelete(selectedPhoto.id)}
                  className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm"
                >
                  {t('id.deleteId')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
