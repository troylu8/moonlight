const ytdl = require('ytdl-core');
const fs = require("fs");

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

class DownloadProcess {

    /**  download mp3, then call `cb()` with song data
     * @param {string} ytid 
     * @param {string} uid 
     * @param {function(object)} cb 
     */
    async download(ytid, uid, cb) {
        if (this.destroy) return cb(); // destroy request comes in before getyt request

        const info = await ytdl.getInfo(ytid);

        if (this.destroy) return cb();  // destroy request comes in while getting info 
        
        const filename = `${cleanFileName(info.videoDetails.title)} yt#${ytid}.mp3`
        const path = global.userDir + "/songs/" + filename;
        await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

        const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});
        const writeStream = fs.createWriteStream(path);
        dlstream.pipe(writeStream);
    
        dlstream.on("progress", (chunk, downloaded, total) => {
            if (this.destroy) {
                tracker.reset();
                this.destroy(dlstream, path, writeStream);
                return cb();
            }
    
            tracker.downloaded = downloaded;
            tracker.total = total;
        });
    
        dlstream.on("end", () => {
            cb({
                "id": "yt#" + ytid,
                "filename": filename,
                "title": info.videoDetails.title,
                "artist": info.videoDetails.author.name,
                "size": tracker.total,
                "duration": Number(info.videoDetails.lengthSeconds)
            });
            tracker.reset();
        });
    
    }
    
}

/** @type {DownloadProcess} */
let currentDP;

/**  download mp3, then call `cb()` with song data
 * @param {string} ytid 
 * @param {string} uid 
 * @param {function(object)} cb 
 */
export async function download(ytid, uid, cb) {
    currentDP = new DownloadProcess();
    currentDP.download(ytid, uid, cb);
}

export function loaded() {
    return tracker.downloaded / tracker.total;
}

export async function destroy() {
    if (!currentDP) return "no process running";

    console.log("destroy queued");

    currentDP.destroy = (dlstream, path, writeStream) => {
        dlstream.destroy();
        writeStream.end(() => fs.unlink(path, () => {}));
    }
}