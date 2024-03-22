import * as sidebar from "./sidebar.js";
import { currentlyPlaying, titleElem as playingTitleElem, artistElem as playingArtistElem } from "./play.js";



export const songSettings = document.getElementById("song-settings");

const filename = document.getElementById("song-settings__filename");
const size = document.getElementById("song-settings__size");
const titleInput = document.getElementById("song-settings__title");
const artistInput = document.getElementById("song-settings__artist");

let currentlyEditing;
let allEntriesUpdated = true; 

export function openSongSettings(song, song__title, song__artist) {
    if (song === currentlyEditing) return sidebar.setSidebarOpen(false);

    currentlyEditing = song;

    filename.innerText = song.filename;
    size.innerText = (song.size / (1024 * 1000)).toFixed(2) + " MB";
    titleInput.value = song.title;
    artistInput.value = song.artist;

    // using oninput instead of addEventListener to override past event handlers
    titleInput.oninput = () => {
        allEntriesUpdated = false;
    
        currentlyEditing.title = titleInput.value;
    
        if (currentlyPlaying === currentlyEditing) 
            playingTitleElem.innerText = titleInput.value;
        song__title.innerText = titleInput.value;
    }
    artistInput.oninput = () => {
        allEntriesUpdated = false;
    
        currentlyEditing.artist = artistInput.value;
    
        if (currentlyPlaying === currentlyEditing) 
            playingArtistElem.innerText = artistInput.value;
        song__artist.innerText = artistInput.value;
    }

    sidebar.setSidebarContent(songSettings);
}

const playlistsNav = document.getElementById("playlists-nav");

/** updates all song entries to match currentlyEditing's title and artist */
export function updateSongEntries() {
    if (allEntriesUpdated) return;

    for (const song__title of playlistsNav.querySelectorAll(".song__title-" + currentlyEditing.id)) {
        song__title.innerText = currentlyEditing.title;
    }
    for (const song__artist of playlistsNav.querySelectorAll(".song__artist-" + currentlyEditing.id)) {
        song__artist.innerText = currentlyEditing.artist;
    }
    console.log("all entries updated");

    allEntriesUpdated = true;
}