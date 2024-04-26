import * as songSettings from "../settings/songSettings.js";
import { togglePlay } from "../play.js";
import { data, Playlist, Song } from "../account/userdata.js";
import { openPlaylistSettings } from "../settings/playlistSettings.js";
import { removeTooltip, setToolTip } from "./fx.js";
import { uid } from "../account/account.js";
import { uploadSongFile } from "../account/files.js";
const { basename } = require('path');

const OPTIONS_SVG = 
   `<svg fill="var(--primary-color)" width="20px" height="20px" viewBox="0 0 32 32" >
        <path d="M28.106 19.944h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.788-0.275-3.2-1.762-3.319-3.506-0.137-1.95 0.975-3.6 2.787-4.137 0.238-0.069 0.488-0.119 0.731-0.181h0.85c0.056 0.019 0.106 0.050 0.169 0.056 1.65 0.269 2.906 1.456 3.262 3.081 0.025 0.125 0.063 0.25 0.094 0.375v0.85c-0.019 0.056-0.050 0.113-0.056 0.169-0.262 1.625-1.419 2.863-3.025 3.238-0.156 0.038-0.3 0.081-0.444 0.119zM4.081 12.056l0.85 0c0.069 0.019 0.131 0.050 0.2 0.056 1.8 0.281 3.206 1.775 3.319 3.537 0.125 1.944-1 3.588-2.819 4.119-0.231 0.069-0.469 0.119-0.7 0.175h-0.85c-0.056-0.019-0.106-0.050-0.162-0.063-1.625-0.3-2.688-1.244-3.194-2.819-0.069-0.206-0.106-0.425-0.162-0.637v-0.85c0.019-0.056 0.050-0.113 0.056-0.169 0.269-1.631 1.419-2.863 3.025-3.238 0.15-0.037 0.294-0.075 0.437-0.113zM15.669 12.056h0.85c0.069 0.019 0.131 0.050 0.2 0.063 1.794 0.281 3.238 1.831 3.313 3.581 0.087 1.969-1.1 3.637-2.931 4.106-0.194 0.050-0.387 0.094-0.581 0.137h-0.85c-0.069-0.019-0.131-0.050-0.2-0.063-1.794-0.275-3.238-1.831-3.319-3.581-0.094-1.969 1.1-3.637 2.931-4.106 0.2-0.050 0.394-0.094 0.588-0.137z"></path>
    </svg>`;

const PLAY_SVG = 
   `<svg stroke="var(--primary-color)" viewBox="0 0 24 24">
        <path fill="none" stroke-width="3" stroke-linejoin="round" d="M16.6582,9.28638c1.4398.89982,2.1596,1.34972,2.4065,1.92582.2156.503.2156,1.0725,0,1.5756-.2469.576-.9667,1.0259-2.4065,1.9258L9.896,18.94c-1.59795.9987-2.39693,1.4981-3.05627,1.445-.57472-.0462-1.10155-.3381-1.44533-.801C5,19.053,5,18.1108,5,16.2264v-8.45283c0-1.88438,0-2.82656.3944-3.35759.34378-.46288.87061-.75487,1.44533-.80108.65934-.053,1.45832.44636,3.05627,1.44508l6.7622,4.2264Z" transform="translate(1.525263 0.000046)" />
    </svg>`;

const ACTIVE_SVG = 
    `<svg fill="var(--accent-color)" viewBox="0 0 24 24">
         <path d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z"/>
     </svg>`;

const ERROR_SVG = 
   `<svg fill="var(--error-color)" viewBox="0 0 24 24">
        <path d="M12.884 2.532c-.346-.654-1.422-.654-1.768 0l-9 17A.999.999 0 0 0 3 21h18a.998.998 0 0 0 .883-1.467L12.884 2.532zM13 18h-2v-2h2v2zm-2-4V9h2l.001 5H11z"/>
    </svg>`;

const iconMap = new Map([["playable", PLAY_SVG], ["active", ACTIVE_SVG], ["error", ERROR_SVG]]);

/** 
 * @param {HTMLElement} entry 
 * @param {"playable" | "active" | "error"} state
 */
export function setEntryState(entry, state) {
    console.log("AAAAAAA set as", state);

    const iconElem = entry.firstElementChild.firstElementChild;
    iconElem.innerHTML = iconMap.get(state);

    entry.classList.remove("playable", "active", "error");
    entry.classList.add(state);

    if (state === "error")  setToolTip(entry, "[click] resolve missing file", 0);
    else                    removeTooltip(entry);
    console.log("set tooltip to", entry.tooltip);
}
    

/** 
 * @param {Song} song
 * @@param {Playlist} playlist 
 */
