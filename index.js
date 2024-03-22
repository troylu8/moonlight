const {app, BrowserWindow} = require("electron");
const express = require("express");
const cors = require('cors');


const createWindow = () => {
    const window = new BrowserWindow({
        width: 1000,
        height: 700,
    })

    // window.webContents.openDevTools();

    window.loadFile("public/index.html");
}

// app.whenReady().then(createWindow);

const server = express();
server.use(cors());
server.use(express.static("./public"));
server.use("/getyt", require("./routes/getyt.js"));
server.use("/upload", require("./routes/upload.js"));
server.use("/files", require("./routes/files.js"));

server.listen(5000, () => console.log("listening.."));