import { ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import * as db from './database';
import { generateThumbnail, deleteThumbnail, getThumbPath } from './thumbnails';
import { loadModels, identifyImage } from './inference';
import type { IdentificationResult, PhotoFilter } from './shared/types';
import { v4 as uuidv4 } from 'uuid';

export function registerIpcHandlers(): void {
  ipcMain.handle('photos:getAll', (_event, filter?: PhotoFilter) => db.getAllPhotos(filter));
  ipcMain.handle('photos:getOne', (_event, id: string) => db.getPhotoById(id));
  ipcMain.handle('photos:exists', (_event, filePath: string) => db.photoExistsByPath(filePath));
  ipcMain.handle('photos:distinctSpecies', () => db.getDistinctSpecies());

  ipcMain.handle('photos:delete', (_event, id: string) => {
    deleteThumbnail(id);
    db.deletePhoto(id);
  });

  ipcMain.handle('photos:stats', () => db.getStats());
  ipcMain.handle('photos:topSpecies', (_event, limit?: number) => db.getTopSpecies(limit));
  ipcMain.handle('photos:timeline', () => db.getTimeline());
  ipcMain.handle('photos:categoryDistribution', () => db.getCategoryDistribution());

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

  // ── Two-stage identification pipeline ──────────────────────────────

  ipcMain.handle('photos:identify', async (_event, filePath: string) => {
    const filename = path.basename(filePath);
    const id = uuidv4();

    // Duplicate check
    if (db.photoExistsByPath(filePath)) {
      return { id: '', filename, duplicate: true } as IdentificationResult & { duplicate: boolean };
    }

    try {
      await loadModels();

      const { detections, species, topSpecies, inferenceTimeMs } =
        await identifyImage(filePath);

      const animals = detections.filter(d => d.classId === 0);
      const bestAnimal = animals.length > 0
        ? animals.reduce((a, b) => (a.confidence > b.confidence ? a : b))
        : null;

      // Use species name as category when available
      const speciesName = species?.name ?? (bestAnimal ? 'animal' : 'Empty');
      const confidence = species?.confidence ?? (bestAnimal?.confidence ?? 0);
      const category = species?.name ?? (bestAnimal?.label ?? 'Empty');

      const result: IdentificationResult = {
        id,
        filename,
        species_name: speciesName,
        scientific_name: speciesName,
        confidence,
        category,
        inference_time_ms: inferenceTimeMs,
        all_predictions: topSpecies.length > 0
          ? topSpecies.map(s => ({ class: s.name, confidence: s.confidence }))
          : detections.map(d => ({
              class: `${d.label} [${d.bbox.map(v => v.toFixed(0)).join(',')}]`,
              confidence: d.confidence,
            })),
      };

      db.insertPhoto({
        filename,
        file_path: filePath,
        species_name: result.species_name,
        scientific_name: result.scientific_name,
        confidence: result.confidence,
        category: result.category,
        inference_time_ms: result.inference_time_ms,
        all_predictions: result.all_predictions,
      });

      try {
        generateThumbnail(id, filePath);
      } catch (err) {
        console.warn('[identify] Thumbnail generation failed:', err);
      }

      return result;
    } catch (err) {
      console.error('[identify] Inference failed:', err);
      throw new Error(`Identification failed: ${(err as Error).message}`);
    }
  });
}
