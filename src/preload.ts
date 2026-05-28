import { contextBridge, ipcRenderer } from 'electron';
import type { PhotoFilter } from './shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getPhotos: (filter?: PhotoFilter) => ipcRenderer.invoke('photos:getAll', filter),
  getPhoto: (id: string) => ipcRenderer.invoke('photos:getOne', id),
  deletePhoto: (id: string) => ipcRenderer.invoke('photos:delete', id),
  selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),
  identifyPhoto: (filePath: string) => ipcRenderer.invoke('photos:identify', filePath),
  getStats: () => ipcRenderer.invoke('photos:stats'),
  getTopSpecies: (limit?: number) => ipcRenderer.invoke('photos:topSpecies', limit),
  getTimeline: () => ipcRenderer.invoke('photos:timeline'),
  getCategoryDistribution: () => ipcRenderer.invoke('photos:categoryDistribution'),
  exportCsv: () => ipcRenderer.invoke('photos:exportCsv'),
});
