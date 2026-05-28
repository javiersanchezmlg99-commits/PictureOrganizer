import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import started from 'electron-squirrel-startup';
import { initDatabase } from './database';
import { registerIpcHandlers } from './ipc-handlers';
import { startApiServer } from './api';

if (started) {
  app.quit();
}

// Register custom protocol for serving local images
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FAUNA ID',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', async () => {
  // Handle local-file:// protocol — converts to file:// with proper URL format
  protocol.handle('local-file', (request) => {
    // URL comes in as: local-file:///C:/Users/foo/bar.jpg
    // We need to extract the file path and convert to a proper file:// URL
    let filePath = request.url.replace('local-file://', '');
    filePath = decodeURIComponent(filePath);
    // Remove leading slashes, then re-add for Windows drive letter
    filePath = filePath.replace(/^\/+/, '');
    // filePath is now: C:/Users/foo/bar.jpg
    const fileUrl = pathToFileURL(filePath).href;
    console.log(`[local-file] ${request.url} -> ${fileUrl}`);
    return net.fetch(fileUrl);
  });

  await initDatabase();
  registerIpcHandlers();
  startApiServer(3001);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
