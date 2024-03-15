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

const fs = require("fs");

const ytdl = require('ytdl-core');

async function getQualityOptions(url) {
    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, "audio");
    return audioFormats.map(format => format.audioBitrate).sort((a,b) => b-a);
}

function cleanFileName(str) {
    return str.replace(/[/\\?%*:|"<>]/g, '-')
}

async function download(id) {
    const info = await ytdl.getInfo(id);
    
    const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});
    dlstream.pipe(fs.createWriteStream(`./public/resources/songs/${cleanFileName(info.videoDetails.title)}.mp3`));
}

async function videoExists(id) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id);
    return res.status === 200; 
}


const express = require("express");
const cors = require('cors');

const server = express();
server.use(cors());
server.use(express.static("./public"));

server.get("/getyt/:id", async (req, res) => {
    console.log(`${req.method} at ${req.url}`);

    if (!(await videoExists(req.params["id"]))) {
        res.status(404).end("video doesnt exist");
        return;
    }
    
    await download(req.params["id"]);

    res.status(200).end("success");
})

server.listen(5000, () => console.log("listening.."));