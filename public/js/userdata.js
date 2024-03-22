import * as songElements from "./songElements.js";
import { setSong } from "./play.js";
import { openSongSettings } from "./songSettings.js";

export let data;

// playlistid -> set of songs
const playlists = new Map();


async function fetchUserdata() {
    const res = await fetch("http://localhost:5000/files/read-userdata");
    data = await res.json();

    for (let pid in data.playlistNames) {
        playlists.set(Number(pid), new Set());
        songElements.createPlaylistElems(Number(pid), data.playlistNames[pid]);
        songElements.playlistGroupElems.set(Number(pid), document.getElementById("group " + pid));
    }

    for (const id in data.songs) {
        loadSong(data.songs[id], id)
    }

    setSong(data.songs[data.currentSongID]);
    songElements.setActivePlaylist(data.currentPlaylistID, true);
}
fetchUserdata();

/** convert playlistIDs to set, add to playlists, add to userdata.songs, open settings */
export function loadSong(song, id) {
    const isNewSong = id === undefined;

    song.playlistIDs = new Set(song.playlistIDs);

    if (isNewSong) {
        console.log(song.id + " added to data.songs");
        data.songs[song.id] = song;
    }
    // if loading a song from json, set song.id
    else song.id = id;

    // newly created songs are only in 1 playlist
    if (isNewSong) {
        console.log(song.playlistIDs);
        const songElems = addToPlaylist(song, Array.from(song.playlistIDs)[0]);
        openSongSettings(song, songElems[1], songElems[2]);
    }
    else {
        for (const pid of song.playlistIDs) 
            addToPlaylist(song, pid);
    }
}

export function addToPlaylist(song, playlistID) {
    console.log(playlistID);
    playlists.get(playlistID).add(song);
    
    return songElements.createSongEntry(song, songElements.playlistGroupElems.get(playlistID));
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
            if (value instanceof Set) return Array.from(value);
            if (key === "id") return undefined;
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