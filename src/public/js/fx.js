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

for (const errorElem of document.getElementsByClassName("error-msg")) {
    errorElem.showError = (text) => {
        // blink effect if we get the error repeatedly 
        if (errorElem.innerText !== "") {
            errorElem.style.opacity = "0";
            setTimeout(() => errorElem.style.opacity = "1", 50);        
        }
        errorElem.innerText = text;
    }
}


const tx = document.getElementsByClassName("auto-height");

for (let i = 0; i < tx.length; i++) {
    
  tx[i].resize = () => {
  	console.log("resizing with text", tx[i].value);
    tx[i].style.height = '1px';
    tx[i].style.height = (tx[i].scrollHeight) + "px";
    console.log(tx[i].style.height);
  };
  tx[i].addEventListener("input", () => {
    tx[i].value = tx[i].value.replaceAll("\n", "");
    tx[i].resize();
  } , false);
  tx[i].setText = (text) => {
  	tx[i].value = text;
    setTimeout(tx[i].resize, 0);
  }
  
  let wasEmpty = tx[i].value === "";
  if (wasEmpty) tx[i].value = "a"; // dummy character
  setTimeout(() => {
    tx[i].resize();
    if (wasEmpty) tx[i].value = "";
  }, 0);
  
  tx[i].addEventListener("keydown", (e) => {
    if (e.key === "Enter") e.preventDefault();
  })
}
console.log("AAAAAAAAAA");