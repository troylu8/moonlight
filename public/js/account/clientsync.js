import { data, Song, Playlist } from "./userdata.js";
import {  missingFiles, reserved, deviceID, allFiles } from "./files.js";
import { sendNotification, showError, startSyncSpin, stopSyncSpin } from "../view/fx.js";
import { fetchErrHandler, isGuest, user } from "./account.js";
import Dropdown from "../view/dropdown.js";
const fs = require('fs');
const snappy = require('snappy');
const Zip = require("adm-zip");
const { promisify } = require('util');
const { createCipheriv, createDecipheriv, randomBytes, pbkdf2 } = require("crypto");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


/**
 * @param {boolean} complete if true, delete all userfiles at server and upload everything
 */
async function syncData(complete) {
    
    if (isGuest()) return showError(syncBtn.tooltip.lastElementChild, "not signed in!");

    startSyncSpin();
    sendNotification("syncing...");

    try {
        const serverJSON = complete? {playlists:{}, songs:{}} : await getData();
        if (!serverJSON) throw new Error("can't connect to server");

        const requestedFiles = Array.from(missingFiles.keys())
                                .filter(fn => missingFiles.get(fn).syncStatus !== "local")
                                .map(fn => "songs/" + fn);
        const zipToServer = new Zip();

        /** if sync is successful, call `.setSyncStatus("synced")` on all these items */
        const unsynced = [];

        /** if sync is successful, delete these items */
        const deleted = [];
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
                
                else if (item.syncStatus === "local" || complete) {
                    unsynced.push(item);

                    // if song didn't exist in serverJSON before, add file
                    if (category === "songs" && !serverJSON[category][item.id]) {          
                        const filename = encrypt("songs/" + item.filename, "utf8", user.iv);

                        const compressed = await snappy.compress(await fs.promises.readFile(global.userDir + "\\songs\\" + item.filename), {copyOutputData: true});
                        zipToServer.addFile(filename, encrypt(compressed));
                    }

                    // update/override serverJSON with local item
                    item.lastUpdatedBy = deviceID;
                    serverJSON[category][item.id] = item;
                } 
                else if (!serverJSON[category][item.id]) deleted.push(item);
            }
            
        }

        await syncCategory("songs");
        await syncCategory("playlists");
    
    
        const toServer = {
            userdata: encrypt( JSON.stringify(serverJSON,
                function(key, value) {
                
                    if ([                            
                        "groupElem",
                        "songEntries",
                        "playlistEntry",
                        "checkboxDiv",
                        "id",
                        "cycle",
                        "syncStatus",
                        "state"
                    ].includes(key)) return undefined;
    
    
                    if (key === "songs" && this.getOrderedSIDs) return this.getOrderedSIDs();
    
                    // remove song.playlists, but keep serverJSON.playlists
                    if (key === "playlists") return this.songs? value : undefined;
    
                    return value;
                }
            ), "utf8" ),
            files: {
                sendToClient: requestedFiles.map(path => {
                    console.log(path);
                    return encrypt(path, "utf8", user.iv)
                } ),
                delete: complete? "*" : Array.from(data.trashqueue.values()).map(filename => encrypt(filename, "utf8", user.iv)),
            }
        };
        
        zipToServer.addFile("meta.json", JSON.stringify(toServer));

        const res = await fetch(`https://localhost:5001/sync/${user.uid}/${user.username}/${user.hash1}/${deviceID}`, {
            method: 'PUT',
            body: JSON.stringify(zipToServer.toBuffer().toJSON()),
            headers: {
                "Content-Type": "application/json"
            }
        }).catch(fetchErrHandler);
        if (!res) throw new Error("can't connect to server");
        if (res.status === 401) throw new Error("wrong password");

        const resJSON = await res.json();
        console.log("resJSON", resJSON);

        if (resJSON.newUsername) {
            user.setUsername(resJSON.newUsername);
            sendNotification("username was changed to ", resJSON.newUsername);
        }


        const serverZIP = new Zip(Buffer.from(resJSON.data));

        for (const entry of serverZIP.getEntries()) {
            entry.getDataAsync( async (buf, err) => {
                if (err) throw new Error(err);
    
                await fs.promises.writeFile(
                    global.userDir + "/" + decrypt(entry.entryName, "utf8", user.iv), 
                    await snappy.uncompress(decrypt(buf.toString()), {copyOutputData: true})
                );
            });
        }
        
        for (const item of unsynced) item.setSyncStatus("synced");
        for (const songData of newItems.songs) {
            songData.syncStatus = "synced";
            allFiles.set(songData.filename, new Song(songData.id, songData, false));
        } 
        for (const playlistData of newItems.playlists) {
            playlistData.syncStatus = "synced";
            new Playlist(playlistData.id, playlistData, false);
        }
        data.trashqueue.clear();

        for (const item of deleted) item.delete();

        stopSyncSpin();
        sendNotification("sync complete!");

    } catch (err) {
        stopSyncSpin(false);
        if (err.message === "wrong password") syncDropdown.open();
    }

    
}

