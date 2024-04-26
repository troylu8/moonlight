import { genID } from './account.js';
const fs = require('fs');
const { randomBytes } = require("crypto");
const { promisify } = require("util");
// const sqlite3 = require('sqlite3').verbose();

global.resources = __dirname + "/resources";
console.log(global.resources);

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


const defaultUserData = JSON.stringify({
        "settings": {
            "shuffle": false,
            "volume": 0.5
        },
        "curr": {},
        "trashqueue": [],
        "playlists": {},
        "songs": {}
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
                
            console.log("writing as ", encoding);
            
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
readFileOrDefault(global.resources + "/client.key", randomBytes(32), "hex")
    .then(data => {
        secretKey = data instanceof Buffer? data : Buffer.from(data, "hex");
        console.log("client secret key:", secretKey, secretKey.byteLength);
    })

function encrypt(text) {
    const iv = randomBytes(16);
    
    const cipher = createCipheriv("aes256", secretKey, iv);

    return  iv.toString("hex") + ":" + 
            cipher.update(text, "utf8", "hex") +
            cipher.final("hex")
}

function decrypt(text) {
    [ iv, ciphertext ] = text.split(":");

    const decipher = createDecipheriv("aes256", secretKey, Buffer.from(iv, "hex"));

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

export async function readSavedJWT() {
    const hash = getLocalData("saved jwt");
    console.log("saved jwt: ", hash);
    if (hash == null) console.log("no jwt saved");
    return hash == null? undefined : decrypt(hash);
}

export async function writeSavedJWT(jwt) { setLocalData("saved jwt", jwt? encrypt(jwt) : ""); }

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


export async function uploadSongFile(uid, path, createSongData) {
    let dest = `${global.resources}/users/${req.params["uid"]}/songs/${basename(path)}`;
    if (pathExists(dest)) dest = insertSID(dest, req.params["sid"]);

    const songData = createSongData ? {
        id: genID(14),
        filename: basename(dest),
        title: basename(dest).replace(/\.[^\/.]+$/, ""), // regex to remove extensions
        artist: "uploaded by you",
        size: (await fs.promises.stat(req.body)).size,
        duration: (await parseFile(req.body)).format.duration
    } : undefined;

    if (inSongFolder(path, req.params["uid"])) {
        if (isStraggler(path, req.params["uid"])) return songData;
        return "another song is using this file!";
    } 

    const data = await fs.promises.readFile(path);
    await ensurePathThen(async () => await fs.promises.writeFile(dest, data));

    return songData;
}


function isStraggler(path, uid) {
    return false;
}
const inSongFolder = (path, uid) => resolve(dirname(path)) === resolve(`${global.resources}/users/${uid}/songs`);