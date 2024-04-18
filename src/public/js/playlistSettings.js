import { setSidebarContent, setSidebarOpen } from "./sidebar.js";
import { Playlist, data } from "./userdata.js";
import { playlistHeader, playlistDesc } from "./songElements.js";
import genID from "./id.js";
import { shiftDown } from "./songSettings.js";

document.getElementById("new-playlist").addEventListener("click", () => {
    new Playlist(genID(14), { title: "new playlist" });
})

const playlistSettings = document.getElementById("playlist-settings");

const titleArea = document.getElementById("playlist-settings__title");
const descArea = document.getElementById("playlist-settings__desc");
descArea.allowNewline = true;

const deleteBtn = document.getElementById("playlist-settings__delete");

/** @type {Playlist} */
let currentlyEditing;

/** @param {Playlist} playlist */
export function openPlaylistSettings(playlist) {
    currentlyEditing = playlist;

    titleArea.setText(playlist.title);
    descArea.setText(playlist.desc.replaceAll("<br>", "\n"));

    deleteBtn.textContent = "delete";
    
    setSidebarContent(playlistSettings);
}

titleArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.title = titleArea.value;

    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistHeader.textContent = titleArea.value;    

    currentlyEditing.playlistEntry.firstElementChild.textContent = titleArea.value;
    currentlyEditing.checkboxDiv.lastElementChild.textContent = titleArea.value;
});
descArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    currentlyEditing.desc = descArea.value.replaceAll("\n", "<br>");
    console.log(descArea.value.replaceAll("\n", "<br>"));
    
    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistDesc.innerHTML = currentlyEditing.desc;
});

const deleteError = document.getElementById("playlist-settings__delete__error");

deleteBtn.addEventListener("click", () => {
    if (shiftDown) {
        currentlyEditing.delete();
        setSidebarOpen(false);
    }
    else {
        deleteBtn.textContent = "this cannot be undone";
        deleteError.showError("[shift + click] to delete");
    }
})