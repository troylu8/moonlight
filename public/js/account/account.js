import { data, Song, Playlist, loadLocaldata } from "./userdata.js";
import { syncToServer } from "./clientsync.js";
import { decryptLocalData, getLocalData, setLocalData, watchFiles, missingFiles, reserved, deviceID, encryptLocalData } from "./files.js";
import { setTitleScreen, updateForUsername } from "../view/signinElems.js";
import { sendNotification, showError, startSyncSpin, stopSyncSpin } from "../view/fx.js";
const { createHash } = require('crypto');
const { ipcRenderer } = require("electron");

/**
 * @param {number} len 
 * @returns {string} may contain `0-9` `a-z` `A-Z` `_` `-`
 */
export function genID(len) {
    const map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
    
    let res = map[Math.floor(Math.random() * 52)]; // first character of css classes cannot be a number
    
    for (let i = 0; i < len-1; i++) 
        res += map[ crypto.getRandomValues(new Uint8Array(1))[0] >> 2 ]
    
    return res;
}

export let guestID;
function fetchGuestID() {
    guestID = getLocalData("guest id");
    return guestID;
}
function saveNewGuestID() {
    guestID = genID(14);
    setLocalData("guest id", guestID);
}

export function isGuest() { return data && user.uid === guestID; }

export let user = {

    uid: null,
    username: null,
    password: null,
    hash1: null,
    
    setInfo(uid, username, password, hash1) {
        if (uid === "guest") {
            if (!guestID && !fetchGuestID() ) {
                console.log("no guest id, making one");
                saveNewGuestID();
            }
            uid = guestID;
            username = "";
        }
        else {
            console.log(uid, username, password, hash1);
            this.password = password;
            this.hash1 = hash1 ?? createHash("sha256").update(password).digest("hex");    
        }
        this.setUID(uid);
        this.setUsername(username);
    },
    setUID(uid) {
        this.uid = uid;
        global.userDir = global.resources + "/users/" + uid;
    },
    setUsername(username) {
        this.username = username;
        updateForUsername(username, isGuest());
    },

    clearInfo() {
        this.setUID(null);
        this.setUsername(null);
        this.password = this.hash1 = null;
    },

    async saveLocal() {
        setLocalData("uid", isGuest()? "guest" : this.uid);
        setLocalData("username", isGuest()? null : this.username);
        await encryptLocalData("key", isGuest()? null : this.password);
    }
}

export async function loadAcc(uid, username, password) {
    user.setInfo(uid, username, password);
    await loadLocaldata(user.uid);
    watchFiles(global.userDir + "/songs");
}

window.addEventListener("load", async () => {

    const uid = getLocalData("uid");
    if (!uid) return;

    const username = getLocalData("username");
    const password = await decryptLocalData("key");
    console.log("saved pass: ", password);

    await loadAcc(uid, username, password);
    
    setTitleScreen(false);

    if (!isGuest()) {
        const serverJSON = await getData();
        getDoomed(serverJSON, "songs");
        getDoomed(serverJSON, "playlists");
    }
});

ipcRenderer.on("cleanup", async () => {
    if (data) {
        await data.saveDataLocal();
        if (data.settings["stay-signed-in"]) await user.saveLocal();
    }
    console.log("done");
    ipcRenderer.send("cleanup-done");
});

/** @returns {Promise<"username taken" | "success">} */
export async function createAccData(username, password) {
    const fromGuest = isGuest();
    console.log("fromGuest", fromGuest);

    const uid = fromGuest? guestID : genID(14);
    const hash1 = createHash("sha256").update(password).digest("hex");
    
    // create account at server
    const res = await fetch(`https://localhost:5001/create-account-dir/${uid}`, {
        method: "POST",
        body: JSON.stringify({
            username: username,
            hash1: hash1
        }),
        headers: {
            "Content-Type": "application/json"
        },
    }).catch(fetchErrHandler);
    if (!res) return;

    if (res.status === 409) return "username taken";

    // i was going to clear guest id here, but might as well save a new one
    if (fromGuest) saveNewGuestID();

    if (!fromGuest) await loadLocaldata(uid);
    user.setInfo(uid, username, password, hash1);

    watchFiles(global.userDir + "/songs")

    return "success";
}

