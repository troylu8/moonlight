import * as songSettings from "./songSettings.js";
import { togglePlay } from "./play.js";
import { data, Playlist, Song } from "./userdata.js";
import { openPlaylistSettings } from "./playlistSettings.js";

const OPTIONS_SVG = 
   `<svg fill="var(--primary-color)" width="20px" height="20px" viewBox="0 0 32 32" >
        <path d="M28.106 19.944h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.788-0.275-3.2-1.762-3.319-3.506-0.137-1.95 0.975-3.6 2.787-4.137 0.238-0.069 0.488-0.119 0.731-0.181h0.85c0.056 0.019 0.106 0.050 0.169 0.056 1.65 0.269 2.906 1.456 3.262 3.081 0.025 0.125 0.063 0.25 0.094 0.375v0.85c-0.019 0.056-0.050 0.113-0.056 0.169-0.262 1.625-1.419 2.863-3.025 3.238-0.156 0.038-0.3 0.081-0.444 0.119zM4.081 12.056l0.85 0c0.069 0.019 0.131 0.050 0.2 0.056 1.8 0.281 3.206 1.775 3.319 3.537 0.125 1.944-1 3.588-2.819 4.119-0.231 0.069-0.469 0.119-0.7 0.175h-0.85c-0.056-0.019-0.106-0.050-0.162-0.063-1.625-0.3-2.688-1.244-3.194-2.819-0.069-0.206-0.106-0.425-0.162-0.637v-0.85c0.019-0.056 0.050-0.113 0.056-0.169 0.269-1.631 1.419-2.863 3.025-3.238 0.15-0.037 0.294-0.075 0.437-0.113zM15.669 12.056h0.85c0.069 0.019 0.131 0.050 0.2 0.063 1.794 0.281 3.238 1.831 3.313 3.581 0.087 1.969-1.1 3.637-2.931 4.106-0.194 0.050-0.387 0.094-0.581 0.137h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.794-0.275-3.238-1.831-3.319-3.581-0.094-1.969 1.1-3.637 2.931-4.106 0.2-0.050 0.394-0.094 0.588-0.137z"></path>
    </svg>`;

export function createSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const className = song.id.startsWith("yt#") ? song.id.substring(3) : song.id;

    const songEntry = createElement("div", null, "song " + className);
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <div class="song__duration"> ${getTimeDisplay(song.duration)} </div>
        </div>`
    
    const song__title = createElement("span", null, "song__title song__title:" + song.id, song.title);
    songEntry.firstChild.appendChild(song__title);

    const song__artist = createElement("span", null, "song__artist song__artist:" + song.id, song.artist);
    songEntry.firstChild.appendChild(song__artist);

    const song__options = createElement("button", null, "song__options svg-hover");
    song__options.innerHTML = OPTIONS_SVG;
    songEntry.lastChild.appendChild(song__options);

    const song__play = createElement("div", null, "song__play");
    song__play.innerHTML = 
       `<svg stroke="var(--primary-color)" viewBox="0 0 24 24">
            <path fill="none" stroke-width="3" stroke-linejoin="round" d="M16.6582,9.28638c1.4398.89982,2.1596,1.34972,2.4065,1.92582.2156.503.2156,1.0725,0,1.5756-.2469.576-.9667,1.0259-2.4065,1.9258L9.896,18.94c-1.59795.9987-2.39693,1.4981-3.05627,1.445-.57472-.0462-1.10155-.3381-1.44533-.801C5,19.053,5,18.1108,5,16.2264v-8.45283c0-1.88438,0-2.82656.3944-3.35759.34378-.46288.87061-.75487,1.44533-.80108.65934-.053,1.45832.44636,3.05627,1.44508l6.7622,4.2264Z" transform="translate(1.525263 0.000046)" />
        </svg>`

    song__play.addEventListener("click", () => {

        togglePlay(song);

        if (data.curr.viewPlaylist !== data.curr.listenPlaylist) 
            data.updateListenPlaylist();
        
        data.curr.listenPlaylist.cycle.updateCurrIndex();
    });


    songEntry.firstChild.insertBefore(song__play, song__title);

    song__options.addEventListener("click", () => 
        songSettings.openSongSettings(song, song__title, song__artist)
    )

    playlist.groupElem.appendChild(songEntry);

    song.songEntries.add(songEntry);
    return [songEntry, song__title, song__artist];
}

/** @param {Playlist} playlist  */
export function deleteSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const className = song.id.startsWith("yt#") ? song.id.substring(3) : song.id;

    const entry = playlist.groupElem.querySelector("." + className);
    entry.remove();
    song.songEntries.delete(entry);
}

const mainDiv = document.getElementById("main-div");
const playlistsNav = document.getElementById("playlists__nav");
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


/** PLAYLIST ENTRY IN LEFT NAV 
 * @param {Playlist} playlist
 */
export function createPlaylistEntries(playlist) {
    
    const playlistElem = createElement("div", "li:" + playlist.id, "playlist");
    playlistElem.innerHTML = `<div class="playlist__title"> ${playlist.title} </div>`;
    playlistElem.addEventListener("click", (e) => {
        setViewPlaylist(playlist)
    });
    playlist.playlistEntry = playlistElem;

    const playlist__options = createElement("button", null, "playlist__options");
    playlist__options.innerHTML = OPTIONS_SVG;
    playlist__options.addEventListener("click", (e) => {
        openPlaylistSettings(playlist);
        e.stopPropagation();
    })

    playlistElem.appendChild(playlist__options);

    playlistsNav.appendChild(playlistElem);
}

/** 
 * PLAYLIST GROUP IN MAIN DIV
 * @param {Playlist} playlist
 */
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
export const playlistHeader = document.getElementById("playlist-header");
export const playlistDesc = document.getElementById("playlist-desc");

/** 
 * @param {Playlist} playlist
 * @param {boolean} setAsListenPlaylist
 */
export function setViewPlaylist(playlist, setAsListenPlaylist) {

    if (playlist === data.curr.viewPlaylist) return;

    data.curr.viewPlaylist = playlist;

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";

    if (!playlist) {
        playlistHeader.innerText = "-";
        playlistDesc.innerText = "-";
    } 
    else {
        if (!playlist.groupElem) 
            playlist.groupElem = createPlaylistGroup(playlist);

        playlistHeader.innerText = playlist.title;
        playlistDesc.innerText = playlist.desc;
        songSettings.updateSongEntries();

        activePlaylistGroup = playlist.groupElem;
        activePlaylistGroup.style.display = "flex";

        if (songSettings.currentlyEditing) 
            songSettings.setLiveElements(activePlaylistGroup);
    }

    if (setAsListenPlaylist) data.updateListenPlaylist();
}

/**  @returns {HTMLElement} */
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