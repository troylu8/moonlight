import {  makeUnique, reserved } from '../account/files.js';
import { Tracker } from './tracker.js';
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


/**  download mp3, then call `cb()` with song data
 * @param {string} ytid 
 * @param {function(object)} cb 
 * @param {string} title 
 */
export async function download(ytid, cb, title) {

    let stop = false;

    const tracker = new Tracker(title ?? "fetching info", Infinity, () => stop = true);

    await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

    const info = await ytdl.getInfo(ytid);
    if (stop) return cb();  // destroy request comes in while getting info 

    tracker.titleElem.textContent = info.videoDetails.title;
    
    const filename = await makeUnique(cleanFileName(info.videoDetails.title) + ".mp3", ytid);
    const path = global.userDir + "/songs/" + filename;
    reserved.add(filename);
    
    const dlstream = ytdl.downloadFromInfo(info, {quality: "highestaudio", filter: "audioonly"});
    const writeStream = fs.createWriteStream(path);

    tracker.oncancel = () => {
        dlstream.destroy();
        writeStream.end(() => fs.unlink(path, () => {}));
        cb();
    };

    dlstream.pipe(writeStream);
    dlstream.on("progress", (chunk, downloaded, total) => tracker.setProgress(downloaded, total));

    dlstream.on("end", () => {
        cb({
            "id": "yt#" + ytid,
            "filename": filename,
            "title": info.videoDetails.title,
            "artist": info.videoDetails.author.name,
            "size": tracker.total,
            "duration": Number(info.videoDetails.lengthSeconds)
        });
    });
}