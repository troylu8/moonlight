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
async function videoExists(id) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id);
    return res.status === 200; 
}

const tracker = {
    downloaded: 0,
    total: 1
};

let count = 0; //TODO: remove this

let destroy;
async function download(id, cb) {
    const info = await ytdl.getInfo(id);
    // if (destroy) {      // destroy request comes in while getting info
    //     destroy();
    //     cb(500);
    //     return;
    // }

    const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});

    const path = `./public/resources/songs/${cleanFileName(info.videoDetails.title)} ${count++}.mp3`;
    
    dlstream.pipe(fs.createWriteStream(path));
    dlstream.on("progress", (chunk, downloaded, total) => {
        if (destroy) {
            destroy(dlstream, path);
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

router.get("/link/:id", async (req, res) => {
    console.log(`${req.method} at ${req.url}`);

    console.log("checking if video exists");
    if (!(await videoExists(req.params["id"]))) {
        res.status(404).end("video doesnt exist");
        return;
    }
    console.log("beginning download");
    
    download(req.params["id"], (status) => {
        res.status(status).end();
    });
})

router.get("/loaded", (req, res) => {
    res.status(200).send("" + (tracker.downloaded / tracker.total));
})
router.get("/destroy", (req, res) => {
    console.log(`${req.method} at ${req.url}`)

    console.log("destroy queued");

    destroy = (dlstream, path) => {
        destroy = null;
        if (!dlstream) return res.status(200).send("destroyed");

        console.log("calling stream.destroy()");
        dlstream.destroy();
        

        setTimeout(() => {
            fs.unlink(path, (err) => {
                if (err) {
                    res.status(500).send(err);
                    throw err;
                }
                // else res.status(200).send("destroyed");
                
                console.log("should be deleted?????");
                
            });
        }, 10000)
        
        res.status(200).send("destroyed");

    }

    

})
module.exports = router;