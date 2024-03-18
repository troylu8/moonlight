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
    tracking: false,
    reset: function () {
        this.downloaded = 0;
        this.total = 1;
        this.tracking = false;
    }
};

let c = 0; //TODO: remove this

class DownloadProcess {

    constructor(c) {
        this.c = c;
    }

    async download(id, cb) {
        const info = await ytdl.getInfo(id);
        // if (this.destroy) return cb(500);      // destroy request comes in while getting info 
    
        const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});
    
        const path = `./public/resources/songs/${cleanFileName(info.videoDetails.title)} ${c}.mp3`;
        
        const writeStream = fs.createWriteStream(path);
        dlstream.pipe(writeStream);
    
        dlstream.on("progress", (chunk, downloaded, total) => {
            if (this.destroy) {
                this.destroy(dlstream, path, writeStream);
                console.log("c " + this.c + " .destroy() called");
            }
    
            tracker.downloaded = downloaded;
            tracker.total = total;
        });
    
        dlstream.on("end", () => {
            tracker.reset();
        });
    
    }
    
}

let currentDP;

// shouldnt continue unless after a destroy request
router.get("/ytid/:id", async (req, res) => {
    
    if (tracker.tracking) return;

    console.log(`${req.method} at ${req.url}`);

    currentDP = new DownloadProcess(c++);
    currentDP.download(req.params["id"]);

    tracker.tracking = true;
    res.status(200).end("started download");
})

router.get("/loaded", (req, res) => {

    if (tracker.tracking === false) 
        res.status(205).send("not tracking");
    else 
        res.status(200).send("" + (tracker.downloaded / tracker.total));
})

// shouldnt continue unless after a getyt request
router.get("/destroy", (req, res) => {

    console.log(`${req.method} at ${req.url}`)

    if (!currentDP) return;

    tracker.tracking = false;

    console.log("destroy queued");
    currentDP.destroy = (dlstream, path, writeStream) => {
        dlstream.destroy();
        writeStream.end(() => fs.unlink(path, () => {}));
    }

    res.status(200).end("destroy queued");

})
module.exports = router;