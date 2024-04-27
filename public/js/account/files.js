import { genID } from './account.js';
const { dirname, basename, resolve } = require("path");
const fs = require('fs');
const { randomBytes, createCipheriv, createDecipheriv } = require("crypto");
const { promisify } = require("util");
// const sqlite3 = require('sqlite3').verbose();

global.resources = __dirname + "/resources";

const db = require('better-sqlite3')(global.resources + "/local.db");


// let db; 
// let runAsync;
// let getAsync;

// setTimeout(() => {
//     db = new sqlite3.Database(global.resources + "/local.db");
//     db.prepare("CREATE TABLE IF NOT EXISTS local (key TEXT, value TEXT)").run();

//     runAsync = promisify(db.run);
//     getAsync = promisify(db.get);

//     console.log(typeof runAsync);
// } );

db.pragma('journal_mode = WAL'); //USE WITH BETTER SQLITE
db.prepare("CREATE TABLE IF NOT EXISTS local (key TEXT, value TEXT)").run();


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

async function pathExists(path) {
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
    // await runAsync(`DELETE FROM local WHERE key='${key}' `);
    // await runAsync(`INSERT INTO local VALUES ( '${key}', ${str} ) `);
}

export function getLocalData(key) {
    const row = db.prepare(`SELECT value FROM local WHERE key='${key}' `).get();
    // await getAsync(`SELECT value FROM local WHERE key='${key}' `);
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

export async function deleteSong(uid, filename) {
    await fs.promises.unlink(`${global.resources}/users/${uid}/songs/${filename}`);
}


/**  add the sid to end of filename */
function insertSID(path, sid) {
    const i = path.lastIndexOf(".");
    return path.substring(0, i) + " " + sid + path.substring(i);
}

/**
 * 
 * @param {string} uid 
 * @param {string} sid 
 * @param {string} path 
 * @param {boolean} createSongData 
 * @returns {Promise<object | string | "file in use">} if `createSongData == true` returns song data object, else returns the final path inside resources folder
 */

export async function uploadSongFile(uid, sid, path, createSongData) {
    let dest = `${global.resources}/users/${uid}/songs/${basename(path)}`;
    if (await pathExists(dest)) dest = insertSID(dest, sid);

    const songData = createSongData ? {
        id: genID(14),
        filename: basename(dest),
        title: basename(dest).replace(/\.[^\/.]+$/, ""), // regex to remove extensions
        artist: "uploaded by you",
        size: (await fs.promises.stat(req.body)).size,
        duration: (await parseFile(req.body)).format.duration
    } : undefined;

    if (inSongFolder(path, uid)) {
        if (isStraggler(path, uid)) return songData ?? basename(dest);
        return "file in use";
    } 

    const data = await fs.promises.readFile(path);
    await ensurePathThen(async () => await fs.promises.writeFile(dest, data));

    return songData ?? basename(dest);
}


function isStraggler(path, uid) {
    // fs.promises.readdir(global.resources + "/")
    return false;
}
const inSongFolder = (path, uid) => resolve(dirname(path)) === resolve(`${global.resources}/users/${uid}/songs`);