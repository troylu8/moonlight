import * as songSettings from "./songSettings.js"
import * as play from "./play.js"
import * as userdata from "./userdata.js"

export const playlistGroupElems = new Map();

export function createSongEntry(song, playlistID) {
    const playlistGroupElem = playlistGroupElems.get(playlistID);
    
    const songEntry = createElement("div", null, "song " + song.id);
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <div class="song__duration"> ${getTimeDisplay(song.duration)} </div>
        </div>`
    
    const song__title = createElement("span", null, "song__title-" + song.id, song.title);
    songEntry.firstChild.appendChild(song__title);

    const song__artist = createElement("span", null, "song__artist-" + song.id, song.artist);
    songEntry.firstChild.appendChild(song__artist);

    const song__options = createElement("button", null, "song__options", "...");
    songEntry.lastChild.appendChild(song__options);

    const song__play = createElement("button", null, "song__play", "p");    
    songEntry.firstChild.insertBefore(song__play, song__title);

    song__play.addEventListener("click", () => play.togglePlay(song));
    song__options.addEventListener("click", () => 
        songSettings.openSongSettings(song, song__title, song__artist)
    )

    playlistGroupElem.appendChild(songEntry);

    return [songEntry, song__title, song__artist];
}

export function deleteSongEntry(song, playlistID) {
    const playlistGroupElem = playlistGroupElems.get(playlistID);
    playlistGroupElem.querySelector("." + song.id).remove();
}

const mainDiv = document.getElementById("main-div");
const playlistsNav = document.getElementById("playlists-nav");
const playlistCheckboxes = document.getElementById("song-settings__playlists");

/** adds entry to playlist nav, create playlist__group, create song settings playlist option */
export function createPlaylistElems(playlistID, playlistName) {

    // PLAYLIST ENTRY IN LEFT NAV ===
    const playlist = createElement("div", "li " + playlistID, "playlist");
    playlist.innerHTML = `<div class="playlist__title"> ${playlistName} </div>`;
    playlist.addEventListener("click", () => setActivePlaylist(playlistID));
    
    const playlist__options = createElement("button", null, "playlist__options", "...");
    // add event listener
    playlist.appendChild(playlist__options);

    playlistsNav.appendChild(playlist);


    // PLAYLIST GROUP ===
    const playlist__group = createElement("nav", "group " + playlistID, "playlist__group");
    mainDiv.appendChild(playlist__group);


    // PLAYLIST OPTION IN SONG SETTINGS ===
    const option = createElement("div", null, "song-settings__playlists__option");

    const checkbox = createElement("input", "song-settings__playlist-" + playlistID);
    checkbox.type = "checkbox";
    checkbox.playlistID = playlistID;
    checkbox.addEventListener("change", () => {
        if (checkbox.checked)
            userdata.addToPlaylist(songSettings.currentlyEditing, playlistID);
        else
            userdata.removeFromPlaylist(songSettings.currentlyEditing, playlistID);
    })
    option.appendChild(checkbox);
    
    const label = createElement("label", null, null, playlistName);
    label.setAttribute("for", "song-settings__playlist-" + playlistID);
    option.appendChild(label);

    playlistCheckboxes.appendChild(option);
}

let activePlaylistGroup;
const playlistHeader = document.getElementById("playlist-header");

export function setActivePlaylist(playlistID, init) {
    if (userdata.data.currentPlaylistID === playlistID && !init) return;

    userdata.data.currentPlaylistID = playlistID;
    playlistHeader.innerText = userdata.data.playlistNames[playlistID];
    songSettings.updateSongEntries();

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";
    activePlaylistGroup = playlistGroupElems.get(playlistID);
    activePlaylistGroup.style.display = "flex";
}

function createElement(tag, id, classes, text) {
    const elem = document.createElement(tag);
    if (id) elem.id = id;
    if (classes) elem.classList = classes;
    if (text) elem.innerText = text;
    return elem;
}


export function getTimeDisplay(totalSeconds) {
    const minutes = ("" + Math.floor(totalSeconds / 60));
    const seconds = ("" + Math.floor(totalSeconds % 60)).padStart(2, "0");
    return minutes + ":" + seconds;
}