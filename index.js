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

const express = require("express");
const cors = require('cors');

const server = express();
server.use(cors());
server.use(express.static("./public"));
server.use("/getyt", require("./routes/getyt.js"));
server.use("/", require("./routes/file.js"));

server.listen(5000, () => console.log("listening.."));