import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import * as db from './database';
import type { IdentificationResult } from './shared/types';
import { v4 as uuidv4 } from 'uuid';

export function registerIpcHandlers(): void {
  ipcMain.handle('photos:getAll', () => db.getAllPhotos());

  ipcMain.handle('photos:getOne', (_event, id: string) => db.getPhotoById(id));

  ipcMain.handle('photos:delete', (_event, id: string) => {
    db.deletePhoto(id);
  });

  ipcMain.handle('photos:stats', () => db.getStats());

  ipcMain.handle('dialog:selectFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff'] }],
    });
    return result.filePaths;
  });

  ipcMain.handle('photos:identify', (_event, filePath: string) => {
    const filename = path.basename(filePath);
    const mockResult: IdentificationResult = {
      id: uuidv4(),
      filename,
      species_name: 'Lynx pardinus',
      scientific_name: 'Lynx pardinus',
      confidence: 0.85 + Math.random() * 0.14,
      category: 'Mammal',
      inference_time_ms: 150 + Math.floor(Math.random() * 200),
      all_predictions: [
        { class: 'Lynx pardinus', confidence: 0.85 + Math.random() * 0.14 },
        { class: 'Felis silvestris', confidence: 0.02 + Math.random() * 0.05 },
        { class: 'Vulpes vulpes', confidence: 0.01 + Math.random() * 0.02 },
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

    return mockResult;
  });
}
