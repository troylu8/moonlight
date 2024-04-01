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

    const song__play = createElement("button", null, "song__play");    
    song__play.innerHTML = 
       `<svg width="20px" height="20px" viewBox="0 0 24 24">
            <path fill="none" stroke="var(--color1)" stroke-width="3" stroke-linejoin="round" d="M16.6582,9.28638c1.4398.89982,2.1596,1.34972,2.4065,1.92582.2156.503.2156,1.0725,0,1.5756-.2469.576-.9667,1.0259-2.4065,1.9258L9.896,18.94c-1.59795.9987-2.39693,1.4981-3.05627,1.445-.57472-.0462-1.10155-.3381-1.44533-.801C5,19.053,5,18.1108,5,16.2264v-8.45283c0-1.88438,0-2.82656.3944-3.35759.34378-.46288.87061-.75487,1.44533-.80108.65934-.053,1.45832.44636,3.05627,1.44508l6.7622,4.2264Z" transform="translate(1.525263 0.000046)" />
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
        songSettings.currentlyEditing.edited = true;
        
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
    playlistElem.addEventListener("click", () => {
        setViewPlaylist(playlist)
    });
    playlist.playlistEntry = playlistElem;

    const playlist__options = createElement("button", null, "playlist__options", "...");
    playlist__options.addEventListener("click", (e) => {
        playlist.delete();
        e.stopPropagation();
    })

    playlistElem.appendChild(playlist__options);
    // playlistElem.parentNode.appendChild(playlist__options)

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
const playlistHeader = document.getElementById("playlist-header");

/** @param {Playlist} playlist */
export function setViewPlaylist(playlist) {

    if (playlist === data.curr.viewPlaylist) return;

    data.curr.viewPlaylist = playlist;

    if (playlist === "none") {
        playlistHeader.innerText = "-";
        if (activePlaylistGroup) activePlaylistGroup.style.display = "none";
        return;
    }

    if (!playlist.groupElem) 
        playlist.groupElem = createPlaylistGroup(playlist);

    playlistHeader.innerText = playlist.title;
    songSettings.updateSongEntries();

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";
    activePlaylistGroup = playlist.groupElem;
    activePlaylistGroup.style.display = "flex";

    if (songSettings.currentlyEditing) 
        songSettings.setLiveElements(activePlaylistGroup);
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