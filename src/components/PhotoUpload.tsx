import { useState, useCallback } from 'react';
import type { IdentificationResult } from '../shared/types';

export default function PhotoUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<IdentificationResult[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => f.path);
    if (files.length > 0) {
      setSelectedFiles(files);
      setResults([]);
    }
  }, []);

  const handleBrowse = async () => {
    const paths = await window.electronAPI.selectFiles();
    if (paths.length > 0) {
      setSelectedFiles(paths);
      setResults([]);
    }
  };

  const handleIdentify = async () => {
    if (selectedFiles.length === 0) return;
    setProcessing(true);
    setResults([]);
    const newResults: IdentificationResult[] = [];
    for (const filePath of selectedFiles) {
      const result = await window.electronAPI.identifyPhoto(filePath);
      newResults.push(result);
    }
    setResults(newResults);
    setProcessing(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">Upload Photos</h2>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-emerald-400 bg-emerald-400/10'
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onClick={handleBrowse}
      >
        <div className="text-5xl mb-4">📁</div>
        <p className="text-lg text-gray-300">
          Drag & drop photos here
        </p>
        <p className="text-sm text-gray-500 mt-2">
          or click to browse — JPG, PNG, WebP
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </p>
            <button
              onClick={handleIdentify}
              disabled={processing}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {processing ? 'Processing...' : 'Identify Species'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {selectedFiles.map((filePath) => (
              <div
                key={filePath}
                className="bg-gray-800 rounded-lg p-3 flex items-center gap-3"
              >
                <img
                  src={`file://${filePath}`}
                  alt=""
                  className="w-16 h-16 object-cover rounded"
                />
                <span className="text-sm text-gray-300 truncate">
                  {filePath.split(/[\\/]/).pop()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-emerald-400">Results</h3>
          {results.map((r) => (
            <div key={r.id} className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{r.species_name}</p>
                  <p className="text-sm text-gray-400 italic">{r.scientific_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">
                    {(r.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">{r.inference_time_ms}ms</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                  {r.category}
                </span>
                <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                  {r.filename}
                </span>
              </div>
              {r.all_predictions.length > 1 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Other predictions:</p>
                  {r.all_predictions.slice(1).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span>{p.class}</span>
                      <span>{(p.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
