const { app, BrowserWindow, safeStorage, shell, Tray, ipcMain, dialog, globalShortcut } = require('electron');
const fs = require('fs');
const { dirname } = require('path');

app.whenReady().then( async () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: __dirname + "/public/resources/other/moonlight.ico",

        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: "#202331",
            symbolColor: "#FFFFFF"
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false,
    });
    win.setMenu(null);

    ipcMain.handle("set-titlebar-color", (e, colorHex) => {

        function gray(hex) {
            hex = hex.toLowerCase();
            
            function hexDigitToInt(hex) {
                return (hex.charCodeAt(0) >= "a".charCodeAt(0))? 
                        10 + hex.charCodeAt(0) - "a".charCodeAt(0) :
                        Number(hex);
            }
        
            return  (hexDigitToInt(hex[1]) * 16 + hexDigitToInt(hex[2])) * 0.3 +
                    (hexDigitToInt(hex[3]) * 16 + hexDigitToInt(hex[4])) * 0.59 +
                    (hexDigitToInt(hex[5]) * 16 + hexDigitToInt(hex[6])) * 0.11;
        }

        win.setTitleBarOverlay({
            color: colorHex,
            symbolColor: (gray(colorHex) > 127)? "#000000" : "#ffffff"
        });
    });

    ipcMain.handle("minimize-to-tray", () => {
        win.hide();

        const tray = new Tray(__dirname + "/public/resources/other/moonlight.ico");
        tray.setToolTip("moonlight");
        tray.addListener("click", () => {
            win.show();
            tray.destroy();
        });
    });

    win.once("close", (e) => {
        win.webContents.send("cleanup");
        e.preventDefault();
    });
    ipcMain.on("cleanup-done", () => app.quit());

    win.webContents.on('before-input-event', (_, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            win.webContents.openDevTools();
        }
    });

    ["MediaNextTrack", "MediaPreviousTrack", "MediaStop", "MediaPlayPause"].forEach((val) => {
        globalShortcut.register(val, () => win.webContents.send(val));
    });

    await win.loadFile('./public/index.html');
    win.maximize();
});



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

ipcMain.handle("encrypt", (e, text) => safeStorage.encryptString(text).toString("hex"));
ipcMain.handle("decrypt", (e, hex) => safeStorage.decryptString(Buffer.from(hex, "hex")));