import { setSidebarContent, setSidebarOpen } from "../view/sidebar.js";
import { Playlist, data } from "../account/userdata.js";
import { playlistHeader, playlistDesc, setViewPlaylist } from "../view/elems.js";
import { genID } from "../account/account.js";
import { initDeleteBtn } from "../view/fx.js";

document.getElementById("new-playlist").addEventListener("click", () => {
    const playlist = new Playlist(genID(14), { title: "new playlist" });
    playlist.playlistEntry.scrollIntoView();
    setViewPlaylist(playlist);
})

const playlistSettings = document.getElementById("playlist-settings");

const titleArea = document.getElementById("playlist-settings__title");
const descArea = document.getElementById("playlist-settings__desc");
descArea.allowNewline = true;

const deleteBtn = document.getElementById("playlist-settings__delete");
const deleteErr = document.getElementById("playlist-settings__delete__error");

/** @type {Playlist} */
let currentlyEditing;

/** @param {Playlist} playlist */
export function openPlaylistSettings(playlist) {
    currentlyEditing = playlist;

    titleArea.setText(playlist.title);
    descArea.setText(playlist.desc.replaceAll("<br>", "\n"));

    deleteBtn.reset();
    
    setSidebarContent(playlistSettings);
}

titleArea.addEventListener("input", () => {
    currentlyEditing.setSyncStatus("edited");

    currentlyEditing.title = titleArea.value;

    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistHeader.textContent = titleArea.value;    

    currentlyEditing.playlistEntry.firstElementChild.textContent = titleArea.value;
    currentlyEditing.checkboxDiv.lastElementChild.textContent = titleArea.value;
});
descArea.addEventListener("input", () => {
    currentlyEditing.setSyncStatus("edited");

    currentlyEditing.desc = descArea.value.replaceAll("\n", "<br>");
    console.log(descArea.value.replaceAll("\n", "<br>"));
    
    if (data.curr.viewPlaylist === currentlyEditing) 
        playlistDesc.innerHTML = currentlyEditing.desc;
});


initDeleteBtn(deleteBtn, deleteErr, () => {
    currentlyEditing.delete();
    setSidebarOpen(false);
});