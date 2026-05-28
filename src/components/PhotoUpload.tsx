import { useState, useCallback } from 'react';
import type { IdentificationResult } from '../shared/types';
import { localFileUrl } from '../shared/utils';

interface FileEntry {
  path: string;
  duplicate: boolean;
}

export default function PhotoUpload() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState('');
  const [results, setResults] = useState<(IdentificationResult & { duplicate?: boolean })[]>([]);

  const checkDuplicates = async (paths: string[]): Promise<FileEntry[]> => {
    const entries: FileEntry[] = [];
    for (const p of paths) {
      const exists = await window.electronAPI.photoExists(p);
      entries.push({ path: p, duplicate: exists });
    }
    return entries;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const paths = Array.from(e.dataTransfer.files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => f.path);
    if (paths.length > 0) {
      const entries = await checkDuplicates(paths);
      setFiles(entries);
      setResults([]);
    }
  }, []);

  const handleBrowse = async () => {
    const paths = await window.electronAPI.selectFiles();
    if (paths.length > 0) {
      const entries = await checkDuplicates(paths);
      setFiles(entries);
      setResults([]);
    }
  };

  const removeDuplicates = () => {
    setFiles(files.filter(f => !f.duplicate));
  };

  const removeFile = (path: string) => {
    setFiles(files.filter(f => f.path !== path));
  };

  const handleIdentify = async () => {
    const validFiles = files.filter(f => !f.duplicate);
    if (validFiles.length === 0) return;
    setProcessing(true);
    setResults([]);
    const newResults: IdentificationResult[] = [];
    for (const f of validFiles) {
      setCurrentFile(f.path.split(/[\\/]/).pop() ?? '');
      const result = await window.electronAPI.identifyPhoto(f.path);
      newResults.push(result);
    }
    setResults(newResults);
    setProcessing(false);
    setCurrentFile('');
  };

  const duplicateCount = files.filter(f => f.duplicate).length;
  const validCount = files.filter(f => !f.duplicate).length;

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
        <p className="text-lg text-gray-300">Drag & drop photos here</p>
        <p className="text-sm text-gray-500 mt-2">or click to browse — JPG, PNG, WebP</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-400">
                {validCount} new file{validCount !== 1 ? 's' : ''}
              </p>
              {duplicateCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400">
                    {duplicateCount} duplicate{duplicateCount !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={removeDuplicates}
                    className="text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Remove duplicates
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleIdentify}
              disabled={processing || validCount === 0}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {processing ? `Processing ${currentFile}...` : 'Identify Species'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {files.map(({ path: filePath, duplicate }) => (
              <div
                key={filePath}
                className={`rounded-lg p-3 flex items-center gap-3 ${
                  duplicate ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-gray-800'
                }`}
              >
                <img
                  src={localFileUrl(filePath)}
                  alt=""
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-300 truncate block">
                    {filePath.split(/[\\/]/).pop()}
                  </span>
                  {duplicate && (
                    <span className="text-xs text-amber-400">Already identified</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(filePath); }}
                  className="text-gray-500 hover:text-red-400 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-emerald-400">Results</h3>
          {results.map((r) => (
            <div key={r.id || r.filename} className="bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg italic">{r.species_name}</p>
                  <p className="text-sm text-gray-400">{r.filename}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-400">
                    {(r.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">{r.inference_time_ms}ms</p>
                </div>
              </div>
              {r.all_predictions && r.all_predictions.length > 1 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Other predictions:</p>
                  {r.all_predictions.slice(1).map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span className="italic">{p.class}</span>
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
