import genID from "./id.js";
import { data, Song, Playlist, loadUserdata } from "./userdata.js";

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

export async function setAccInfo(JWT, UID, USERNAME) {
    if (JWT === "guest") {
        if (!guestID && !(await fetchGuestID()) ) {
            console.log("no guest id, making one");
            saveNewGuestID();
        }
    
        jwt = null;
        uid = guestID;
        username = "guest";
    }
    else {
        jwt = JWT ?? jwt;
        uid = UID ?? uid;
        username = USERNAME ?? username;    
    }
}

window.onload = async () => {
    await setAccInfo("guest");
    loadUserdata(guestID);
};

function usernameErrors(username) {
    if (!isSafeFilename(username)) return "forbidden characters";
    if (username === "") return "empty";
}

/** @returns {"forbidden characters" | "empty" | "passwords dont match" | "username taken" | true} */
export async function createAccount(USERNAME, PASSWORD, repeatPassword) {
    const error = usernameErrors(USERNAME);
    if (error) return error;
    if (PASSWORD !== repeatPassword) return "passwords dont match";

    const uid = (username === "guest")? guestID : genID(14);
    
    // create account at server
    const jwtReq = await fetch(`https://localhost:5001/create-account-dir/${uid}/${create__username.value}`, {
        method: "POST",
        body: PASSWORD
    });
    if (jwtReq.status === 409) return "username taken";

    saveNewGuestID();

    setAccInfo(await jwtReq.text(), uid, USERNAME);
    setAccountElem(accountInfo);

    return true;
}


const syncBtn = document.getElementById("sync");
syncBtn.addEventListener("click", () => syncData());

export async function syncData() {
    if (username === "guest") return console.log("not signed in!");

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