let syncing = false;
export async function syncIfNotSyncing(complete) {
    if (syncing) return;
    syncing = true;
    await syncData(complete);
    syncing = false;
}


const syncBtn = document.getElementById("sync");

syncBtn.addEventListener("click", () => syncIfNotSyncing());
syncBtn.addEventListener("mouseenter", () => showError(syncBtn.tooltip.lastElementChild, ""));

const syncDropdown = new Dropdown(syncBtn, document.getElementById("sync__dropdown"), null, null, true);
const verifyInput = document.getElementById("verify-password__input");
const verifyBtn = document.getElementById("verify-password__btn");
const verifyError = document.getElementById("verify-password__error");

verifyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") verifyBtn.click() });
verifyBtn.addEventListener("click", async () => {

    startSyncSpin();

    await user.setPassword(verifyInput.value.trim());

    const res = await fetch("https://localhost:5001/sign-in", {
        method: "POST",
        body: JSON.stringify({
            username: user.username,
            hash1: user.hash1
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }).catch(fetchErrHandler);

    stopSyncSpin(false);

    if (!res) return;
    
    if (res.status === 401) return showError(verifyError, "wrong password");

    syncDropdown.close();
    await syncData();
    
});

export async function getDoomed() {
    const serverJSON = await getData();
    if (!serverJSON) return;

    for (const category of ["songs", "playlists"]) {
        for (const item of data[category].values()) {
    
            // song/playlist isnt in server && syncstatus === "synced" 
            if (!serverJSON[category][item.id] && item.syncStatus === "synced") {
                item.setSyncStatus("doomed");
            }
        }
    }
}


export const deriveBytes = promisify(
    (password, length, cb) => {
        if (!password) return null;
        pbkdf2(password, "should i use scrypt instead?", 100000, length, "sha256", cb);
    }
);


function encrypt(input, inputEncoding, IV) {
    if (!input) return;

    const iv = IV ?? randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", user.key, iv);

    return  iv.toString("hex") + ".." + 
            cipher.update(input, inputEncoding, "hex") + cipher.final("hex") + ".." +
            cipher.getAuthTag().toString("hex");
}

function decrypt(text, outputEncoding) {
    if (!text) return;

    const [ iv, ciphertext, authTag ] = text.split("..");

    const decipher = createDecipheriv("aes-256-gcm", user.key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    const res = decipher.update(ciphertext, "hex", outputEncoding);
    return outputEncoding? res + decipher.final(outputEncoding) : Buffer.concat([res, decipher.final()])
}


async function getData() {
    const res = await fetch(`https://localhost:5001/get-data/${user.uid}/${user.hash1}`).catch(fetchErrHandler); 
    if (!res) return;
    
    const ciphertext = await res.text();
    return ciphertext? JSON.parse(decrypt(ciphertext, "utf8")) : {playlists: {}, songs: {}};
}