import Dropdown from "../view/dropdown.js"
import * as songSettings from "../settings/songSettings.js"
import { data, Song } from "../account/userdata.js";
import { genID, uid } from "../account/account.js";
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

    setButtonEnabled(false, "...");
    
    if ( !(await videoExists(ytid)) ) {
        showError(error, "video doesn't exist");
        return setButtonEnabled(true, "get");
    }
    
 
    tracking = true;
    loadingBar.style.opacity = "1";
    setLoadingBar(0.05);

    updateLoadingBarID = setInterval( async () => {

        const percent = yt.tracker.downloaded / yt.tracker.total;

        console.log("received " + percent);
        setLoadingBar(Math.max(percent, 0.05));
    }, 50);

    
    setButtonEnabled(true, "x");
    
    yt.download(ytid, (songData) => {
        if (songData) { // video downloaded fully
            setLoadingBar(1);
            stopLoading(true);
            button.textContent = "get";

            initNewSong(songData);
        }
    });
}

/** add to data.songs, add to current playlist, open settings */
async function initNewSong(songData) {    
    const song = new Song(songData.id, songData);
    const songElems = song.addToPlaylist(data.curr.viewPlaylist); 
    songSettings.openSongSettings(song, songElems[1], songElems[2]);

    allFiles.set(song.filename, song);
}

const dropdown = new Dropdown(
    document.getElementById("new"), 
    document.getElementById("new__dropdown"),
    {
        allowClose: () => !tracking,
        onclose: () => error.textContent = ""
    }
);

function stopLoading(closeDropdown) {
    tracking = false;
    setTimeout(() => {
        loadingBar.style.opacity = "0";
        setTimeout(() => {  // wait for transition time before resetting loading bar
            setLoadingBar(0);
            if (closeDropdown) dropdown.close();

            console.log("stopped loading");
        }, 300);
    }, 200);
    
    return clearInterval(updateLoadingBarID);
}

function setButtonEnabled(val, text) {
    enabled = val;
    button.textContent = text;
}

async function destroy() {
    stopLoading(false);

    setButtonEnabled(false, "...");
    await yt.destroy();
    setButtonEnabled(true, "get");
}

button.onclick = () => {
    if (!enabled) return console.log("can't click now!");

    if (tracking) destroy();
    else {
        if (!data.curr.viewPlaylist) return showError(error, "select a playlist to add song");
        getyt(input.value);
    } 
}

input.onkeydown = (e) => {
    if (e.key === "Enter") button.onclick()
}

const loadingBar = document.getElementById("loading-bar");
function setLoadingBar(percent) {
    loadingBar.style.width = percent * 100 + "%";
}

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

