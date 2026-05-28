import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPhotos: () => ipcRenderer.invoke('photos:getAll'),
  getPhoto: (id: string) => ipcRenderer.invoke('photos:getOne', id),
  deletePhoto: (id: string) => ipcRenderer.invoke('photos:delete', id),
  selectFiles: () => ipcRenderer.invoke('dialog:selectFiles'),
  identifyPhoto: (filePath: string) => ipcRenderer.invoke('photos:identify', filePath),
  getStats: () => ipcRenderer.invoke('photos:stats'),
});
