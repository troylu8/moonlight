import { Tracker } from '../new-song/tracker.js';
import { createStragglerEntry, deleteStragglerEntry, getSizeDisplay } from '../view/elems.js';
import * as acc from './account.js';
import { data, Song } from './userdata.js';
const { ipcRenderer } = require("electron");
const { dirname, basename, resolve } = require("path");
const fs = require('fs');
const { promisify } = require('util');
const { randomBytes, createCipheriv, createDecipheriv } = require("crypto");
const { parseFile } = require('music-metadata');
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

let secretKey;
export async function readKey() {
    const data = await readFileOrDefault(global.resources + "/client.key", randomBytes(32), "hex");
    return secretKey = data instanceof Buffer? data : Buffer.from(data, "hex");
}


function encrypt(text) {
    if (!text) return;

    const iv = randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", secretKey, iv);

    return  iv.toString("hex") + ":" + 
            cipher.update(text, "utf8", "hex") + cipher.final("hex") + ":" +
            cipher.getAuthTag().toString("hex");
}

function decrypt(text) {
    if (!text) return;


    const [ iv, ciphertext, authTag ] = text.split(":");

    const decipher = createDecipheriv("aes-256-gcm", secretKey, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    return decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8");
}
    

export function setLocalData(key, value) {

    // only wrap in apostrophes if not null
    const str = value? ` '${value}' `: "null";

    db.prepare(`DELETE FROM local WHERE key='${key}' `).run();
    db.prepare(`INSERT INTO local VALUES ( '${key}', ${str} ) `).run();

    return value;
}

export function getLocalData(key) {
    const row = db.prepare(`SELECT value FROM local WHERE key='${key}' `).get();
    return row? row.value : undefined;
}

export function printLocalData() {
    db.each("SELECT * FROM local", (err, row) => {
        console.log(row);
    })
}

export function readSavedJWT() {
    return decrypt(getLocalData("saved jwt"));
}
export async function writeSavedJWT(jwt) { 
    setLocalData("saved jwt", encrypt(jwt)); 
}
ipcRenderer.on("cleanup", () => {
    if (data && data.settings["stay-signed-in"]) {
        console.log("saving", acc.isGuest()? "guest" : acc.jwt);
        writeSavedJWT(acc.isGuest()? "guest" : acc.jwt);
    } 
});

const defaultUserData = JSON.stringify({
    // other default settings should be indicated in index.html - theyre applied in initSettings() 
    "settings": {
        "shuffle": false,
        "volume": 0.5,
    },
    "curr": {},
    "playlists": {},
    "songs": {},
    "trashqueue": [],
    }, 
    undefined, 4
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



export async function deleteSongFile(basename) {
    await fs.promises.unlink(global.userDir + "/songs/" + basename);
}
export async function getFileSize(path) {
    return (await fs.promises.stat(path)).size;
}


/**  insert sid into end of path if path already exists*/
export async function makeUnique(path, sid) {

    if (!(await pathExists(path))) return path;

    const i = path.lastIndexOf(".");
    return path.substring(0, i) + " " + sid + path.substring(i);
}

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
        console.log("start");

        const tracker = new Tracker();

        await fs.promises.mkdir(global.userDir + "/songs", {recursive: true});

        const size = await getFileSize(path);
        tracker.setProgress(0, size);

        const originalBase = tracker.titleElem.textContent = basename(path);

        const dest = await makeUnique(global.userDir + "/songs/" + originalBase, sid);
        const newBase = basename(dest);

        const songData = createSongData ? {
            id: acc.genID(14),
            filename: newBase,
            title: originalBase.replace(/\.[^\/.]+$/, ""), // regex to remove extensions
            artist: "uploaded by you",
            size: size,
            duration: (await parseFile(path)).format.duration
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
        tracker.oncomplete = () => { 
            console.log("done"); 
            deleteStragglerEntry(newBase);
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


/** reserved filenames are not considered stragglers when added to songs folder
 * @type {Set<string>} 
 */
export const reserved = new Set();


let watcher;


export async function watchFiles(dir) {
    if (watcher) watcher.close();
    allFiles.clear();
    missingFiles.clear();
    
    await fs.promises.mkdir(dir, {recursive: true});

    // scan songs and add them to allFiles or mark them as error
    data.songs.forEach(async (s) => {
        if ( !(await pathExists(global.userDir + "/songs/" + s.filename)) ) {
            missingFiles.set(s.filename, s);
            s.setState("error");
        }

        else allFiles.set(s.filename, s); 
    });
    
    // create stragglers from files that dont have songs
    (await fs.promises.readdir(dir)).forEach(filename => {
        if (!allFiles.has(filename)) createStragglerEntry(filename);
    });

    const songsDir = global.userDir + "/songs";
    watcher = chokidar.watch(songsDir, {cwd: songsDir});
    
    watcher.on("ready", () => {
        watcher.on("add", (filename) => {
            
            if (missingFiles.has(filename)) {
                missingFiles.get(filename).setState("playable");
                missingFiles.delete(filename);
            } 
            else {
                if (reserved.has(filename)) reserved.delete(filename);
                else createStragglerEntry(filename);
            } 
        });
    
        watcher.on("unlink", (filename) => {
    
            const obj = allFiles.get(filename);
    
            // if removed file was a straggler
            if (obj instanceof HTMLElement) deleteStragglerEntry(filename);
            
            // otherwise set song to error state
            else {
                missingFiles.set(filename, obj);
                obj.setState("error");
            } 
    
            allFiles.delete(filename);
        });
    
        watcher.on("change", (filename, stats) => {
                
            // update size display
            const obj = allFiles.get(filename);
            if (obj instanceof HTMLElement) {
                obj.querySelector(".straggler__size").textContent = getSizeDisplay(stats.size);
            }
        })
    });
}
