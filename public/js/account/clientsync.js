import { data, Song, Playlist } from "./userdata.js";
import {  missingFiles, reserved, deviceID, allFiles } from "./files.js";
import { disableBtn, enableBtn, sendNotification, showError, startSyncSpin, stopSyncSpin } from "../view/fx.js";
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
                    //console.log("added", item.filename);
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

    //console.log("sending userdata at ", Date.now());
    const userdataRes = await fetch(`https://172.115.50.238:39999/sync/userdata/${user.uid}/${user.username}/${user.hash1}`, {
        method: "PUT", 
        body: encrypt(JSON.stringify(serverJSON,
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
        ), "utf8")
    }).catch(fetchErrHandler);
    if (userdataRes.status === 401) throw new Error("wrong password");
    let newUsername = await userdataRes.text();
    if (newUsername) {
        user.setUsername(newUsername); 
        sendNotification("username was changed to ", resJSON.newUsername);
    } 

    const editPromise = new Promise( async (res, rej) => {
        const start = Date.now()
        //console.log("starting edit at ", start);
        const deleteMe =    complete? "all" : 
                            data.trashqueue.size === 0? "none" :
                            Array.from(data.trashqueue.values()).map(filename => encrypt(filename, "utf8", user.iv)).join("-");
        //console.log("deleteMe: ", deleteMe);
        await fetch(`https://172.115.50.238:39999/sync/edit/${user.uid}/${user.hash1}/${deleteMe}`, {
            method: 'PUT',
            body: await zipToServer.toBufferPromise(),
            headers: {
                "Content-Type": "application/octet-stream",
            }
        }).catch(fetchErrHandler);
        
        const end = Date.now();
        //console.log("received edit at", end );
        //console.log("total edit time", end - start);

        res();
    });

    const orderPromise = new Promise(async (res, rej) => {
        if (requestedFiles.length === 0) {
            //console.log("skipping order");
            res();
        }
        else {
            const start = Date.now();
            //console.log("starting order get at", start);
            const getRes = await fetch(`https://172.115.50.238:39999/sync/order/${user.uid}/${user.hash1}`, {
                method: 'PUT',
                body: JSON.stringify({
                    sendToClient: requestedFiles.map(path => {
                        return encrypt(path, "utf8", user.iv)
                    }),
                }),
                headers: {
                    "Content-Type": "application/json",
                }
            }).catch(fetchErrHandler);
            const end = Date.now();
            //console.log("received order at, ", end);
            //console.log("total order time", end - start);

            const arr = [];

            const reader = getRes.body.getReader();
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                arr.push(value);
            }

            //console.log("concating now");
            const buf = Buffer.concat(arr);
            //console.log("resolved as buffer at", Date.now(), buf);

            const serverZIP = new Zip(buf);

            //console.log(serverZIP);

            for (const entry of serverZIP.getEntries()) {
                entry.getDataAsync( async (buf, err) => {
                    if (err) throw new Error(err);

                    await fs.promises.writeFile(
                        global.userDir + "/" + decrypt(entry.entryName, "utf8", user.iv), 
                        await snappy.uncompress(decrypt(buf.toString()), {copyOutputData: true})
                    );
                });
            }

            res();

        }
    });

    await Promise.all([editPromise, orderPromise]);

    //console.log("these just synced: ", unsynced);

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
}

let syncing = false;
export async function syncIfNotSyncing(complete) {

    if (isGuest()) return showError(syncBtn.tooltip.lastElementChild, "not signed in!");

    if (syncing) return;
    syncing = true;

    startSyncSpin();
    sendNotification("syncing...");

    try {
        await syncData(complete);
        stopSyncSpin();
        sendNotification("sync complete!");
    } catch (err) {
        stopSyncSpin(false);
        if (err.message === "wrong password") syncDropdown.open();
        throw err;
    }
    
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
    disableBtn(verifyBtn);

    await user.setPassword(verifyInput.value.trim());

    const res = await fetch("https://172.115.50.238:39999/sign-in", {
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
    enableBtn(verifyBtn);

    if (!res) return;
    
    if (res.status === 401) return showError(verifyError, "wrong password");

    syncDropdown.close();
    await syncIfNotSyncing();
    
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


export function encrypt(input, inputEncoding, IV, key = user.key) {
    if (!input) return;

    const iv = IV ?? randomBytes(16);

    const cipher = createCipheriv("aes-256-gcm", key, iv);

    return  iv.toString("hex") + ".." + 
            cipher.update(input, inputEncoding, "hex") + cipher.final("hex") + ".." +
            cipher.getAuthTag().toString("hex");
}

export function decrypt(text, outputEncoding, key = user.key) {
    if (!text) return;

    const [ iv, ciphertext, authTag ] = text.split("..");

    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    const res = decipher.update(ciphertext, "hex", outputEncoding);
    return outputEncoding? res + decipher.final(outputEncoding) : Buffer.concat([res, decipher.final()])
}


async function getData() {
    const res = await fetch(`https://172.115.50.238:39999/get-data/${user.uid}/${user.hash1}`).catch(fetchErrHandler); 
    if (!res) return;
    
    const ciphertext = await res.text();
    return ciphertext? JSON.parse(decrypt(ciphertext, "utf8")) : {playlists: {}, songs: {}};
}