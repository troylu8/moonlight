import * as songSettings from "./songSettings.js"
import * as play from "./play.js"
import { data } from "./userdata.js"

export const playlistGroupElems = new Map();

export function createSongEntry(song, playlistGroupElem) {

    const songEntry = createElement("div", "song");
    songEntry.innerHTML = 
       `<div class="song__left"></div>

        <div class="song__right">
            <div class="song__duration"> ${getTimeDisplay(song.duration)} </div>
        </div>`
    
    const song__title = createElement("span", "song__title-" + song.id);
    song__title.innerText = song.title;
    songEntry.firstChild.appendChild(song__title);

    const song__artist = createElement("span", "song__artist-" + song.id);
    song__artist.innerText = song.artist;
    songEntry.firstChild.appendChild(song__artist);    

    const song__options = createElement("button", "song__options");
    song__options.innerText = "...";
    songEntry.lastChild.appendChild(song__options);

    const song__play = createElement("button", "song__play");    
    song__play.innerText = "p";
    songEntry.firstChild.insertBefore(song__play, song__title);

    song__play.addEventListener("click", () => play.togglePlay(song));
    song__options.addEventListener("click", () => 
        songSettings.openSongSettings(song, song__title, song__artist)
    )

    playlistGroupElem.appendChild(songEntry);

    return [songEntry, song__title, song__artist];
}

const mainDiv = document.getElementById("main-div");
const playlistsNav = document.getElementById("playlists-nav");

/** adds entry to playlist nav, and creates playlist__group */
export function createPlaylistElems(playlistID, playlistName) {
    const playlist__group = createElement("nav", "playlist__group");
    playlist__group.id = "group " + playlistID;
    mainDiv.appendChild(playlist__group);

    const playlist = createElement("div", "playlist");
    playlist.id = "li " + playlistID;
    playlist.addEventListener("click", () => setActivePlaylist(playlistID));
    playlist.innerHTML = `<div class="playlist__title"> ${playlistName} </div>`;
    
    const playlist__options = createElement("button", "playlist__options");
    playlist__options.innerText = "...";
    // add event listener
    playlist.appendChild(playlist__options);

    playlistsNav.appendChild(playlist);
}

let activePlaylistGroup;
const playlistHeader = document.getElementById("playlist-header");

export function setActivePlaylist(playlistID, init) {
    if (data.currentPlaylistID === playlistID && !init) return;

    data.currentPlaylistID = playlistID;
    playlistHeader.innerText = data.playlistNames[playlistID];
    songSettings.updateSongEntries();

    if (activePlaylistGroup) activePlaylistGroup.style.display = "none";
    activePlaylistGroup = playlistGroupElems.get(playlistID);
    activePlaylistGroup.style.display = "flex";
}

function createElement(tagName, ...classes) {
    const elem = document.createElement(tagName);
    elem.classList.add(...classes);
    return elem;
}


export function getTimeDisplay(totalSeconds) {
    const minutes = ("" + Math.floor(totalSeconds / 60));
    const seconds = ("" + Math.floor(totalSeconds % 60)).padStart(2, "0");
    return minutes + ":" + seconds;
}