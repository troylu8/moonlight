import * as sidebar from "./sidebar.js"
import * as play from "./play.js"

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