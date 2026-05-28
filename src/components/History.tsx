import { useState, useEffect } from 'react';
import type { Photo } from '../shared/types';

export default function History() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await window.electronAPI.getPhotos();
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">History</h2>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg">No photos processed yet</p>
          <p className="text-sm mt-1">Upload and identify photos to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">History</h2>
        <p className="text-sm text-gray-400">{photos.length} photos</p>
      </div>

      <div className="space-y-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
          >
            <img
              src={`file://${photo.file_path}`}
              alt={photo.filename}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{photo.species_name ?? 'Unknown'}</p>
              <p className="text-sm text-gray-400 italic">
                {photo.scientific_name ?? '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{photo.filename}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-400">
                {(photo.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {new Date(photo.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={async () => {
                await window.electronAPI.deletePhoto(photo.id);
                loadPhotos();
              }}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
