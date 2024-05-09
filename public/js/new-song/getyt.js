import {  makeUnique, reserved } from '../account/files.js';
import { Playlist } from '../account/userdata.js';
import { Tracker } from './tracker.js';
import { genID } from '../account/account.js';
import { initNewSong, new__dropdown } from './newSong.js';
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

/**
 * @param {string} ytpid youtube playlist id
 * @returns {Promise<Array<Array<string>>>} `[ [youtube songID, song title], ... ]`
 */
async function getPlaylistSongs(ytpid) {
    const YT_API_KEY = "AIzaSyBKrluI981e6nye-M8qHs_N3kDx3m7N8wg";
    const maxResults = 50;

    const fetchPlaylistItems = async (pageToken) => {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${ytpid}&key=${YT_API_KEY}`+ (pageToken? `&pageToken=${pageToken}` : ""));
        return await res.json();
    }

    const songs = [];
    
    const pushToSongs = (items) => {
        for (const video of items) {
            songs.push([video.snippet.resourceId.videoId, video.snippet.title])
        }
        return items.length;
    }

    let pushed;
    let nextPageToken;
    do {
        const json = await fetchPlaylistItems(nextPageToken);
        if (json.error) return console.log(json.error);
        
        pushed = pushToSongs(json.items);
        nextPageToken = json.nextPageToken;
    } while (pushed === maxResults);

    return songs;
}


export async function downloadPlaylist(ytpid, cb, title) {
    const songs = await getPlaylistSongs(ytpid);
    const playlist = new Playlist(genID(14), {title: title, desc: "downloaded from https://www.youtube.com/playlist?list=" + ytpid});

    let complete = 0;

    for (const s of songs) { 
        
        downloadSong(s[0], (err, songData) => {
            //TODO: notification "1 unavailable song"
            if (err) return console.log(err.message);

            initNewSong(songData, playlist, false);
            if (++complete === songs.length) cb(playlist);
        }, s[1]);
        
    }
}

async function videoExists(id) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id);
    return res.status === 200; 
}


/**  download mp3, then create song object with song data
 * @param {string} ytsid youtube song id
 * @param {function(Error | undefined, object | undefined)} cb called with songdata download was successful
 * @param {string} title temporarily used as the tracker title until the song info is fetched
 */
export async function downloadSong(ytsid, cb, title) {
    new__dropdown.open();
    let stop = false;
    
    if ( !(await videoExists(ytsid)) ) return cb(new Error("video doesnt exist"));

    const tracker = new Tracker(title ?? "fetching info", Infinity, () => stop = true);

    await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

    const info = await ytdl.getInfo(ytsid);
    if (stop) return cb();  // destroy request comes in while getting info 

    tracker.titleElem.textContent = info.videoDetails.title;

    const filename = await makeUnique(cleanFileName(info.videoDetails.title) + ".mp3", ytsid);
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

    dlstream.on("end", () => 
        cb(null, {
            "id": genID(14),
            "filename": filename,
            "title": info.videoDetails.title,
            "artist": info.videoDetails.author.name,
            "size": tracker.total,
            "duration": Number(info.videoDetails.lengthSeconds)
        })
    );
}

