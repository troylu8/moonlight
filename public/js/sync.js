import { data, Song, Playlist } from "./userdata.js";

let username;
let pass;

const syncBtn = document.getElementById("sync");
syncBtn.addEventListener("click", () => syncData());

export async function syncData() {
    if (!username) {
        return console.log("not signed in!");
    }
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
            else if (item.syncStatus === "synced") 
                item.update(itemData);
        }
    }

    addCategoryToChanges("songs");
    addCategoryToChanges("playlists");
    
    console.log("changes ", changes);

    try {
        const response = await fetch("http://localhost:5000/sync/" + username, {
            method: "POST",
            body: JSON.stringify(changes, 
            (key, value) => {
                if ([
                    "groupElem",
                    "songEntries",
                    "playlistEntry",
                    "checkboxDiv",
                    "playlists",
                    "cycle"
                ].includes(key)) return undefined;

                if (key === "songs") return Array.from(value).map(s => s.id);

                return value;
            }),
            headers: {
                "Content-Type": "application/json"
            },
        });

        console.log("frontend received", response.status);

        if (!response.ok) return;
        
        for (const song of changes["unsynced-songs"]) 
            song.syncStatus = "synced";
        for (const playlists of changes["unsynced-playlists"]) 
            playlists.syncStatus = "synced";

        for (const song of newItems.songs) {
            song.syncStatus = "synced";
            console.log("newitems", newItems);
            new Song(song.id, song);
            console.log("created new song", song.title);
        }
        for (const playlist of newItems.playlists) {
            playlist.syncStatus = "synced";
            new Playlist(playlist.id, playlist);
            console.log("created new playlist", playlist.title);
        }
        
        
        data.trashqueue.clear();
        
    } catch (err) {console.log(err)}

} 

export async function setCredentials(u, p, newAccount) {
    username = u;
    pass = p;

    if (newAccount) await setPassword(pass);
}

export async function getData() {
    console.log("getting data with ", pass);
    const res = await fetch(`https://localhost:5001/get-data/${username}`, {
        method: "POST",
        body: pass
    })
    if (res.ok) return await res.json();

    return res.status;
}

export async function uploadData() {
    await fetch(`https://localhost:5001/upload-data/${username}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: data.stringify({
            "pass": pass,
            "userdata": data
        }, ["curr", "settings", "trashqueue", "edited"])
    });
}

async function setPassword(p) {
    await fetch(`https://localhost:5001/set-hash/${username}`, {
        method: "POST",
        body: p // in body to allow '/' character
    });
    pass = p;
}