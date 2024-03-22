import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";

const audio = new Audio();

let currentFilename = "short.mp3";

export function togglePlay(filename) {
    if (audio.src === "" && filename === undefined) return;

    filename = filename ?? currentFilename;
    // if unpaused and same song, pause
    if (!audio.paused && filename === currentFilename) return audio.pause();
    
    //if paused and same song, play
    if (filename === currentFilename) return audio.play();

    // setting a new audio.src will reset seek to beginning
    audio.src = "../resources/songs/" + encodeURIComponent(filename);
    currentFilename = filename;
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