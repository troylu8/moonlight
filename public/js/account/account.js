import { data, Song, Playlist, loadLocaldata } from "./userdata.js";
import { syncToServer } from "./clientsync.js";
import { readSavedJWT, getLocalData, setLocalData, readKey, watchFiles, missingFiles, reserved, deviceID } from "./files.js";
import { setTitleScreen, updateForUsername } from "../view/signinElems.js";
import { showError } from "../view/fx.js";

/**
 * @param {number} len 
 * @returns {string} may contain `0-9` `a-z` `A-Z` `_` `-`
 */
export function genID(len) {
    const map = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
    
    let res = "";
    
    for (let i = 0; i < len; i++) 
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

export let uid;
export let username;

/** @type {string} */
export let jwt;

function setAccInfo(JWT, UID, USERNAME) {
    if (JWT === "guest") {
        if (!guestID && !fetchGuestID() ) {
            console.log("no guest id, making one");
            saveNewGuestID();
        }
    
        jwt = null;
        uid = guestID;
        username = "[guest]";
    }
    else {
        jwt = JWT ?? jwt;
        uid = UID ?? uid;
        username = USERNAME ?? username;
    }
    
    global.userDir = global.resources + "/users/" + uid;
}
export function clearAccInfo() { jwt = uid = username = null; }

export async function loadAcc(jwt) {
    if (jwt === "guest") setAccInfo("guest");
    else {
        const info = parseJWT(jwt);
        setAccInfo(jwt, info.uid, info.username);
    }
    
    await loadLocaldata(uid);
    watchFiles(global.userDir + "/songs");
}

export function isGuest() { return data && uid === guestID; }

window.addEventListener("load", async () => {
    await readKey();

    const jwt = readSavedJWT();
    console.log("saved jwt: ", jwt);
    if (!jwt) return;

    await loadAcc(jwt, info.uid, info.username);
    
    setTitleScreen(false);
    updateForUsername(username, isGuest());
});


/** @returns {Promise<"username taken" | "success">} */
export async function createAccData(USERNAME, PASSWORD) {
    const fromGuest = isGuest();
    console.log("fromGuest", fromGuest);
    const uid = fromGuest? guestID : genID(14);
    
    // create account at server
    const jwtReq = await fetch(`https://localhost:5001/create-account-dir/${uid}/${USERNAME}`, {
        method: "POST",
        body: PASSWORD
    });
    if (jwtReq.status === 409) return "username taken";

    // i was going to clear guest id here, but might as well save a new one
    if (fromGuest) saveNewGuestID();

    if (!fromGuest) await loadLocaldata(uid);
    setAccInfo(await jwtReq.text(), uid, USERNAME);
    watchFiles(global.userDir + "/songs")

    return "success";
}

/** @returns {Promise<"username not found" | "unauthorized" | "success">} */
export async function fetchAccData(USERNAME, PASSWORD) {

    const res = await fetch("https://localhost:5001/sign-in/" + USERNAME, {
        method: "POST",
        body: PASSWORD
    })

    if (res.status === 404) return "username not found";
    if (res.status === 401) return "wrong password"

    await loadAcc(await res.text());

    return "success";
}

/** [stack overflow link](https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library) */
function parseJWT(jwt) {    
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

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
                            .filter(fn => missingFiles.get(fn).state !== "new")
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

/** @type {SyncChanges} */
let changes;

export async function getSyncChanges() {
    if (isGuest()) return showError(syncBtn.tooltip.lastElementChild, "not signed in!");

    const serverJSON = await getData(jwt);
    
    console.log("server", Object.values(serverJSON.songs).map(s => s.filename ));
    console.log("client", Array.from(data.songs).map(s => { return {syncStatus: s[1].syncStatus, filename: s[1].filename} } ));

    changes = new SyncChanges();
    
    /** @param {"songs" | "playlists"} category */
    const addCategoryToChanges = (category) => {
        
        for (const item of data[category].values()) {
            // if this song is new and missing a file, then the file will not be at the server.
            if (item.syncStatus === "new" && item.state === "error") continue;

            if (item.syncStatus !== "synced") changes["unsynced-" + category].push(item);

            // syncstatus === "synced" && song/playlist isnt in server
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

                    //TODO: push playlist filepaths here!!!!
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
    
    console.log(changes);
    return changes;
} 

export async function syncData() {
    changes = changes ?? await getSyncChanges();
    try {
        for (const { filename } of changes.newItems.songs)      reserved.add(filename);
        for (const { filename } of changes.newItems.playlists)  reserved.add(filename);
        
        await syncToServer(uid, changes);
        
        console.log("changes ", changes);
        
        for (const song of changes["unsynced-songs"]) song.setSyncStatus("synced");
        for (const playlists of changes["unsynced-playlists"])  playlists.setSyncStatus("synced");

        for (const songData of changes.newItems.songs) {
            songData.syncStatus = "synced";
            new Song(songData.id, songData);
        } 
        for (const playlistData of changes.newItems.playlists) {
            playlistData.syncStatus = "synced";
            new Playlist(playlistData.id, playlistData);
        } 
        
        data.trashqueue.clear();
        
        for (const item of changes.doomed) item.delete();
        for (const [item, itemData] of changes.update) item.update(itemData);
        
    } catch (err) {console.log(err)}
}

export async function getData(jwt) {
    const res = await fetch(`https://localhost:5001/get-data/${jwt}`); 
    if (res.ok) return await res.json();
}

export async function uploadData() {
    await fetch(`https://localhost:5001/upload-data/${uid}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: data.stringify({
            "pass": password,
            "userdata": data
        }, ["curr", "settings", "trashqueue", "edited"])
    });
}