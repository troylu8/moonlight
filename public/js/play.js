import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay, activePlaylistGroup } from "./songElements.js";
import { data } from "./userdata.js";

const audio = new Audio();


export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** set a new currently playing song, will reset seek to beginning */
export function setSong(song) {
    if (!song) return;
    if (song === "none") {
        audio.src = "";
        data.currentlyPlaying = null;``

        titleElem.innerText = "-";
        artistElem.innerText = "-";
        data.currentSongID = undefined;
        return;
    };

    

    //TODO: WHEN USING ELECTRON, USE ./ INSTEAD OF ../
    audio.src = "../resources/songs/" + encodeURIComponent(song.filename);
    data.currentlyPlaying = song;

    titleElem.innerText = song.title;
    artistElem.innerText = song.artist;
    
    data.currentSongID = song.id;
    console.log("set currentsongid to " + data.currentSongID);

    updatePlaylistCycle();
}

export function togglePlay(song) {
    if (song === undefined || song === data.currentlyPlaying) {
        if (data.currentlyPlaying === null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
    }
    else {
        setSong(song);
        audio.play();
    }   
}

document.getElementById("play").onclick = () => togglePlay();

const volume = document.getElementById("volume__slider");

addSliderDragEvent(volume, () => {
    audio.volume = volume.value / 100;
    console.log(audio.volume);
})


const mute = document.getElementById("mute");
mute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    mute.innerText = audio.muted? "unmute" : "mute";
});


const seek = document.getElementById("seek__slider");
const seekPassed = document.getElementById("seek__passed");
const seekTotal = document.getElementById("seek__total");


audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration * 5);
    seekTotal.innerText = getTimeDisplay(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime * 5;
    seek.updateSliderColors(); 
    seekPassed.innerText = getTimeDisplay(audio.currentTime);
})

addSliderDragEvent(seek, () => {
    seekPassed.innerText = getTimeDisplay(seek.value / 5);
}); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value / 5; });

/** @type {SongNode} currently playing song, use playlist cycle when shuffle is off */
let currentSongNode;

document.getElementById("next").addEventListener("click", () => {
    if (data.playlists[data.currentPlaylistID].songIDs.length <= 1) return;
     
    currentSongNode = currentSongNode.next;
    setSong(currentSongNode.song);
    audio.play();
})


class SongNode {
    constructor(song, prev, next) {
        this.next = next;
        this.prev = prev;
        this.song = song;

        song.songNode = this;
    }
}

function createPlaylistCycle(playlist) {

    const songNodes = Array.from(playlist.songIDs).map(sid => new SongNode(data.songs[sid]));
    
    for (let i = 0; i < songNodes.length; i++) {
        songNodes[i].prev = songNodes[i === 0 ? songNodes.length-1 : i-1 ];
        songNodes[i].next = songNodes[(i+1) % songNodes.length];
    }
    console.log(songNodes);

    return data.currentlyPlaying.songNode;
}
function updatePlaylistCycle() {
    currentSongNode = createPlaylistCycle(data.playlists[data.currentPlaylistID]);
}