/** @returns {Promise<"username not found" | "unauthorized" | "success">} */
export async function fetchAccData(username, password) {

    const hash1 = createHash("sha256").update(password).digest("hex");

    const res = await fetch("https://localhost:5001/sign-in", {
        method: "POST",
        body: JSON.stringify({
            username: username,
            hash1: hash1
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }).catch(fetchErrHandler);
    if (!res) return;

    if (res.status === 404) return "username not found";
    if (res.status === 401) return "wrong password"

    await loadAcc(await res.text(), username, password, hash1);

    return "success";
}

/** [stack overflow link](https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library) */
// export function parseJWT(jwt) {    
//     const base64Url = jwt.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
//         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//     }).join(''));

//     return JSON.parse(jsonPayload);
// }

const syncBtn = document.getElementById("sync");

syncBtn.addEventListener("click", () => syncData());
syncBtn.addEventListener("mouseenter", () => showError(syncBtn.tooltip.lastElementChild, ""));


/** sent to server */
class SyncChanges {
    constructor() {
        /** @type {Array<Song>} songs to be merged with server's data.json*/
        this["unsynced-songs"] = [],

        /** @type {Array<Playlist>} playlists to be merged with server's data.json  */
        this["unsynced-playlists"] = [],

        /** @type {Array<string>} all files that client wants from server: error state songs + songs that server has client doesnt*/
        this.requestedFiles = Array.from(missingFiles.keys())
                            .filter(fn => missingFiles.get(fn).syncStatus !== "new")
                            .map(fn => "songs/" + fn),

        /** @type {Array<string>} files that the client deleted, so the server should too */
        this.trash = Array.from(data.trashqueue),

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

function getDoomed(serverJSON, category) {
    const res = [];
    for (const item of data[category].values()) {

        // song/playlist isnt in server && syncstatus === "synced" 
        if (!serverJSON[category][item.id] && item.syncstatus === "synced") {
            item.setSyncStatus("doomed");
            res.push(item);
        }
    }
    return res;
}

export async function syncData() {
    
    if (isGuest()) return showError(syncBtn.tooltip.lastElementChild, "not signed in!");

    startSyncSpin();

    const serverJSON = await getData();

    const changes = new SyncChanges();
    
    /** @param {"songs" | "playlists"} category */
    const addCategoryToChanges = (category) => {

        changes.doomed = getDoomed(serverJSON, category);
        
        for (const item of data[category].values()) {
            // if this song is missing a file and new, ignore it.
            if (item.state === "error" && item.syncStatus === "new") continue;
            
            else if (item.syncStatus === "new" || item.syncStatus === "edited") changes["unsynced-" + category].push(item);

            else if (!serverJSON[category][item.id]) {
                item.setSyncStatus("doomed");
                changes.doomed.push(item);
            }
        }

        for (const id of Object.keys(serverJSON[category])) {
            const itemData = serverJSON[category][id];
            const item = data[category].get(id);

            // WANTS - if client doesnt have this song/playlist && not in trash queue
            if (!item) {
                if (!data.trashqueue.has(category + "." + id)) {
                    itemData.id = id;
                    changes.newItems[category].push(itemData);

                    if (category === "songs")
                        changes.requestedFiles.push("songs/" + itemData.filename);
                }
            }

            // if client has song/playlist, but it hasnt been synced to latest changes 
            else if (item.syncStatus === "synced" && itemData.lastUpdatedBy !== deviceID) {
                changes.update.push([item, itemData]);
            } 
                
        }
        
    }

    addCategoryToChanges("songs");
    addCategoryToChanges("playlists");
    
    for (const { filename } of changes.newItems.songs)      reserved.add(filename);
    for (const { filename } of changes.newItems.playlists)  reserved.add(filename);

    try {
        
        await syncToServer(changes);
        
        for (const song of changes["unsynced-songs"]) song.setSyncStatus("synced");
        for (const playlists of changes["unsynced-playlists"])  playlists.setSyncStatus("synced");

        for (const songData of changes.newItems.songs) {
            songData.syncStatus = "synced";
            new Song(songData.id, songData, false);
        } 
        for (const playlistData of changes.newItems.playlists) {
            playlistData.syncStatus = "synced";
            new Playlist(playlistData.id, playlistData, false);
        } 
        
        data.trashqueue.clear();
        
        for (const item of changes.doomed) item.delete();
        for (const [item, itemData] of changes.update) item.update(itemData);
        
    } catch (err) {console.log(err)}

    stopSyncSpin();

    sendNotification("sync complete!");
}

export async function getData() {
    const res = await fetch(`https://localhost:5001/get-data/${user.uid}/${user.hash1}`).catch(fetchErrHandler); 
    if (res && res.ok) return await res.json();
}

export function fetchErrHandler(err) {
    if (err.message === "Failed to fetch")
        sendNotification("can't connect to server", "var(--error-color)");
}