import * as songElements from "./songElements.js";
import { setSong } from "./play.js";

export let data;

async function fetchUserdata() {
    const res = await fetch("http://localhost:5000/files/read-userdata");
    data = await res.json();

    for (const id in data.songs) {
        const song = data.songs[id];
        song.id = id;
        song.playlistIDs = new Set();
    }

    for (let pid in data.playlists) {
        const playlist = data.playlists[pid];
        playlist.id = Number(pid);

        playlist.songIDs = new Set(playlist.songIDs);
        
        for (const sid of playlist.songIDs) {
            console.log(data.songs[sid]);
            data.songs[sid].playlistIDs.add(pid);
        }

        playlist.groupElem = document.getElementById("group " + pid);
        
        songElements.createPlaylistElems(playlist);
    }

    setSong(data.songs[data.currentSongID]);
    songElements.setActivePlaylist(data.playlists[data.currentPlaylistID], true);
}
fetchUserdata();


export function addToPlaylist(song, playlist) {
    song.playlistIDs.add(playlist.id);
    playlist.songIDs.add(song.id);
    return songElements.createSongEntry(song, playlist);
}
export function removeFromPlaylist(song, playlist) {
    song.playlistIDs.delete(playlist.id);
    playlist.songIDs.delete(song.id);
    songElements.deleteSongEntry(song, playlist);
}

export async function deleteSong(id) {
    const song = data.songs[id];

    for (const pid of song.playlistIDs) 
        playlists.get(pid).delete(song);

    delete data.songs[id];

    await fetch("http://localhost:5000/files/" + song.filename)
}

export async function saveData(cb) {
    
    const stringified = JSON.stringify(data, 
        (key, value) => {
            if (["id", "playlistIDs", "groupElem"].includes(key)) return undefined;
            if (value instanceof Set) return Array.from(value)
            return value;
        }, 4
    )

    await fetch("http://localhost:5000/files/save-userdata", {
        method: "PUT",
        body: stringified
    })

    if (cb) cb();
}