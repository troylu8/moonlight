import { audio } from "./play.js";
import { addSliderDragEvent } from "./sliders.js";

const circle = document.getElementById("play__circle");
const play = document.getElementById("play__play");
const pause = document.getElementById("play__pause");

const rpm = 15;
let spinning = false;

export function toggleSpin() {
    setSpin(!spinning);
}
export function setSpin(spin) {
    if (spin === spinning) return;

    setRPM(spin? rpm : 0);
    
    if (spin) {
        pause.style.display = "block";
        play.style.display = "none";
    } else {
        pause.style.display = "none";
        play.style.display = "block";
    }
    
    spinning = spin;
}

function setRPM(rpm) {
    if (rpm === 0) {
        circle.style.animationPlayState = "paused";
    }
    else {
        circle.style.animationPlayState = "running";
        circle.style.animationDuration = (60 / rpm) + 's';
    }
}


const volume = document.getElementById("volume-slider");

let lastVolume;

addSliderDragEvent(volume, () => {
    audio.volume = volume.value / 100;

    if (audio.volume === 0) 
})
volume.addEventListener("mouseup", () => {
    lastVolume = audio.volume;
})

const volumeBtn = document.getElementById("volume");
volumeBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    volumeBtn.innerText = audio.muted? "unmute" : "mute";
});

const volumeIcons = {
    muted: document.getElementById("volume__muted"),
    low: document.getElementById("volume__low"),
    high: document.getElementById("volume__high")
}

let activeVolumeIcon;
function setVolumeIcon(type) {
    if (!volumeIcons[type] || activeVolumeIcon === volumeIcons[type]) return;

    if (activeVolumeIcon) activeVolumeIcon.style.display = "none";
    activeVolumeIcon = volumeIcons[type];
    activeVolumeIcon.style.display = "block";
}


function volumeToIcon(volume) {
    if (volume === 0)
}