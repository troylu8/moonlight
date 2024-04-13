import genID from "./id.js";
import { updateForUsername, setTitleScreen } from "./signinElems.js";
import { data, Song, Playlist, loadLocaldata } from "./userdata.js";

export let guestID;
export async function fetchGuestID() {
    const res = await fetch("http://localhost:5000/files/guest-id");
    console.log(res.status);
    guestID = await res.text();
    return guestID;
}
export async function saveNewGuestID() {
    guestID = genID(14);
    await fetch("http://localhost:5000/files/guest-id/" + guestID, {method: "PUT"});
}

export let uid;
export let username;

/** @type {string} */
export let jwt;

async function setAccInfo(JWT, UID, USERNAME) {
    if (JWT === "guest") {
        if (!guestID && !(await fetchGuestID()) ) {
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
}
export function clearAccInfo() { jwt = uid = username = null; }

export async function fetchGuestData() {
    await setAccInfo("guest");
    console.log("loading", guestID);
    await loadLocaldata(guestID);
}

export function isGuest() { return uid === guestID; }

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

    setAccInfo(await jwtReq.text(), uid, USERNAME);
    if (!fromGuest) await loadLocaldata(uid);

    return "success";
}

window.onload = async () => {
    
    const cacheReq = await fetch("http://localhost:5000/files/get-cached");
    
    if (!cacheReq.ok) return console.log("no data cached");
    const jwt = await cacheReq.text();
    console.log("cache is", jwt);

    if (jwt === "guest") await fetchGuestData();
    else {
        const info = parseJWT(jwt);
        await setAccInfo(jwt, info.uid, info.username);
        await loadLocaldata(uid);
    }
    
    setTitleScreen(false);
    updateForUsername(username);
}

/** @returns {Promise<"username not found" | "unauthorized" | "success">} */
export async function fetchAccData(USERNAME, PASSWORD) {

    const jwtReq = await fetch("https://localhost:5001/get-jwt/" + USERNAME, {
        method: "POST",
        body: PASSWORD
    });
    if (jwtReq.status === 404) return "username not found";
    if (jwtReq.status === 401) return "wrong password"
    const jwt = await jwtReq.text();

    await setAccInfo(jwt, parseJWT(jwt).uid, USERNAME);
    await loadLocaldata(uid);

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

async function hash(input) {
    const res = await fetch("http://localhost:5000/hash", {
        method: "POST",    
        body: input
    });
    return await res.text();
}

const syncBtn = document.getElementById("sync");
syncBtn.addEventListener("click", () => syncData());

export async function syncData() {
    if (isGuest()) return console.log("not signed in!");

    const serverJSON = await getData();
    
    console.log("server", Object.values(serverJSON.songs).map(s => s.filename ));
    console.log("client", Array.from(data.songs).map(s => { return {syncStatus: s[1].syncStatus, filename: s[1].filename} } ));

    /** if syncing is successful, these items will be created */
    const newItems = {
        /** @type {Array<Song>} new songs client will receive from server */
        songs: [],

        /** @type {Array<Playlist>} new playlists client will receive from server */
        playlists: []
    }
    
    /** sent to server */
    const changes = {
        /** @type {Array<Song>} songs to be merged with server's data.json*/
        "unsynced-songs": [],

        /** @type {Array<Playlist>} playlists to be merged with server's data.json  */
        "unsynced-playlists": [],

        /** @type {Array<string>} all files that client wants from server */
        "requestedFiles": [],

        /** @type {Array<string>} files that the client deleted, so the server should too */
        "trash": Array.from(data.trashqueue),
    };

    /** @param {"songs" | "playlists"} category */
    const addCategoryToChanges = (category) => {

        for (const item of data[category].values()) {
            if (item.syncStatus !== "synced") 
                changes["unsynced-" + category].push(item);

            // syncstatus === "synced" && song/playlist isnt in server
            else if (!serverJSON[category][item.id]) 
                item.delete();
        }

        for (const id of Object.keys(serverJSON[category])) {
            const itemData = serverJSON[category][id];
            const item = data[category].get(id);

            // WANTS - if client doesnt have this song/playlist && not in trash queue
            if (!item) {
                if (!data.trashqueue.has(category + "." + id)) {
                    itemData.id = id;
                    newItems[category].push(itemData);

                    //TODO: push playlist filepaths here!!!!
                    if (category === "songs")
                        changes.requestedFiles.push("songs/" + itemData.filename);
                }
            }

            // if client has song/playlist, but it hasnt been synced to latest changes 
            else if (item.syncStatus === "synced") {
                console.log("updating", item.title);
                item.update(itemData);
            }
                
        }
    }

    addCategoryToChanges("songs");
    addCategoryToChanges("playlists");
    
    console.log("changes ", changes);

    try {
        const response = await fetch("http://localhost:5000/sync/" + uid, {
            method: "POST",
            body: JSON.stringify(changes, 
            (key, value) => {
                if ([
                    "groupElem",
                    "songEntries",
                    "playlistEntry",
                    "checkboxDiv",
                    "cycle"
                ].includes(key)) return undefined;

                if (key === "songs" || key === "playlists") return Array.from(value).map(i => i.id);

                return value;
            }),
            headers: {
                "Content-Type": "application/json"
            },
        });

        console.log("frontend received", response.status);

        if (!response.ok) return;

        console.log("newitems", newItems);
        
        for (const song of changes["unsynced-songs"])           song._syncStatus = "synced";
        for (const playlists of changes["unsynced-playlists"])  playlists._syncStatus = "synced";

        for (const songData of newItems.songs) new Song(songData.id, songData, true);
        for (const playlistData of newItems.playlists) new Playlist(playlistData.id, playlistData, true);
        
        
        data.trashqueue.clear();
        
    } catch (err) {console.log(err)}

} 

export async function getData(jwt) {
    const res = await fetch(`https://localhost:5001/get-data/${jwt}`);
    if (res.ok) return await res.json();
    return res.status;
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