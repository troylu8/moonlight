import { addSliderDragEvent } from "./sliders.js";

var path = document.location.pathname;
var dirname = path.substring(path.indexOf('/')+1, path.lastIndexOf('/'));

const audio = new Audio();
let currentSong = dirname + "../resources/songs/short.mp3";


function togglePlay(song) {
    if ((song === undefined ||  song === currentSong) && !audio.paused) {
        audio.pause();
        return;
    }

    const toBePlayed = song ?? currentSong;
    console.log("now playing " + toBePlayed);

    // setting a new audio.src will reset seek to beginning
    if (toBePlayed != audio.src) {
        audio.src = toBePlayed;
        currentSong = audio.src;
    }
    
    audio.play();
}

document.getElementById("play").onclick = () => togglePlay();


document.getElementById("prev").onclick = () => {
    fetch("http://127.0.0.1:5000/newfile/somesuffix", 
          {method:"POST"}).then(res => console.log("woaw"));
};

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
    seek.max = Math.floor(audio.duration * 5);
    seekTotal.innerText = getTimeDisplay(audio.duration);

    console.log("new max", seek.max);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    console.log("timeupdate called");
    seek.value = audio.currentTime * 5;
    seek.oninput(); // update slider color
    seekPassed.innerText = getTimeDisplay(audio.currentTime);
})

addSliderDragEvent(seek, () => {}); // init drag events to keep track of seek.dragging

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value / 5; });