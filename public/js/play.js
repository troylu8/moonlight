import { addSliderDragEvent } from "./sliders.js";

var path = document.location.pathname;
var dirname = path.substring(path.indexOf('/')+1, path.lastIndexOf('/'));

const audio = new Audio();
let currentSongPath = dirname + "../resources/songs/short.mp3";


function togglePlay(filename) {
    let path;
    if (!audio.paused) {
        if (filename === undefined) return audio.pause();
        path = "../resources/songs/" + filename;
        if (path === currentSongPath) return audio.pause();
    }

    const toBePlayed = path ?? currentSongPath;
    console.log("now playing " + toBePlayed);

    // setting a new audio.src will reset seek to beginning
    if (toBePlayed != audio.src) {
        audio.src = toBePlayed;
        currentSongPath = audio.src;
    }
    
    audio.play();
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

function getTimeDisplay(totalSeconds) {
    const minutes = ("" + Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = ("" + Math.floor(totalSeconds % 60)).padStart(2, "0");
    return minutes + ":" + seconds;
}

audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration * 5);
    seekTotal.innerText = getTimeDisplay(audio.duration);

    console.log("new max", seek.max);
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