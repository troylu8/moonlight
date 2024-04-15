import { setSidebarContent, setSidebarOpen } from "./sidebar.js";
import { Playlist, data } from "./userdata.js";
import { playlistHeader, playlistDesc } from "./songElements.js";
import genID from "./id.js";

document.getElementById("new-playlist").addEventListener("click", () => {
    new Playlist(genID(14), { title: "new playlist" });
})

const playlistSettings = document.getElementById("playlist-settings");

const titleArea = document.getElementById("playlist-settings__title");
const descArea = document.getElementById("playlist-settings__desc");
const deleteBtn = document.getElementById("playlist-settings__delete");

/** @type {Playlist} */
let currentlyEditing;

/** @param {Playlist} playlist */
export function openPlaylistSettings(playlist) {
    currentlyEditing = playlist;

    titleArea.setText(playlist.title);
    descArea.setText(playlist.desc);

    setSidebarContent(playlistSettings);
}

titleArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.title = titleArea.value;

    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistHeader.innerText = titleArea.value;    

    currentlyEditing.playlistEntry.firstElementChild.innerText = titleArea.value;
});
descArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.desc = descArea.value;
    
    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistDesc.innerText = descArea.value;
});
deleteBtn.addEventListener("click", () => {
    currentlyEditing.delete();
    setSidebarOpen(false);
})