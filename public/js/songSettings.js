import * as sidebar from "./sidebar.js";
import { titleElem as playingTitleElem, artistElem as playingArtistElem, setSong } from "./play.js";
import { data, removeFromPlaylist } from "./userdata.js";


export const songSettings = document.getElementById("song-settings");

const filename = document.getElementById("song-settings__filename");
const size = document.getElementById("song-settings__size");
const titleInput = document.getElementById("song-settings__title");
const artistInput = document.getElementById("song-settings__artist");
const playlistCheckboxes = document.getElementById("song-settings__playlists");
const deleteBtn = document.getElementById("song-settings__delete");

export let currentlyEditing;
let allEntriesUpdated = true; 

export function openSongSettings(song, song__title, song__artist) {

    currentlyEditing = song;

    filename.innerText = song.filename;
    size.innerText = (song.size / (1024 * 1000)).toFixed(2) + " MB";
    titleInput.value = song.title;
    artistInput.value = song.artist;

    const notchecked = [];

    for (const checkboxDiv of playlistCheckboxes.childNodes) 
        checkboxDiv.remove();
    
    for (const pid of Object.keys(data.playlists)) {
        const checkboxDiv = data.playlists[pid].checkboxDiv;
        checkboxDiv.firstChild.checked = currentlyEditing.playlistIDs.has( Number(pid) );

        if (checkboxDiv.firstChild.checked) 
            playlistCheckboxes.appendChild(checkboxDiv);
        else 
            notchecked.push(checkboxDiv);
        
    }
    for (const checkboxDiv of notchecked) 
        playlistCheckboxes.appendChild(checkboxDiv);
    

    // using oninput instead of addEventListener to override past event handlers
    titleInput.oninput = () => {
        allEntriesUpdated = false;
    
        currentlyEditing.title = titleInput.value;
    
        if (data.currentlyPlaying === currentlyEditing) 
            playingTitleElem.innerText = titleInput.value;
        song__title.innerText = titleInput.value;
    }
    artistInput.oninput = () => {
        allEntriesUpdated = false;
    
        currentlyEditing.artist = artistInput.value;
    
        if (data.currentlyPlaying === currentlyEditing) 
            playingArtistElem.innerText = artistInput.value;
        song__artist.innerText = artistInput.value;
    }

    sidebar.setSidebarContent(songSettings);
}

deleteBtn.addEventListener("click", () => {
    for (const pid of currentlyEditing.playlistIDs) {
        removeFromPlaylist(currentlyEditing, data.playlists[pid]);
    }
    data.songs[currentlyEditing.id] = undefined;

    fetch("http://localhost:5000/files/" + currentlyEditing.filename, {method: "DELETE"});

    if (data.currentlyPlaying === currentlyEditing) setSong("none");
    currentlyEditing = null;

    sidebar.setSidebarOpen(false);
})

const playlistsNav = document.getElementById("playlists-nav");

/** updates all song entries to match currentlyEditing's title and artist */
export function updateSongEntries() {
    if (allEntriesUpdated) return;

    for (const song__title of playlistsNav.querySelectorAll(".song__title:" + currentlyEditing.id)) {
        song__title.innerText = currentlyEditing.title;
    }
    for (const song__artist of playlistsNav.querySelectorAll(".song__artist:" + currentlyEditing.id)) {
        song__artist.innerText = currentlyEditing.artist;
    }
    console.log("all entries updated");

    allEntriesUpdated = true;
}