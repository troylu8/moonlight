import * as songSettings from "./songSettings.js";
import { togglePlay } from "./play.js";
import { data, Playlist } from "./userdata.js";


export function createSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const songEntry = createElement("div", null, "song " + song.id);
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <div class="song__duration"> ${getTimeDisplay(song.duration)} </div>
        </div>`
    
    const song__title = createElement("span", null, "song__title song__title:" + song.id, song.title);
    songEntry.firstChild.appendChild(song__title);

    const song__artist = createElement("span", null, "song__artist song__artist:" + song.id, song.artist);
    songEntry.firstChild.appendChild(song__artist);

    const song__options = createElement("button", null, "song__options", "...");
    songEntry.lastChild.appendChild(song__options);

    const song__play = createElement("button", null, "song__play", "p");    
    songEntry.firstChild.insertBefore(song__play, song__title);

    song__play.addEventListener("click", () => {

        togglePlay(song)

        if (data.curr.viewPlaylist !== data.curr.listenPlaylist) 
            data.updateListenPlaylist();
    });
    song__options.addEventListener("click", () => 
        songSettings.openSongSettings(song, song__title, song__artist)
    )

    playlist.groupElem.appendChild(songEntry);

    song.songEntries.add(songEntry);
    return [songEntry, song__title, song__artist];
}

export function deleteSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const entry = playlist.groupElem.querySelector("." + song.id)
    entry.remove();
    song.songEntries.delete(entry);
}

const mainDiv = document.getElementById("main-div");
const playlistsNav = document.getElementById("playlists-nav");
const playlistCheckboxes = document.getElementById("song-settings__playlists");

/** PLAYLIST OPTION IN SONG SETTINGS */
export function createPlaylistCheckboxDivs(playlist) {
    const option = createElement("div", null, "song-settings__playlists__option");
    playlist.checkboxDiv = option;

    const checkbox = createElement("input", "song-settings__playlist:" + playlist.id);
    checkbox.type = "checkbox";
    checkbox.playlist = playlist;
    checkbox.addEventListener("change", () => {
        if (checkbox.checked)
            songSettings.currentlyEditing.addToPlaylist(playlist);
        else
            songSettings.currentlyEditing.removeFromPlaylist(playlist);
    })
    option.appendChild(checkbox);
    
    const label = createElement("label", null, null, playlist.title);
    label.setAttribute("for", "song-settings__playlist:" + playlist.id);
    option.appendChild(label);

    playlistCheckboxes.appendChild(option);
}

/** PLAYLIST ENTRY IN LEFT NAV  */
export function createPlaylistEntries(playlist) {
    
    const playlistElem = createElement("div", "li:" + playlist.id, "playlist");
    playlistElem.innerHTML = `<div class="playlist__title"> ${playlist.title} </div>`;
    playlistElem.addEventListener("click", () => setViewPlaylist(playlist));
    
    const playlist__options = createElement("button", null, "playlist__options", "...");
    playlistElem.appendChild(playlist__options);

    playlistsNav.appendChild(playlistElem);
}

/** PLAYLIST GROUP IN MAIN DIV */
/** @param {Playlist} playlist */
function createPlaylistGroup(playlist) {
    const playlist__group = createElement("nav", "group:" + playlist.id, "playlist__group");
    mainDiv.appendChild(playlist__group);
    playlist.groupElem = playlist__group;
    playlist__group.playlist = playlist;

    for (const song of playlist.songs) {
        createSongEntry(song, playlist);
    }

    return playlist__group;
}

/** @type {HTMLElement} */
let activePlaylistGroup;
const playlistHeader = document.getElementById("playlist-header");

/** @param {Playlist} playlist */
export function setViewPlaylist(playlist) {

    if (!playlist.groupElem) 
        playlist.groupElem = createPlaylistGroup(playlist);
    
    if (playlist === data.curr.viewPlaylist) return;

    data.curr.viewPlaylist = playlist;

    playlistHeader.innerText = playlist.title;
    songSettings.updateSongEntries();

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";
    activePlaylistGroup = playlist.groupElem;
    activePlaylistGroup.style.display = "flex";

    if (songSettings.currentlyEditing) 
        songSettings.setLiveElements(activePlaylistGroup);
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