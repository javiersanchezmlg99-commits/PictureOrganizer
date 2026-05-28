import { ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import * as db from './database';
import { generateThumbnail, deleteThumbnail, getThumbPath } from './thumbnails';
import type { IdentificationResult, PhotoFilter } from './shared/types';
import { v4 as uuidv4 } from 'uuid';

const MOCK_SPECIES = [
  { name: 'Lynx pardinus', scientific: 'Lynx pardinus', category: 'Mammal' },
  { name: 'Aquila chrysaetos', scientific: 'Aquila chrysaetos', category: 'Bird' },
  { name: 'Vulpes vulpes', scientific: 'Vulpes vulpes', category: 'Mammal' },
  { name: 'Bubo bubo', scientific: 'Bubo bubo', category: 'Bird' },
  { name: 'Capra pyrenaica', scientific: 'Capra pyrenaica', category: 'Mammal' },
  { name: 'Lutra lutra', scientific: 'Lutra lutra', category: 'Mammal' },
  { name: 'Testudo graeca', scientific: 'Testudo graeca', category: 'Reptile' },
  { name: 'Salamandra salamandra', scientific: 'Salamandra salamandra', category: 'Amphibian' },
  { name: 'Cervus elaphus', scientific: 'Cervus elaphus', category: 'Mammal' },
  { name: 'Gypaetus barbatus', scientific: 'Gypaetus barbatus', category: 'Bird' },
];

export function registerIpcHandlers(): void {
  ipcMain.handle('photos:getAll', (_event, filter?: PhotoFilter) => db.getAllPhotos(filter));

  ipcMain.handle('photos:getOne', (_event, id: string) => db.getPhotoById(id));

  ipcMain.handle('photos:delete', (_event, id: string) => {
    deleteThumbnail(id);
    db.deletePhoto(id);
  });

  ipcMain.handle('photos:stats', () => db.getStats());
  ipcMain.handle('photos:topSpecies', (_event, limit?: number) => db.getTopSpecies(limit));
  ipcMain.handle('photos:timeline', () => db.getTimeline());
  ipcMain.handle('photos:categoryDistribution', () => db.getCategoryDistribution());

  // Get thumbnail path for a photo (returns cached thumb or original path)
  ipcMain.handle('photos:thumbnail', (_event, photoId: string, originalPath: string) => {
    return getThumbPath(photoId) ?? originalPath;
  });

  ipcMain.handle('photos:exportCsv', async () => {
    const csv = db.exportToCsv();
    const result = await dialog.showSaveDialog({
      defaultPath: `fauna-export-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, csv, 'utf-8');
      return result.filePath;
    }
    return '';
  });

  ipcMain.handle('dialog:selectFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'] }],
    });
    return result.filePaths;
  });

  ipcMain.handle('photos:identify', (_event, filePath: string) => {
    const filename = path.basename(filePath);
    const species = MOCK_SPECIES[Math.floor(Math.random() * MOCK_SPECIES.length)];
    const confidence = 0.75 + Math.random() * 0.24;
    const id = uuidv4();

    const mockResult: IdentificationResult = {
      id,
      filename,
      species_name: species.name,
      scientific_name: species.scientific,
      confidence,
      category: species.category,
      inference_time_ms: 150 + Math.floor(Math.random() * 200),
      all_predictions: [
        { class: species.name, confidence },
        { class: MOCK_SPECIES[(Math.floor(Math.random() * MOCK_SPECIES.length))].name, confidence: 0.02 + Math.random() * 0.05 },
        { class: MOCK_SPECIES[(Math.floor(Math.random() * MOCK_SPECIES.length))].name, confidence: 0.01 + Math.random() * 0.02 },
      ],
    };

    db.insertPhoto({
      filename,
      file_path: filePath,
      species_name: mockResult.species_name,
      scientific_name: mockResult.scientific_name,
      confidence: mockResult.confidence,
      category: mockResult.category,
      inference_time_ms: mockResult.inference_time_ms,
      all_predictions: mockResult.all_predictions,
    });

    // Generate thumbnail in background (non-blocking for UI)
    try {
      generateThumbnail(id, filePath);
    } catch (err) {
      console.warn('[identify] Thumbnail generation failed:', err);
    }

    return mockResult;
  });
}
