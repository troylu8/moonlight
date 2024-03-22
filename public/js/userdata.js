import * as songElements from "./songElements.js"

export let data;

// playlistid -> set of songs
const playlists = new Map();
const playlistElems = new Map();

async function fetchUserdata() {
    const res = await fetch("http://localhost:5000/files/read-userdata");
    data = await res.json();

    for (const pid in data.playlistNames) {
        playlists.set(Number(pid), new Set());
        playlistElems.set(Number(pid), document.getElementById(pid));
    }

    for (const id in data.songs) {
        console.log(id);
        loadSong(data.songs[id])
    }
}
fetchUserdata();

/** convert playlistIDs to set, add to playlists, add to userdata.songs */
export function loadSong(song) {
    song.playlistIDs = new Set(song.playlistIDs);

    for (const pid of song.playlistIDs) 
        addToPlaylist(song, pid);

    if (song.id !== undefined) {
        console.log(song.id + " added to data.songs");
        data.songs[song.id] = song;
    }

}

export function addToPlaylist(song, playlistID) {
    playlists.get(playlistID).add(song);
    songElements.createSongElem(song, playlistElems.get(playlistID));
}

export async function deleteSong(id) {
    const song = data.songs[id];

    for (const pid of song.playlistIDs) 
        playlists.get(pid).delete(song);

    delete data.songs[id];

    await fetch("")//TODO:
}

export async function saveData(cb) {
    
    const stringified = JSON.stringify(data, 
        (key, value) => {
            if (value instanceof Set) return Array.from(value);
            if (key === "id" || key === "size") return undefined;
            return value;
        }, 4
    )

    await fetch("http://localhost:5000/files/save-userdata", {
        method: "PUT",
        body: stringified
    })

    if (cb) cb();
}

export function printPlaylists() {
    if (playlists.size == 0) console.log("no playlists");
    for (const entry of playlists) {
        console.log(data.playlistNames["" + entry[0]], entry[1]);
    }
}