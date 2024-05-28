const { contextBridge, ipcRenderer } = require('electron');
const ffmpeg = require('ffmpeg');
const path = require('path');

const API = {

    addFileSelectEventListener: (callback) => {

        window.addEventListener('DOMContentLoaded', () => {

            const fileSelectButton = document.getElementById('fileSelectButton');
            
            if (fileSelectButton) {

                fileSelectButton.addEventListener('click', callback);

            }

        });
    
    },

    openFileDialog: async () => {

        const filePath = await ipcRenderer.invoke('open-file-dialog');

        return filePath;

    }

}

contextBridge.exposeInMainWorld("api", API);