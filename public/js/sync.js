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

    const changes = { 
        /** @type {Array<Song>} unsynced songs  */
        unsynced: [],

        /** @type {Array<Song>} songs server has that client wants */
        wants: [],

        /** @type {Array<string>} files that the client deleted, so the server should too */
        trash: Array.from(data.trashqueue),
    };

    for (const song of data.songs.values()) {
        if (song.syncStatus !== "synced") 
            changes.unsynced.push(song);

        // syncstatus === "synced" && song isnt in server
        else if (!serverJSON.songs[song.id]) 
            song.delete();
    }

    for (const sid of Object.keys(serverJSON.songs)) {
        const songData = serverJSON.songs[sid];
        const song = data.songs.get(sid);

        // WANTS - if client doesnt have this song && not in trash queue
        if (!song) {
            if (!data.trashqueue.has(sid)) {
                songData.id = sid;
                changes.wants.push(songData);
            }
        }

        // if client has song, but it hasnt been synced to latest changes 
        else if (song.syncStatus === "synced") 
            song.update(songData);
    }
    
    console.log("changes ", changes);

    try {
        const response = await fetch("http://localhost:5000/sync/" + username, {
            method: "POST",
            body: JSON.stringify(changes, 
            (key, value) => {
                if (["songEntries", "playlists"].includes(key)) return undefined;
                if (key === "wants") return value.map(s => s.filename);
                return value;
            }),
            headers: {
                "Content-Type": "application/json"
            },
        });

        console.log("frontend received", response.status);

        if (!response.ok) return;
            
        for (const song of changes.unsynced) 
            song.syncStatus = "synced";

        for (const song of changes.wants) {
            song.syncStatus = "synced";
            new Song(song.id, song);
            console.log("created new song", song.title);
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


// for (const song of data.songs.values()) {
        
//     if (!serverJSON.songs[song.id]) {
        
//         // SERVER.WANTS - edited songs that client has but server doesnt
//         if (song.edited) {
//             server.new[song.id] = song;
//         }

//         // CLIENT.TRASH - unedited songs that client has but server doesnt
//         else {
//             // client.trash.push(song.filename); 
//             song.delete();
//         }
//     }
    
// }