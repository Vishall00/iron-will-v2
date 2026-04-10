const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until ready-to-show
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.maximize(); // Start maximized
  win.show();

  // Load the Vite build in production
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // To load the dev server during local dev, uncomment:
  // win.loadURL('http://localhost:5173');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
