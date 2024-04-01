import { audio } from "./play.js";
import { addSliderDragEvent } from "./sliders.js";
import { data } from "./userdata.js";

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


const volumeSlider = document.getElementById("volume-slider");


addSliderDragEvent(volumeSlider, () => {
    audio.volume = volumeSlider.value / 100;
})
volumeSlider.addEventListener("mousedown", () => { audio.muted = false; });
volumeSlider.addEventListener("mouseup", () => {
    if (volumeSlider.value != 0)
        data.settings.volume = audio.volume;
})

const volumeBtn = document.getElementById("volume");
volumeBtn.addEventListener("click", () => {

    audio.muted = !audio.muted;
    
    if (!audio.muted || audio.volume === 0) {
        audio.muted = false;
        audio.volume = data.settings.volume;
        console.log("setting av to ", data.settings.volume);
    }
    else updateVolumeIcon(0);

    
});

const volumeIcons = {
    muted: document.getElementById("volume__muted"),
    low: document.getElementById("volume__low"),
    high: document.getElementById("volume__high")
}

let activeVolumeIcon;

export function updateVolumeIcon(volume) {
    let type;

    if      (volume === 0)    type = "muted";
    else if (volume < 0.5)    type = "low";
    else                      type = "high";

    setVolumeIcon(type);
    
    volumeSlider.value = volume * 100;
    volumeSlider.updateSliderColors();
}

export function setVolumeIcon(type) {
    if (!volumeIcons[type] || activeVolumeIcon === volumeIcons[type]) return;

    if (activeVolumeIcon) activeVolumeIcon.style.display = "none";
    activeVolumeIcon = volumeIcons[type];
    activeVolumeIcon.style.display = "block";
}