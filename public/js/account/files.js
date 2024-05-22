import { Tracker } from '../new-song/tracker.js';
import { createStragglerEntry, deleteStragglerEntry, getSizeDisplay } from '../view/elems.js';
import * as acc from './account.js';
import { data, Song } from './userdata.js';
const { ipcRenderer } = require("electron");
const { dirname, basename, resolve } = require("path");
const fs = require('fs');
const { promisify } = require('util');
const chokidar = require('chokidar');

global.resources = __dirname + "/resources";

const db = require('better-sqlite3')(global.resources + "/local.db");

db.pragma('journal_mode = WAL'); 
db.prepare("CREATE TABLE IF NOT EXISTS local (key TEXT, value TEXT)").run();

export const deviceID = getLocalData("device id") ?? setLocalData("device id", acc.genID(14));


/** read file, or create file with default text if doesnt exist */
async function readFileOrDefault(path, defaultData, encoding) {
    encoding = encoding ?? "utf8";
    
    try {
        return await fs.promises.readFile(path, encoding);
    } catch (err) {
        if (err.code === "ENOENT") {
            
            await fs.promises.mkdir(dirname(path), {recursive: true});
            await fs.promises.writeFile(path, defaultData, encoding);
            
            return defaultData;
        }
        else throw err;
    }
}

/** if `ENOENT` err thrown inside `func()`, creates the missing path and runs `func()` again */
async function ensurePathThen(func) {
    try {
        return await func();
    } catch (err) {
        if (err.code === "ENOENT") {
            await fs.promises.mkdir(dirname(err.path), {recursive: true});
            return await func();
        }
        else throw err;
    }
} 

export async function pathExists(path) {
    try {
        await fs.promises.stat(path);
        return true;
    } catch (err) {
        if (err.code === "ENOENT") return false;
        throw err;
    }
}
    

export function setLocalData(key, value) {
    db.prepare("DELETE FROM local WHERE key=? ").run(key);
    db.prepare("INSERT INTO local VALUES ( ?, ? ) ").run(key, value);
    return value;
}

export function getLocalData(key) {
    const row = db.prepare(`SELECT value FROM local WHERE key=? `).get(key);
    return row? row.value : undefined;
}

export async function decryptLocalData(key) {
    const ciphertext = getLocalData(key);
    return ciphertext? ( await ipcRenderer.invoke("decrypt", ciphertext) ) : null;
}
export async function encryptLocalData(key, value) { 
    setLocalData(key, value? ( await ipcRenderer.invoke("encrypt", value) ) : null);
}

const defaultUserData = JSON.stringify({
    // other default settings should be indicated in index.html - theyre applied in initSettingsCheckboxes() 
    "settings": {
        "shuffle": false,
        "volume": 0.5,
        "sidebarWidth": "350px",
        "playlistsWidth": "220px",

        "stay-signed-in": true,
        "sync-after-sign-in": true,
        "pause-while-seek": false,
        "show-unsynced-icons": true
    },
    "curr": {},
    "playlists": {},
    "songs": {},
    "trashqueue": [],
    }, 
    null, 4
);

export async function readUserdata(uid) {
    return JSON.parse( await readFileOrDefault(
        `${global.resources}/users/${uid}/userdata.json`,
        defaultUserData, "utf8"
    ));
}

export async function writeUserdata(uid, userdataStr) {
    await ensurePathThen( 
        async () => await fs.promises.writeFile(
            `${global.resources}/users/${uid}/userdata.json`, 
            userdataStr,
            "utf8"
        )
    );
}



export async function deleteSongFile(name) {
    await fs.promises.rm(global.userDir + "/songs/" + name, {recursive: true});
}
export async function getFileSize(path) {
    return (await fs.promises.stat(path)).size;
}


export async function postpendSID(basename, sid) {
    const i = basename.lastIndexOf(".");
    return basename.substring(0, i) + " " + sid + basename.substring(i);
}

const getDuration = promisify(
    (path, cb) => {
        const audio = new Audio(path);
        audio.addEventListener("loadedmetadata", () => cb(null, audio.duration));
    }
);

/**
 * @callback uploadSongCallback
 * @param {Error} err if file in use, `err.message === "file in use"`
 * @param {object | string } data if  `createSongData === true` data is a songData obj. else it is final basename of uploaded file
 */


