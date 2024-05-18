import { data, Song, Playlist } from "./userdata.js";
import {  missingFiles, reserved, deviceID } from "./files.js";
import { sendNotification, showError, startSyncSpin, stopSyncSpin } from "../view/fx.js";
import { getData, isGuest, user } from "./account.js";
const fs = require('fs');
const Zip = require("adm-zip");
const { promisify } = require('util');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


/** sent to server */
class SyncChanges {
    constructor() {
        /** @type {Array<Song>} songs to be merged with server's data.json*/
        this["unsynced-songs"] = [],

        /** @type {Array<Playlist>} playlists to be merged with server's data.json  */
        this["unsynced-playlists"] = [],

        /** @type {Array<string>} all files that client wants from server: error state songs + songs that server has client doesnt*/
        this.requestedFiles = Array.from(missingFiles.keys())
                            .filter(fn => missingFiles.get(fn).syncStatus !== "local")
                            .map(fn => "songs/" + fn),

        /** @type {Array<string>} files that the client deleted, so the server should too */
        this.trash = Array.from(data.trashqueue.values()),

        /** @type {Array<Song | Playlist>} items that will be deleted from client (not sent to server) */
        this.doomed = [],

        this.update = [],

        /** if syncing is successful, these items will be created */
        this.newItems = {
            /** @type {Array<object>} array of song data client will receive from server */
            songs: [],

            /** @type {Array<object>} array of playlist data client will receive from server */
            playlists: []
        }
    }
}


/**
 * @param {import('adm-zip')} zip 
 * @param {string} targetPath
 * @param {function(err)} cb 
 */
function extractAllToAsync(zip, targetPath, cb) {
    const total = zip.getEntryCount();
    let done = 0;
    
    if (total === 0) return cb();

    zip.extractAllTo(targetPath);
    cb();

    //TODO: change back to async when its fixed: https://github.com/cthackers/adm-zip/issues/484
    // zip.extractAllToAsync(targetPath, false, false, (err) => {
    //     console.log(done, "/", total);
    //     if (++done === total) cb();
    // });
}
const extractAllToPromise = promisify(extractAllToAsync);

