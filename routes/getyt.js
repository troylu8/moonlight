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
    total: 1
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
                cb(500)
            }
    
            tracker.downloaded = downloaded;
            tracker.total = total;
        });
    
        dlstream.on("end", () => {
            
            tracker.downloaded = 0;
            tracker.total = 1;
    
            cb(200);
        });
    
    }
    
}

let currentDP;

router.get("/ytid/:id", async (req, res) => {

    // shouldnt continue unless after a destroy request

    console.log(`${req.method} at ${req.url}`);

    console.log("beginning download");

    currentDP = new DownloadProcess(c++);
    currentDP.download(req.params["id"], (status) => {
        res.status(status).end();
    });
})

router.get("/loaded", (req, res) => {

    // if we send a value back here to signify that were done loading, then
    // we dont need to depend on the getyt request to decide when to stop sending loading requests.
    
    // that way, we can allow get requests to come back faster to prevent 
    // breaking the getyt-destroy-getyt-destroy pattern
    
    res.status(200).send("" + (tracker.downloaded / tracker.total));
})
router.get("/destroy", (req, res) => {

    // shouldnt continue unless after a getyt request

    console.log(`${req.method} at ${req.url}`)

    if (!currentDP) return;

    console.log("destroy queued");
    currentDP.destroy = (dlstream, path, writeStream) => {
        dlstream.destroy();
        writeStream.end(() => fs.unlink(path, () => {}));
    }

    res.status(200).end();

})
module.exports = router;