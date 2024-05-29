const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

const API = {

    //Code to create the progress bar updater in render.js
    createProgressUpdater: () => {

        document.addEventListener('DOMContentLoaded', () => {

            const progressBar = document.getElementById('progress');
            //Refer to main.js on how this is calculated
            ipcRenderer.on('progressBar', (event, progress) => {
                //Simply update the width of the progress element to reflect its status 
                progressBar.style.width = progress + '%';
            });
          });

    },

    addFileSelectEventListener: (callback) => {

        window.addEventListener('DOMContentLoaded', () => {

            const fileSelectButton = document.getElementById('fileSelectButton');
            
            if (fileSelectButton) {

                fileSelectButton.addEventListener('click', callback);

            }

        });
    
    },

    //Open a file picker and return the path to the chosen file
    openFileDialog: async () => {

        const filePath = await ipcRenderer.invoke('open-file-dialog');

        return filePath;

    },

    //FFMPEG the video and get some of the required details
    getVideo: async (filePath) => {

        let video = await ipcRenderer.invoke('get-video', filePath);
        
        return video;

    },

    getFramePath: (frameFilename) => {

        return `file://${encodeURI(path.join(__dirname, '/frames/', frameFilename).replace(/\\/g, '/'))}`

    }

}

contextBridge.exposeInMainWorld("api", API);