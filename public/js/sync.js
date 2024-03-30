import { data, Song, Playlist } from "./userdata.js";

let username;
let pass;

const syncBtn = document.getElementById("sync");
syncBtn.addEventListener("click", () => syncData());

export async function syncData() {
    if (!username) {
        return console.log("not signed in!");
    }
    const json = await getData();
    
    console.log("server", Object.values(json.songs).map(s => s.filename ));
    console.log("client", Array.from(data.songs).map(s => { return {edited: s[1].edited, filename: s[1].filename} } ));

    const client = { wants: [], /*trash: []*/};
    const server = { wants: [], trash: [] };

    // SERVER.TRASH - client's trash queue
    server.trash = Array.from(data.trashqueue);

    for (const sid of Object.keys(json.songs)) {
        const songData = json.songs[sid];
        const song = data.songs.get(sid);

        // CLIENT.WANTS - if client doesnt have this song && not in trash queue
        if (!song) {
            if (!data.trashqueue.has(songData.filename)) {
                // new Song(sid, songData);
                client.wants.push(songData.filename);
            }
        }

        // if client has song, but it hasnt been synced to latest changes 
        else if (song.edited) 
            song.update(songData);
    }

    data.trashqueue.clear();

    for (const song of data.songs.values()) {
        
        if (!json.songs[song.id]) {
            
            // SERVER.WANTS - edited songs that client has but server doesnt
            if (song.edited) {
                server.wants.push(song.filename);
            }

            // CLIENT.TRASH - unedited songs that client has but server doesnt
            else {
                // client.trash.push(song.filename); 
                song.delete();
            }
        }
        
    }
    

    console.log("client ", client);
    console.log("server ", server);

    fetch("http://localhost:5000/sync/upload/" + username, {
        method: "POST",
        body: JSON.stringify(server),
        headers: {
            "Content-Type": "application/json"
        },
    })

    // for (const pid of Object.keys(json.playlists)) {
    //     const playlistData = json.songs[pid];
    //     const playlist = data.playlists.get(pid);

    //     if (!playlist) {
    //         new Playlist(pid, playlistData.title, playlistData.songs.map(sid => data.songs.get(sid)));
    //     }

    //     else if (!playlist.edited) 
    //         playlist.update(songData);
    // }

    

    // for (const playlist of data.playlists.values()) {
    //     // if playlist not in json && playlist wasnt edited, delete
    //     if (!json.playlists[playlist.id] && !playlist.edited) playlist.delete();
    // }
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
        }, ["curr", "settings", "trashqueue"])
    });
}

async function setPassword(p) {
    await fetch(`https://localhost:5001/set-hash/${username}`, {
        method: "POST",
        body: p // in body to allow '/' character
    });
    pass = p;
}