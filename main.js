const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
let ffmpeg = require('fluent-ffmpeg')

let win;

const createWindow = () => {

  win = new BrowserWindow({
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

ipcMain.handle('get-video', async (event, filePath) => {

  // Clear out the frames folder
  await deleteFrames();
  let framesOutputPath = path.join(__dirname, '/frames');

  try {

    const metadata = await new Promise((resolve, reject) => {

      ffmpeg.ffprobe(filePath, (err, metadata) => {

        if (err) {

          console.error('Error:', err);
          reject(err);
          return;

        }

        resolve(metadata);

      });
    });

    // Extract frames
    await new Promise((resolve, reject) => {

      ffmpeg(filePath)
        .on('error', (err) => {

          console.error('Error extracting frames:', err);
          reject(err);

        })
        .on('progress', (progress) => {

          // Emit progress updates by checking the progress divided by the total duration
          //This works independant of framerate because it will always extract one frame per second
          let percentageCompleted = Math.floor((progress.frames / metadata.streams[0].duration) * 100);
          if (percentageCompleted > 100) { percentageCompleted = 100 };
          //Send on the progressBar channel to ipcRenderer
          win.webContents.send('progressBar', percentageCompleted);
          //console.log(percentageCompleted);

        })
        .on('end', () => {
          
          //console.log('Frames extraction finished');
          //Make sure the progress bar ends at 100
          win.webContents.send('progressBar', 100);
          resolve(metadata);
          
        })
        .outputOptions('-vf fps=1,scale=320:180')
        .output(path.join(framesOutputPath, 'frame-%08d.png'))
        .run();

    });

    return metadata; // Return metadata after the ffmpeg operations complete

  } catch (e) {

    console.error('Exception caught:', e.code, e.msg);
    throw e; // Rethrow the error to propagate it

  }

});

app.on('window-all-closed', async () => {
    await deleteFrames();
    if (process.platform !== 'darwin') app.quit()
})




  
  
async function deleteFrames() {
  
  return new Promise((resolve, reject) => {

    const framesOutputPath = path.join(__dirname, '/frames');

    fs.readdir(framesOutputPath, (err, files) => {

        if (err) {
            console.error('Error reading frames folder:', err);
            reject();
        }

        files.forEach(file => {

            fs.unlink(path.join(framesOutputPath, file), err => {

                if (err) { console.error('Error deleting file:', err);} 
                //else { console.log('File deleted successfully:', file);}

            });
        });
        
        resolve(); 

      });
  });
}