import * as sidebar from "./sidebar.js"
import * as play from "./play.js"

export const playlistGroupElems = new Map();

export function createSongElem(song, playlistGroupElem) {

    const songElem = createElement("div", "song", song.id);
    songElem.innerHTML = 
       `<div class="song__left">
            <div class="song__title"> ${song.title} <span class="song__author"> ${song.artist} </span> </div>    
        </div>

        <div class="song__right">
            <div class="song__duration"> ${getTimeDisplay(song.duration)} </div>
        </div>`
    
    const song__play = createElement("button", "song__play");
    song__play.innerText = "p";
    songElem.firstChild.insertBefore(song__play, songElem.firstChild.firstChild);

    const song__options = createElement("button", "song__options");
    song__options.innerText = "...";
    songElem.lastChild.appendChild(song__options);

    song__play.addEventListener("click", () => play.togglePlay(song.filename));
    song__options.addEventListener("click", () => sidebar.openSongOptions(song));

    playlistGroupElem.appendChild(songElem);
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

export function setActivePlaylist(playlistID) {
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