export async function syncData() {
    
    if (isGuest()) return showError(syncBtn.tooltip.lastElementChild, "not signed in!");

    startSyncSpin();
    
    const serverJSON = await getData();
    const requestedFiles = Array.from(missingFiles.keys())
                            .filter(fn => missingFiles.get(fn).syncStatus !== "local")
                            .map(fn => "songs/" + fn);
    const zipToServer = new Zip();

    /** if sync is successful, call `.setSyncStatus("synced")` on all these items */
    const unsynced = [];
    const newItems = {
        songs: [],
        playlists: []
    };
    
    /** @param {"songs" | "playlists"} category */
    const syncCategory = async (category) => {

        for (const id of Object.keys(serverJSON[category])) {
            const itemData = serverJSON[category][id];
            const item = data[category].get(id);

            // WANTS - if client doesnt have this song/playlist && not in trash queue
            if (!item) {
                if (!data.trashqueue.has(id)) {
                    itemData.id = id;
                    newItems[category].push(itemData);

                    if (category === "songs") {
                        requestedFiles.push("songs/" + itemData.filename);
                        reserved.add("songs/" + itemData.filename);
                    }
                }
            }

            // if client has song/playlist, but it hasnt been synced to latest changes 
            else if (item.syncStatus === "synced" && itemData.lastUpdatedBy !== deviceID) {
                item.update(itemData);
            } 
                
        }
                
        for (const item of data[category].values()) {
            // ignore errored local songs
            if (item.state === "error" && item.syncStatus === "local") continue;
            
            else if (item.syncStatus === "local") {
                unsynced.push(item);

                // if song didn't exist in serverJSON before, add file
                if (category === "songs" && !serverJSON[category][item.id]) {
                    const buf = await fs.promises.readFile(global.userDir + "/songs/" + item.filename);
                    zipToServer.addFile("songs/" + item.filename, buf); //TODO: enc
                }

                // update/override serverJSON with local item
                item.lastUpdatedBy = deviceID;
                serverJSON[category][item.id] = item;
            } 

            else if (!serverJSON[category][item.id]) {
                item.delete();
            }
        }
        
    }

    syncCategory("songs");
    syncCategory("playlists");

    console.log("serverJSON before stringify", serverJSON);

    try {
        const a = JSON.parse(JSON.stringify( {
                userdata: serverJSON,
                files: {
                    sendToClient: requestedFiles,
                    delete: Array.from(data.trashqueue.values())
                }
            }, 
            function(key, value) {
                if ([                            
                    "groupElem",
                    "songEntries",
                    "playlistEntry",
                    "checkboxDiv",
                    "cycle",
                    "syncStatus",
                    "state"
                ].includes(key)) return undefined;

                if (key === "songs" && this.getOrderedSIDs) return this.getOrderedSIDs();

                // remove song.playlists, but keep serverJSON.playlists
                if (key === "playlists") return this.songs? value : undefined;

                return value;
            }
        ));

        console.log("sending to server: ", a);
        
        zipToServer.addFile("meta.json", 
            JSON.stringify(a)
        );
        const res = await fetch(`https://localhost:5001/sync/${user.uid}/${user.username}/${user.hash1}/${deviceID}`, {
            method: 'PUT',
            body: JSON.stringify(zipToServer.toBuffer().toJSON()),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const resJSON = await res.json();
        console.log("resJSON", resJSON);

        if (resJSON.newUsername) {
            user.setUsername(resJSON.newUsername);
            sendNotification("username was changed to ", resJSON.newUsername);
        }

        await extractAllToPromise(new Zip(Buffer.from(resJSON.data)), global.userDir);

        
        for (const item of unsynced) item.setSyncStatus("synced");
        for (const songData of newItems.songs) {
            songData.syncStatus = "synced";
            new Song(songData.id, songData, false);
        } 
        for (const playlistData of newItems.playlists) {
            playlistData.syncStatus = "synced";
            new Playlist(playlistData.id, playlistData, false);
        } 
        data.trashqueue.clear();
                
    } catch (err) {console.log(err)}

    stopSyncSpin();

    sendNotification("sync complete!");
}




const syncBtn = document.getElementById("sync");

syncBtn.addEventListener("click", () => syncData());
syncBtn.addEventListener("mouseenter", () => showError(syncBtn.tooltip.lastElementChild, ""));

export async function getDoomed() {
    const serverJSON = await getData();

    for (const category of ["songs", "playlists"]) {
        for (const item of data[category].values()) {
    
            // song/playlist isnt in server && syncstatus === "synced" 
            if (!serverJSON[category][item.id] && item.syncStatus === "synced") {
                item.setSyncStatus("doomed");
            }
        }
    }
}



function encrypt(text) {
    if (!text) return;

    const iv = randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", user.password, iv);

    return  iv.toString("hex") + ":" + 
            cipher.update(text, "utf8", "hex") + cipher.final("hex") + ":" +
            cipher.getAuthTag().toString("hex");
}

function decrypt(text) {
    if (!text) return;

    const [ iv, ciphertext, authTag ] = text.split(":");

    const decipher = createDecipheriv("aes-256-gcm", user.password, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    return decipher.update(ciphertext, "hex", "utf8") + decipher.final("utf8");
}

// zip.addFile("changes.json", Buffer.from(
//     JSON.stringify(changes, 
//         function(key, value) {
//             if ([
//                 "doomed",
//                 "newItems",
                
//                 "playlists",
//                 "groupElem",
//                 "songEntries",
//                 "playlistEntry",
//                 "checkboxDiv",
//                 "cycle",
//                 "syncStatus",
//                 "state"
//             ].includes(key)) return undefined;

//             if (key === "songs") return this.getOrderedSIDs();

//             return value;
//         })
// ));