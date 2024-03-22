import * as sidebar from "./sidebar.js";
import { currentlyPlaying, titleElem, artistElem } from "./play.js";

const settings = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => sidebar.setSidebarContent(settings, true);


const songSettings = document.getElementById("song-settings");

const filename = document.getElementById("song-settings__filename");
const size = document.getElementById("song-settings__size");
const titleInput = document.getElementById("song-settings__title");
const artistInput = document.getElementById("song-settings__artist");

let currentlyEditing = null;

export function openSongOptions(song) {
    if (song === currentlyEditing) sidebar.setSidebarOpen(false);

    currentlyEditing = song;

    filename.innerText = song.filename;
    size.innerText = (song.size / (1024 * 1000)).toFixed(2) + " MB";
    titleInput.value = song.title;
    artistInput.value = song.artist;

    sidebar.setSidebarContent(songSettings);
}

const songElemTitle = document.getElementById("song " + currentlyEditing.id).firstChild.lastChild;

titleInput.addEventListener("input", (e) => {
    if (currentlyPlaying === currentlyEditing) {
        titleElem.innerText = titleInput.value;
        songElemTitle.innerText = titleInput.value;
    }
})