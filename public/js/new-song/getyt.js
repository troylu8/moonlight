import {  addBytes, allFiles, makeUnique, reserved } from '../account/files.js';
import { Playlist, Song } from '../account/userdata.js';
import { Tracker } from './tracker.js';
import { genID } from '../account/account.js';
import { new__dropdown } from './newSong.js';
import { setViewPlaylist } from '../view/elems.js';
import { sendNotification } from '../view/fx.js';
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
 * @returns {Promise< Array< {ytsid: string, index: number} >} ` [ {ytsid: string, index: number}, ...] `
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
            songs.push({
                ytsid: video.snippet.resourceId.videoId,
                index: songs.length
            });
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

class BSTNode {

    constructor(key, value, left, right) {
        this.key = key;
        this.value = value;
        
        /** @type {BSTNode} */
        this.left = left;
        /** @type {BSTNode} */
        this.right = right;
    }    
}

class BST {
    
    add(key, value) {
        /** @type {BSTNode} */
        this.root = this._addUnder(this.root, key, value);
    }

    /**
     *  @param {BSTNode} root
     */
    _addUnder(root, key, value) {
        if (!root) return new BSTNode(key, value);

        if (root.key < key) root.right = this._addUnder(root.right, key, value);
        else if (root.key > key) root.left = this._addUnder(root.left, key, value);

        return root;
    }
    
    /** get the value after this key */
    getAfter(key) {
        let p = this.root;
        let res = null;

        while (p) {
            if (p.key > key) {
                res = p.value;
                p = p.left;
            }
            else {
                p = p.right;
            }
        }

        return res;
    }
}


export async function downloadPlaylist(ytpid, cb) {
    const url = "https://www.youtube.com/playlist?list=" + ytpid;

    const oembed = await ytOEmbed(url);
    if ( !oembed ) return cb(new Error("playlist doesnt exist"));

    const songs = await getPlaylistSongs(ytpid);
    const playlist = new Playlist(genID(14), {title: oembed.title, desc: "downloaded from " + url});
    setViewPlaylist(playlist);

    const indexToEntry = new BST();

    let complete = 0;
    let unavailable = 0;

    for (const s of songs) {
        downloadSong(s.ytsid, (err, songData) => {
            if (err) {
                unavailable++;
                return complete++;
            }

            const song = new Song(songData.id, songData);
            allFiles.set(song.filename, song);

            const entry = song.addToPlaylist(playlist, true, indexToEntry.getAfter(s.index))[0];
            indexToEntry.add(s.index, entry);

            if (++complete === songs.size) {
                sendNotification("downloaded playlist " + playlist.title);
                if (unavailable !== 0) {
                    sendNotification(
                        unavailable + 
                        ((unavailable === 1)? " song was " : " songs were") +
                        "unable to be downloaded",
                        "var(--error-color)"
                    );
                }
                cb(playlist);
            } 
        });   
    }
}

async function ytOEmbed(url) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=" + url);
    return await res.json(); 
}


/**  download mp3, then create song object with song data
 * @param {string} ytsid youtube song id
 * @param {function(Error | undefined, object | undefined)} cb called with songdata download was successful
 */
export async function downloadSong(ytsid, cb) {
    new__dropdown.open();
    let stop = false;
    
    const oembed = await ytOEmbed("https://www.youtube.com/watch?v=" + ytsid);
    if ( !oembed ) return cb(new Error("video doesnt exist"));

    const tracker = new Tracker(oembed.title, Infinity, () => stop = true);

    await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

    const info = await ytdl.getInfo(ytsid);
    if (stop) return cb();  // destroy request comes in while getting info 

    tracker.titleElem.textContent = info.videoDetails.title;

    const sid = genID(14);
    const filename = await makeUnique(cleanFileName(info.videoDetails.title) + ".mp3", sid);
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
        addBytes(tracker.total);
        sendNotification("downloaded " + info.videoDetails.title);
        cb(null, {
            "id": sid,
            "filename": filename,
            "title": info.videoDetails.title,
            "artist": info.videoDetails.author.name,
            "size": tracker.total,
            "duration": Number(info.videoDetails.lengthSeconds)
        })
    });
}

