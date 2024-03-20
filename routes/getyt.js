const express = require('express');
const ytdl = require('ytdl-core');
const fs = require("fs");

const router = express.Router();

async function getQualityOptions(url) {
    const info = await ytdl.getInfo(url);
    const audioFormats = ytdl.filterFormats(info.formats, "audio");
    return audioFormats.map(format => format.audioBitrate).sort((a,b) => b-a);
}

function cleanFileName(str) {
    return str.replace(/[/\\?%*:|"<>]/g, '-')
}


const tracker = {
    downloaded: 0,
    total: 1,
    reset: function () {
        this.downloaded = 0;
        this.total = 1;
    }
};

let dpCount = 0;

class DownloadProcess {

    constructor (id) {
        this.dpID = id;
    }

    async download(id, cb) {
        if (this.destroy) return cb(500);      // destroy request comes in before getyt request

        const info = await ytdl.getInfo(id);

        if (this.destroy) return cb(500);      // destroy request comes in while getting info 
        
        const path = `./public/resources/songs/${cleanFileName(info.videoDetails.title)} ${this.dpID}.mp3`;
        
        const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});
        const writeStream = fs.createWriteStream(path);
        dlstream.pipe(writeStream);
    
        dlstream.on("progress", (chunk, downloaded, total) => {
            if (this.destroy) {
                this.destroy(dlstream, path, writeStream);
                cb(500);
            }
    
            tracker.downloaded = downloaded;
            tracker.total = total;
        });
    
        dlstream.on("end", () => {
            tracker.reset();
            cb(200);
        });
    
    }
    
}

let currentDP;

router.get("/ready", (req, res) => {

    console.log(`${req.method} at ${req.url}`);

    currentDP = new DownloadProcess(dpCount++);

    res.status(200).end("new download process ready");
})

// shouldnt continue unless after a destroy request
router.get("/ytid/:id", (req, res) => {
    
    console.log(`${req.method} at ${req.url}`);

    currentDP.download(req.params["id"], (status) => {
        res.status(status).end("download ended");
    });
})

router.get("/loaded", (req, res) => {

    // if (tracker.tracking === false) 
    //     res.status(205).send("not tracking");
    // else 
    res.status(200).send("" + (tracker.downloaded / tracker.total));
})

// shouldnt continue unless after a getyt request
router.get("/destroy", (req, res) => {

    console.log(`${req.method} at ${req.url}`)

    if (!currentDP) return res.status(500).end("no process running");

    console.log("destroy queued");
    currentDP.destroy = (dlstream, path, writeStream) => {
        dlstream.destroy();
        writeStream.end(() => fs.unlink(path, () => {}));
    }

    res.status(200).end("destroy queued");

})
module.exports = router;