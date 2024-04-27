import * as sidebar from "../view/sidebar.js";
import { titleElem as playingTitleElem, artistElem as playingArtistElem } from "../play.js";
import { data, Song } from "../account/userdata.js";
import { initDeleteBtn } from "../view/fx.js";
import { getSizeDisplay } from "../view/elems.js";


export const songSettings = document.getElementById("song-settings");

const filename = document.getElementById("song-settings__filename");
const size = document.getElementById("song-settings__size");
const titleArea = document.getElementById("song-settings__title");
const artistArea = document.getElementById("song-settings__artist");
const playlistCheckboxes = document.getElementById("song-settings__playlists");
const deleteBtn = document.getElementById("song-settings__delete");
const deleteErr = document.getElementById("song-settings__delete__error");

/** @type {Song} */
export let currentlyEditing;
let allEntriesUpdated = true;

let song__titleLive;
let song__artistLive;

export function clearCurrentlyEditing() { currentlyEditing = null; }

/** @param {HTMLElement} playlistGroup */
export function setLiveElements(playlistGroup) {
    song__titleLive = playlistGroup.querySelector(".song__title\\\:" + currentlyEditing.id);
    song__artistLive = playlistGroup.querySelector(".song__artist\\\:" + currentlyEditing.id);
    console.log("set live elements");
}

export function openSongSettings(song, song__title, song__artist) {
    updateSongEntries(); // update old song entries before we start editing a new song

    currentlyEditing = song;

    song__titleLive = song__title;
    song__artistLive = song__artist;

    filename.textContent = song.filename;
    size.textContent = getSizeDisplay(song.size);
    titleArea.setText(song.title);
    artistArea.setText(song.artist);

    const notchecked = [];

    for (const checkboxDiv of playlistCheckboxes.childNodes) 
        checkboxDiv.remove();
    
    for (const playlist of data.playlists.values()) {
        const hasCurrentlyEditing = currentlyEditing.playlists.has(playlist);
        playlist.checkboxDiv.firstChild.checked = hasCurrentlyEditing;

        if (hasCurrentlyEditing)    playlistCheckboxes.appendChild(playlist.checkboxDiv);
        else                        notchecked.push(playlist.checkboxDiv);
        
    }
    for (const checkboxDiv of notchecked) 
        playlistCheckboxes.appendChild(checkboxDiv);

    deleteBtn.reset();

    sidebar.setSidebarContent(songSettings);
}

titleArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";

    allEntriesUpdated = false;

    currentlyEditing.title = titleArea.value;

    if (data.curr.song === currentlyEditing) 
        playingTitleElem.textContent = titleArea.value;
    
    song__titleLive.textContent = titleArea.value;
});
artistArea.addEventListener("input", () => {
    currentlyEditing.syncStatus = "edited";
    
    allEntriesUpdated = false;

    currentlyEditing.artist = artistArea.value;

    if (data.curr.song === currentlyEditing) 
        playingArtistElem.textContent = artistArea.value;
    song__artistLive.textContent = artistArea.value;
});


initDeleteBtn(deleteBtn, deleteErr, () => {
    currentlyEditing.delete();
    clearCurrentlyEditing();
    sidebar.setSidebarOpen(false);
});

/** updates all song entries to match currentlyEditing's title and artist */
export function updateSongEntries() {
    if (allEntriesUpdated || !currentlyEditing) return;

    for (const songElem of currentlyEditing.songEntries) {
        setTitleArtistText(songElem, currentlyEditing.title, currentlyEditing.artist);
    }

    if (data.curr.song === currentlyEditing) {
        playingTitleElem.textContent = titleArea.value;
        playingArtistElem.textContent = artistArea.value;
    }   

    console.log("all entries updated");

    allEntriesUpdated = true;
}

function setTitleArtistText(songElem, title, artist) {
    songElem.firstElementChild.lastElementChild.previousElementSibling.textContent = title;
    songElem.firstElementChild.lastElementChild.textContent = artist;
}