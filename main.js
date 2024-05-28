const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

const createWindow = () => {

  const win = new BrowserWindow({
    width: 1200,
    height: 720,
    webPreferences: {
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    },
    autoHideMenuBar: true
  })

  win.loadFile('index.html')

}

app.whenReady().then(() => { createWindow() })

ipcMain.handle('open-file-dialog', async () => {

  const result = await dialog.showOpenDialog({

    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov'] }
    ]

  });

  return result.filePaths;

});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })