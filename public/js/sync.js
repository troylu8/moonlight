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
    console.log(json);

    console.log(data);

    for (const sid of Object.keys(json.songs)) {
        const songData = json.songs[sid];
        const song = data.songs.get(sid);

        if (!song) 
            new Song(sid, songData);

        else if (!song.edited) 
            song.update(songData);
    }

    for (const pid of Object.keys(json.playlists)) {
        const playlistData = json.songs[pid];
        const playlist = data.playlists.get(pid);

        if (!playlist) {
            new Playlist(pid, playlistData.title, playlistData.songs.map(sid => data.songs.get(sid)));
        }

        else if (!playlist.edited) 
            playlist.update(songData);
    }

    for (const song of data.songs.values()) {
        // if song not in json && song wasnt edited, delete
        if (!json.songs[song.id] && !song.edited) song.delete();
    }

    for (const playlist of data.playlists.values()) {
        // if playlist not in json && playlist wasnt edited, delete
        if (!json.playlists[playlist.id] && !playlist.edited) playlist.delete();
    }
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
        }, ["curr", "settings"])
    });
}

async function setPassword(p) {
    await fetch(`https://localhost:5001/set-hash/${username}`, {
        method: "POST",
        body: p // in body to allow '/' character
    });
    pass = p;
}