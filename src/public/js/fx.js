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

// ERROR DISPLAYS
for (const errorElem of document.getElementsByClassName("error-msg")) {
    errorElem.showError = (text) => {
        // blink effect if we get the error repeatedly 
        if (errorElem.textContent !== "") {
            errorElem.style.opacity = "0";
            setTimeout(() => errorElem.style.opacity = "1", 50);        
        }
        errorElem.textContent = text;
    }
}

// TEXTAREAS
for (const tArea of document.getElementsByClassName("auto-height")) {
    const resize = () => {
        tArea.style.height = '1px';
        tArea.style.height = (tArea.scrollHeight) + "px";
    };

    // prevent newline characters and resize on input
    tArea.addEventListener("input", () => {
      tArea.value = tArea.value.replaceAll("\n", "");
      resize();
    }, false);
    tArea.addEventListener("keydown", (e) => {
        if (e.key === "Enter") e.preventDefault();
    });

    tArea.setText = (text) => {
        tArea.value = text;
        setTimeout(resize, 0);
    }
    
    // initial resize
    let wasEmpty = tArea.value === "";
    if (wasEmpty) tArea.value = "a"; // dummy character
    setTimeout(() => {
        resize();
        if (wasEmpty) tArea.value = "";
    }, 0);
}

const starSVG = 
    `<svg stroke="var(--primary-color)" viewBox="0 0 24 24">
        <path d="M5 16V20M6 4V8M7 18H3M8 6H4M13 4L14.7528 8.44437C14.9407 8.92083 15.0347 9.15906 15.1786 9.35994C15.3061 9.538 15.462 9.69391 15.6401 9.82143C15.8409 9.9653 16.0792 10.0593 16.5556 10.2472L21 12L16.5556 13.7528C16.0792 13.9407 15.8409 14.0347 15.6401 14.1786C15.462 14.3061 15.3061 14.462 15.1786 14.6401C15.0347 14.8409 14.9407 15.0792 14.7528 15.5556L13 20L11.2472 15.5556C11.0593 15.0792 10.9653 14.8409 10.8214 14.6401C10.6939 14.462 10.538 14.3061 10.3599 14.1786C10.1591 14.0347 9.92083 13.9407 9.44437 13.7528L5 12L9.44437 10.2472C9.92083 10.0593 10.1591 9.9653 10.3599 9.82143C10.538 9.69391 10.6939 9.538 10.8214 9.35994C10.9653 9.15906 11.0593 8.92083 11.2472 8.44437L13 4Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
for (const h3 of document.getElementsByTagName("h3")) {
    const size = getComputedStyle(h3).getPropertyValue("font-size");
    h3.innerHTML = starSVG + h3.innerHTML;
    h3.firstElementChild.style.height = size;
}

/**
 * 
 * @param {HTMLElement} elem parent element
 * @param {boolean} above `true` to display above parent, `false` for below
 * @param {number} gap gap between parent and tooltip, in px
 * @param {string} innerHTML 
 */
export function setToolTip(elem, above, gap, innerHTML) {
    const tooltip = document.createElement("div");
    tooltip.classList.add("tooltip");
    tooltip.innerHTML = innerHTML;

    if (above) tooltip.style.bottom = `calc(100% + ${gap}px)`;
    else tooltip.style.top = `calc(100% + ${gap}px)`;

    elem.addEventListener("mouseover", (e) => {
        console.log("entered");
        tooltip.style.opacity = 1;
    });
    elem.addEventListener("mouseleave", (e) => {
        console.log("left");
        tooltip.style.opacity = 0;
    });
    // elem.addEventListener("mouseleave", (e) => tooltip.style.opacity = 0);

    // elem.addEventListener("mouseenter", (e) => tooltip.style.opacity = 1);
    // elem.addEventListener("mouseleave", (e) => tooltip.style.opacity = 0);

    elem.appendChild(tooltip);
}

[
    ["sync", "sync&nbsp;data"],
    ["new", "new&nbsp;song"],
    ["account-btn", "account"],
    ["settings-btn", "settings"]
].forEach(pair => {
    setToolTip(document.getElementById(pair[0]), false, 10, pair[1]);
});
