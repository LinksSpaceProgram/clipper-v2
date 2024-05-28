const { contextBridge } = require('electron');
const ffmpeg = require('ffmpeg');
const path = require('path');

const API = {

    

}

contextBridge.exposeInMainWorld("api", API);