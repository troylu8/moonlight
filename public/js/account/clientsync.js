import { data, Song, Playlist } from "./userdata.js";
import {  missingFiles, reserved, deviceID, allFiles } from "./files.js";
import { sendNotification, showError, startSyncSpin, stopSyncSpin } from "../view/fx.js";
import { fetchErrHandler, isGuest, user } from "./account.js";
const fs = require('fs');
const Zip = require("adm-zip");
const { promisify } = require('util');
const { createCipheriv, createDecipheriv, randomBytes, pbkdf2 } = require("crypto");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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
            
            else if (item.syncStatus === "local") {
                unsynced.push(item);

                // if song didn't exist in serverJSON before, add file
                if (category === "songs" && !serverJSON[category][item.id]) {                    
                    const filename = encrypt("songs/" + item.filename, "utf8", user.iv);
                    const buf = encrypt(await fs.promises.readFile(global.userDir + "/songs/" + item.filename));
                    zipToServer.addFile(filename, buf); 
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
    
    try {
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
                delete: Array.from(data.trashqueue.values()).map(filename => encrypt(filename, "utf8", user.iv)),
            }
        };

        console.log("sending to server: ", toServer);
        
        zipToServer.addFile("meta.json", JSON.stringify(toServer));

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

        const serverZIP = new Zip(Buffer.from(resJSON.data));

        for (const entry of serverZIP.getEntries()) {
            entry.getDataAsync( async (buf, err) => {
                if (err) return console.log(err);
    
                await fs.promises.writeFile(
                    global.userDir + "/" + decrypt(entry.entryName, "utf8"), 
                    decrypt(buf.toString())
                );
            })
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


export const deriveBytes = promisify(
    (password, length, cb) => {
        console.log("deriving key with ", password, password.length);
        if (!password) return null;
        pbkdf2(password, "should i use scrypt instead?", 100000, length, "sha256", cb);
    }
);


function encrypt(text, inputEncoding, IV) {
    if (!text) return;

    const iv = IV ?? randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", user.key, iv);

    return  iv.toString("hex") + ".." + 
            cipher.update(text, inputEncoding, "hex") + cipher.final("hex") + ".." +
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

    console.log("ciphertext", ciphertext);
    console.log("key", user.key);
    console.log(decrypt(ciphertext, "utf8"));

    return ciphertext? JSON.parse(decrypt(ciphertext, "utf8")) : {playlists: {}, songs: {}};
}