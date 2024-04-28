const { app, BrowserWindow } = require('electron/main')
const express = require("express");
const cors = require('cors');
const { ipcMain, dialog, shell } = require('electron');

console.log("ready!");

app.whenReady().then( async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false
    });

    win.setMenu(null);

    await win.loadFile('./public/index.html');
    win.webContents.openDevTools();    
    win.maximize();
});

app.on('window-all-closed', () => app.quit());


ipcMain.handle("show-dialog", async (e, options) => await dialog.showOpenDialog(options));
ipcMain.handle("show-file", (e, path) => shell.showItemInFolder(path));
ipcMain.handle("show-folder", (e, path) => shell.openPath(path));


const server = express();
server.use(cors());
server.use(express.static("./public"));

server.listen(5000, () => console.log("listening.."));