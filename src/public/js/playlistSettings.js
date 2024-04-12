import { setSidebarContent, setSidebarOpen } from "./sidebar.js";
import { Playlist, data } from "./userdata.js";
import { playlistHeader, playlistDesc } from "./songElements.js";
import genID from "./id.js";

document.getElementById("new-playlist").addEventListener("click", () => {
    new Playlist(genID(14), { title: "new playlist" });
})

const playlistSettings = document.getElementById("playlist-settings");

const titleInput = document.getElementById("playlist-settings__title");
const descInput = document.getElementById("playlist-settings__desc");
const deleteBtn = document.getElementById("playlist-settings__delete");

/** @type {Playlist} */
let currentlyEditing;

/** @param {Playlist} playlist */
export function openPlaylistSettings(playlist) {
    currentlyEditing = playlist;

    titleInput.value = playlist.title;
    descInput.value = playlist.desc;

    setSidebarContent(playlistSettings);
}

titleInput.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.title = titleInput.value;

    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistHeader.innerText = titleInput.value;    

    currentlyEditing.playlistEntry.firstElementChild.innerText = titleInput.value;
});
descInput.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.desc = descInput.value;
    
    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistDesc.innerText = descInput.value;
});
deleteBtn.addEventListener("click", () => {
    currentlyEditing.delete();
    setSidebarOpen(false);
})