export function createSongEntry(song, playlist) {
    if (!playlist.groupElem) return;
    
    const className = song.id.startsWith("yt#") ? song.id.substring(3) : song.id;

    const songEntry = createElement("div", null, "song " + className, playlist.groupElem);
    songEntry.song = song;
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <span class="song__duration"> ${getTimeDisplay(song.duration)} </span>
        </div>`

    const song__title = createElement("span", null, "song__title song__title:" + song.id, songEntry.firstChild, song.title);

    const song__artist = createElement("span", null, "song__artist song__artist:" + song.id, songEntry.firstChild, song.artist);

    const song__options = createElement("div", null, "song__options", songEntry.lastChild);
    song__options.innerHTML = OPTIONS_SVG;
    
    const song__icon = createElement("div", null, "song__icon");
    song__icon.addEventListener("click", () => {
        if (song.state !== "playable") return;

        togglePlay(song);

        if (data.curr.viewPlaylist !== data.curr.listenPlaylist) data.updateListenPlaylist();
        data.curr.listenPlaylist.cycle.updateCurrIndex();
    });
    songEntry.firstChild.insertBefore(song__icon, song__title);

    song__options.addEventListener("click", () => songSettings.openSongSettings(song, song__title, song__artist));
    songEntry.addEventListener("contextmenu", (e) => {
        songSettings.openSongSettings(song, song__title, song__artist);
        e.preventDefault();
    });

    let menuOn = false;
    
    songEntry.addEventListener("click", () => {
        if (song.state !== "error" || menuOn) return;
        menuOn = true;
        
        songEntry.tooltip.innerHTML = "";

        const resolve__nav = createElement("nav", null, "resolve", songEntry.tooltip);
        
        const resolve__sync = createElement("button", null, "resolve__sync menu-option", resolve__nav, "get from server");
        const resolve__link = createElement("button", null, "resolve__link menu-option", resolve__nav, "choose file");
        const resolve__link__input = createElement("input", null, "resolve__link", resolve__nav);
        resolve__link__input.type = "file";
        resolve__link__input.accept = "audio/*";

        resolve__link.addEventListener("click", () => resolve__link__input.click());
        resolve__link__input.addEventListener("change", async () => {
            uploadSongFile(uid, resolve__link__input.value);
            song.filename = basename(resolve__link__input.value);
            song.setState("playable");
        });
        
    });
    songEntry.addEventListener("mouseenter", () => {
        if (song.state !== "error") return;
        menuOn = false;
        songEntry.tooltip.textContent = "[click] resolve missing file";
    });

    setEntryState(songEntry, song.state);

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
    const option = createElement("div", null, "song-settings__playlists__option", playlistCheckboxes);
    playlist.checkboxDiv = option;

    const checkbox = createElement("input", "song-settings__playlist:" + playlist.id, option);
    checkbox.type = "checkbox";
    checkbox.playlist = playlist;
    checkbox.addEventListener("change", () => {        
        if (checkbox.checked)
            songSettings.currentlyEditing.addToPlaylist(playlist);
        else
            songSettings.currentlyEditing.removeFromPlaylist(playlist);
    })
    
    const label = createElement("label", null, null, option, playlist.title);
    label.setAttribute("for", "song-settings__playlist:" + playlist.id);
}


/** PLAYLIST ENTRY IN LEFT NAV 
 * @param {Playlist} playlist
 */
export function createPlaylistEntries(playlist) {
    
    const playlistEntry = createElement("div", "li:" + playlist.id, "playlist", playlistsNav);
    playlistEntry.innerHTML = `<div class="playlist__title"> ${playlist.title} </div>`;
    playlistEntry.addEventListener("click", () => setViewPlaylist(playlist));
    playlistEntry.addEventListener("contextmenu", (e) => {
        openPlaylistSettings(playlist);
        e.preventDefault();
    });
    playlist.playlistEntry = playlistEntry;

    const playlist__options = createElement("div", null, "playlist__options", playlistEntry);
    playlist__options.innerHTML = OPTIONS_SVG;
    playlist__options.addEventListener("click", (e) => {
        openPlaylistSettings(playlist);
        e.stopPropagation();
    });
}

/** 
 * PLAYLIST GROUP IN MAIN DIV
 * @param {Playlist} playlist
 */
function createPlaylistGroup(playlist) {
    const playlist__group = createElement("nav", "group:" + playlist.id, "playlist__group hiding-scroll", mainDiv);
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

    if (data.curr.viewPlaylist) data.curr.viewPlaylist.playlistEntry.classList.remove("view-playlist");

    data.curr.viewPlaylist = playlist;

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";

    if (!playlist) {
        playlistHeader.textContent = "-";
        playlistDesc.innerHTML = "-";
        return;
    } 

    if (!playlist.groupElem) 
        playlist.groupElem = createPlaylistGroup(playlist);

    playlistHeader.textContent = playlist.title;
    playlistDesc.innerHTML = playlist.desc;
    songSettings.updateSongEntries();

    activePlaylistGroup = playlist.groupElem;
    activePlaylistGroup.style.display = "flex";

    if (songSettings.currentlyEditing) 
        songSettings.setLiveElements(activePlaylistGroup);

    playlist.playlistEntry.classList.add("view-playlist");

    if (setAsListenPlaylist) data.updateListenPlaylist();
    
}

/**  @returns {HTMLElement} */
function createElement(tag, id, classes, parent, text) {
    const elem = document.createElement(tag);
    if (id) elem.id = id;
    if (classes) elem.classList = classes;
    if (text) elem.textContent = text;
    if (parent) parent.appendChild(elem);
    return elem;
}


export function getTimeDisplay(totalSeconds) {
    const minutes = ("" + Math.floor(totalSeconds / 60));
    const seconds = ("" + Math.floor(totalSeconds % 60)).padStart(2, "0");
    return minutes + ":" + seconds;
}