export const uploadSongFile = promisify(
    /**
     * 
     * @param {string} uid 
     * @param {string} sid 
     * @param {string} path 
     * @param {boolean} createSongData 
     * @param {function(Error, object | "file in use")} cb
     */
    async (sid, path, createSongData, cb) => {

        const tracker = new Tracker();

        await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

        const size = await getFileSize(path);
        tracker.setProgress(0, size);

        const originalBase = tracker.titleElem.textContent = basename(path);

        const dest = global.userDir + "/songs/" + await postpendSID(originalBase, sid);
        const newBase = basename(dest);

        const songData = createSongData ? {
            id: acc.genID(14),
            filename: newBase,
            title: originalBase.replace(/\.[^\/.]+$/, ""), // regex to remove extensions
            artist: "uploaded by you",
            size: size,
            duration: await getDuration(path)
        } : undefined;

        if (inSongFolder(path)) {
            if ( !(allFiles.get(originalBase) instanceof HTMLElement) ) return cb(new Error("file in use"));

            deleteStragglerEntry(originalBase);
            return cb(null, songData ?? originalBase);
        }

        reserved.add(newBase);

        const readStream = fs.createReadStream(path);
        const writeStream = fs.createWriteStream(dest);

        tracker.oncancel = () => {
            readStream.destroy();
            writeStream.end(() => fs.unlink(dest, () => {}));
        };
        tracker.oncomplete = async () => { 
            deleteStragglerEntry(newBase);

            addBytes(await getFileSize(dest));

            return cb(null, songData ?? newBase);
        };

        readStream.on("data", (chunk) => {
            writeStream.write(chunk, (err) => {
                if (err) throw err;
                tracker.add(chunk.byteLength);
            });
        });
        
    }
);

const inSongFolder = (path) => resolve(dirname(path)) === resolve(global.userDir + "/songs");



/** @type {Map<string, Song | HTMLElement>} filename -> song | straggler elem (if its a straggler) */
export const allFiles = new Map();

/** @type {Map<string, Song>} filename -> song in `error` state */
export const missingFiles = new Map();


/** reserved filenames are not considered stragglers
 * @type {Set<string>} 
 */
export const reserved = new Set();

let watcher;
const totalSpaceUsed = document.getElementById("total-space-used");

async function doForAllFiles(dir, func, prefix = "") {
    const files = await fs.promises.readdir(dir, {withFileTypes: true});
    
    for (const f of files) {
        const path = dir + "\\" + f.name;
        const name = prefix + f.name;
        
        if (f.isDirectory()) {
            await func(path, name, true);
            await doForAllFiles(path, func, f.name + "\\");
        }
        
        else await func(path, name);
    }
}

async function getDirSize(dir) {
    let res = 0;
    await doForAllFiles(dir, async (path) => {
        res += (await fs.promises.stat(path)).size;
    });
    return res;
}

let totalBytes;
export function addBytes(bytes) {
    totalBytes += bytes;
    totalSpaceUsed.textContent = getSizeDisplay(totalBytes);
}

export async function watchFiles(dir) {
    if (watcher) watcher.close();
    allFiles.clear();
    missingFiles.clear();
    
    await ensurePathThen( async () => {
        await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});
        totalBytes = 0;
        addBytes(await getDirSize(global.userDir + "/songs"));
    });

    // scan songs and add them to allFiles or mark them as error
    data.songs.forEach(async (s) => {
        if ( !(await pathExists(global.userDir + "/songs/" + s.filename)) ) {
            missingFiles.set(s.filename, s);
            s.setState("error");
        }

        else allFiles.set(s.filename, s); 
    });
    
    // create stragglers from files that dont have songs
    await doForAllFiles(dir, (_, name, isDirectory) => {
        if (!allFiles.has(name)) createStragglerEntry(name, isDirectory);
    });

    const songsDir = global.userDir + "/songs";
    watcher = chokidar.watch(songsDir, {cwd: songsDir});
    
    watcher.on("ready", () => {

        watcher.on("add", async (filename) => {
            
            const song = missingFiles.get(filename);
            if (song) {
                song.setState("playable");
                addBytes(song.size);
                missingFiles.delete(filename);
            } 
            else {
                if (reserved.has(filename)) reserved.delete(filename);
                else addBytes( (await createStragglerEntry(filename)).size );
            } 
        });
    
        watcher.on("unlink", (filename) => {
    
            const obj = allFiles.get(filename);
    
            // if removed file was a straggler
            if (obj instanceof HTMLElement) deleteStragglerEntry(filename);
            
            // otherwise set song to error state
            else if (!reserved.has(filename)) {
                reserved.delete(filename);
                missingFiles.set(filename, obj);
                obj.setState("error");
            }
    
            allFiles.delete(filename);
            addBytes(-obj.size);
        });

        watcher.on("addDir", (path) => createStragglerEntry(path, true));
        watcher.on("unlinkDir", deleteStragglerEntry);
    
        watcher.on("change", (filename, stats) => {
                
            // update size display
            const stragglerEntry = allFiles.get(filename);
            if (stragglerEntry instanceof HTMLElement) {
                const difference = stats.size - stragglerEntry.size;
                addBytes(difference);

                stragglerEntry.size = stats.size;
                stragglerEntry.querySelector(".straggler__size").textContent = getSizeDisplay(stats.size);
            }
        });
        
    });
}
