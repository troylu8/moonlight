import { openSongSettings } from "../settings/songSettings.js"
import { data, Song } from "../account/userdata.js";
import { genID } from "../account/account.js";
import * as yt from "./getyt.js";
import { allFiles, uploadSongFile } from "../account/files.js";
import { showError } from "../view/fx.js";
import { removeClosedTrackerElems } from "./tracker.js";
import Dropdown from "../view/dropdown.js";
const { ipcRenderer } = require("electron");

const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");
const error = document.getElementById("new__error");

export const new__dropdown = new Dropdown(
    document.getElementById("new"), 
    document.getElementById("new__dropdown"),
    () => {
        error.textContent = "";
        removeClosedTrackerElems();
    } 
);

async function getYTID(link) {
    link = link.trim();

    if (!isValidLink(link)) throw new Error("invalid link");

    const ytid = link.slice(-11);
        
    error.textContent = "";
    return ytid;
}

button.onclick = async () => {
    if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");

    try { 
        yt.downloadSong(
            await getYTID(input.value), 
            (songData) => {
                if (songData) initNewSong(songData);  // video downloaded successfully
            }
        ); 
    } 
    catch (err) { showError(error, err.message); }
}

input.onkeydown = (e) => { if (e.key === "Enter") button.onclick(); }



/** 
 * @param {string} input yt link 
 */
function isValidLink(input) {
    return  /^([0-9a-z]|-|_){11}$/i.test(input)  || // yt id 
            input.startsWith("https://www.youtube.com/watch?v=") ||
            input.startsWith("www.youtube.com/watch?v=") || 
            input.startsWith("youtube.com/watch?v=") || 
            input.startsWith("youtu.be/watch?v=")
}

export async function initNewSong(songData, playlist, openSettings) {    
    const song = new Song(songData.id, songData);
    const songElems = song.addToPlaylist(playlist ?? data.curr.viewPlaylist); 
    if (openSettings ?? true) openSongSettings(song, songElems[1], songElems[2]);
    
    allFiles.set(song.filename, song);
}

// INFO: for NW    
// const fileInput = document.getElementById("song-upload__input");
// fileInput.addEventListener("change", async () => {
//     const songData = await uploadSongFile(uid, fileInput.value, true);
//     if (songData instanceof Object) initNewSong(songData);
// });

document.getElementById("song-upload").addEventListener("click", async () => {
    if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");
    // fileInput.click();

    const dialog = await ipcRenderer.invoke("show-dialog", {
        title: "upload song ",
        properties: ['openFile'],
        filters: [
            { name: 'music', extensions: ["mp3", "wav", "m4a", "avi"] },
        ],
    });
    if (dialog.canceled) return;

    const songData = await uploadSongFile(genID(14), dialog.filePaths[0], true);
    initNewSong(songData);
});

