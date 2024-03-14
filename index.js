const {app, BrowserWindow} = require("electron");

const createWindow = () => {
    const window = new BrowserWindow({
        width: 1000,
        height: 700,
    })

    window.webContents.openDevTools();

    window.loadFile("public/index.html");
}

// app.whenReady().then(createWindow);


const express = require('express');

const server = express()
    .use(express.static("./public"));

server.listen(5000, () => console.log("listening"));