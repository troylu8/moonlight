const { app, BrowserWindow } = require('electron/main')
const express = require("express");
const cors = require('cors');
const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const { dirname } = require('path');

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

    win.on("close", () => win.webContents.send("cleanup"));

    win.setMenu(null);

    await win.loadFile('./public/index.html');
    win.webContents.openDevTools();    
    win.maximize();
});

app.on('window-all-closed', () => app.quit());

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});


ipcMain.handle("show-dialog", async (e, options) => await dialog.showOpenDialog(options));
ipcMain.handle("show-file", async (e, path) => {
    try {
        await fs.promises.stat(path);
        shell.showItemInFolder(path);
    }
    catch (err) {
        if (err.code === "ENOENT") shell.openPath(dirname(path));
    }
});
ipcMain.handle("show-folder", (e, path) => shell.openPath(path));

const server = express();
server.use(cors());
server.use(express.static("./public"));

server.listen(5000, () => console.log("listening.."));