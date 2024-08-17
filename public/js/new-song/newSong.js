import { openSongSettings } from "../settings/songSettings.js"
import { data, Song } from "../account/userdata.js";
import { genID } from "../account/account.js";
import * as yt from "./getyt.js";
import { allFiles, uploadSongFile } from "../account/files.js";
import { sendNotification, showError } from "../view/fx.js";
import { removeClosedTrackerElems } from "./tracker.js";
import Dropdown from "../view/dropdown.js";
const { ipcRenderer } = require("electron");

const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");
const error = document.getElementById("new__error");

export const new__dropdown = new Dropdown(
    document.getElementById("new"), 
    document.getElementById("new__dropdown"),
    removeClosedTrackerElems,
    () => input.value = error.textContent = ""
);

function getYTID(link) {
    link = link.trim();
    if (link.length === 0) throw new Error("link cannot be empty");
    
    if (/^([0-9a-z]|-|_){11}$/i.test(link)) return {type: "song", id: link};
    if (/^([0-9a-z]|-|_){34}$/i.test(link)) return {type: "playlist", id: link};
    
    const url = new URL(link);
    if (url.hostname === "youtu.be") return { type: "song", id: link.slice(-11) };
    if (url.hostname !== "youtube.com" && url.hostname !== "www.youtube.com") throw new Error("not a youtube link");
    
    if (url.searchParams.has("v")) return {type: "song", id: url.searchParams.get("v")};
    if (url.searchParams.has("list")) return {type: "playlist", id: url.searchParams.get("list")};
    
    throw new Error("invalid link");
}

button.onclick = async () => {
    try { 
        const idInfo = getYTID(input.value);
        if (idInfo.type === "song") {

            if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");
            
            yt.downloadSong(
                idInfo.id, 
                (err, songData) => {
                    if (err) return showError(error, err.message);
                    if (songData) initNewSong(songData);  // video downloaded successfully
                }
            ); 
        }
        else yt.downloadPlaylist(idInfo.id, () => {});
        
    }
    catch (err) { return showError(error, err.message); }
    
    error.textContent = "";
    
}

input.onkeydown = (e) => { if (e.key === "Enter") button.onclick(); }

// eturn  /^([0-9a-z]|-|_){11}$/i.test(input)  || // yt song id 
//             /^([0-9a-z]|-|_){34}$/i.test(input)  || // yt playlist id 
// input.startsWith("https://www.youtube.com/watch?v=");
//             input.startsWith("www.youtube.com/watch?v=") || 
//             input.startsWith("youtube.com/watch?v=") || 
//             input.startsWith("youtu.be/watch?v=")

export async function initNewSong(songData, playlist, openSettings, before) {    
    const song = new Song(songData.id, songData);
    const songEntry = song.addToPlaylist(playlist ?? data.curr.viewPlaylist, true, before); 
    if (openSettings ?? true) openSongSettings(song, songEntry.titleElem, songEntry.artistElem);
    
    allFiles.set(song.filename, song);
}

document.getElementById("song-upload").addEventListener("click", async () => {
    if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");
    // fileInput.click();

    const dialog = await ipcRenderer.invoke("show-dialog", {
        title: "upload song ",
        properties: ['openFile'],
        filters: [
            { name: 'music', extensions: ["mp3", "wav", "m4a", "avi", "ogg"] },
        ],
    });
    if (dialog.canceled) return;

    const songData = await uploadSongFile(genID(14), dialog.filePaths[0], true);
    initNewSong(songData);
    sendNotification("uploaded song " + songData.title);
});

