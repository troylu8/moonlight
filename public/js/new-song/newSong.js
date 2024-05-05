import Dropdown from "../view/dropdown.js"
import * as songSettings from "../settings/songSettings.js"
import { data, Song } from "../account/userdata.js";
import { genID } from "../account/account.js";
import * as yt from "./getyt.js";
import { allFiles, uploadSongFile } from "../account/files.js";
import { showError } from "../view/fx.js";
const { ipcRenderer } = require("electron");


const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");
const error = document.getElementById("new__error");


/** between dings from getyt and destroy, button is disabled */
let enabled = true;
/** if true, loading bar active. determines whether button sends getyt or destroy, and stops loading bar  */
export let tracking = false;

let updateLoadingBarID;

async function getyt(link) {
    link = link.trim();
    
    if (!isValidLink(link)) return showError(error, "invalid link");

    const ytid = getYTID(link);
    
    //TODO: enable this
    // if ( data.songs["yt" + id] !== undefined ) return showError(error, "yt video already downloaded");
    
    if ( !(await videoExists(ytid)) ) return showError(error, "video doesn't exist");

    yt.download(ytid, (songData) => {
        if (songData) initNewSong(songData);  // video downloaded successfully
    });
}

/** add to data.songs, add to current playlist, open settings */
async function initNewSong(songData) {    
    const song = new Song(songData.id, songData);
    const songElems = song.addToPlaylist(data.curr.viewPlaylist); 
    songSettings.openSongSettings(song, songElems[1], songElems[2]);

    allFiles.set(song.filename, song);
}

new Dropdown(
    document.getElementById("new"), 
    document.getElementById("new__dropdown"),
    () => error.textContent = ""
);

button.onclick = () => {
    if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");
    getyt(input.value);
}

input.onkeydown = (e) => { if (e.key === "Enter") button.onclick(); }

async function videoExists(id) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id);
    return res.status === 200; 
}

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

/** 
 * @param {string} link yt link 
 */
function getYTID(link) { return link.slice(-11); }


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

