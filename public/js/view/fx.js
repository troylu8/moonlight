import { audio } from "../play.js";
import { data } from "../account/userdata.js";

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

// TEXTAREAS
for (const tArea of document.getElementsByClassName("auto-height")) {
    const resize = () => {
        tArea.style.height = '1px';
        tArea.style.height = (tArea.scrollHeight) + "px";
    };

    // prevent newline characters and resize on input
    tArea.addEventListener("input", resize);
    tArea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !tArea.allowNewline) e.preventDefault();
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
 * adds a tooltip to the element. if one already exists, overrides it.
 * @param {HTMLElement} elem parent element
 * @param {string} innerHTML 
 * @param {number} gap gap between parent and tooltip, in px
 * @returns {HTMLElement} the created tooltip
 */
export function setToolTip(elem, innerHTML, gap) {
    const tooltip = elem.tooltip ?? document.createElement("div");
    elem.tooltip = tooltip;

    tooltip.classList.add("tooltip");
    tooltip.innerHTML = innerHTML;

    if (gap !== 0) {
        if (gap > 0)    tooltip.style.bottom = `calc(100% + ${gap}px)`;
        else            tooltip.style.top = `calc(100% + ${-gap}px)`;
    }

    elem.addEventListener("mouseover", () => {
        tooltip.style.opacity = 1;
        tooltip.style.pointerEvents = "auto";
    });
    elem.addEventListener("mouseleave", () => {
        tooltip.style.opacity = 0;
        tooltip.style.pointerEvents = "none";
    });

    elem.appendChild(tooltip);
    return tooltip;
}

export function removeTooltip(elem) {
    if (!elem.tooltip) return;
    elem.tooltip.remove();
    delete elem.tooltip;
}


[
    ["sync", `sync&nbsp;data <p id="sync__error" class="error-msg" ></p>`],
    ["new", "new&nbsp;song"],
    ["account-btn", "account"],
    ["settings-btn", "settings"]
].forEach(pair => {
    setToolTip(document.getElementById(pair[0]), pair[1], -10);
});

// ERROR DISPLAYS
export function showError(errorElem, text) {
    // blink effect if we get the error repeatedly 
    if (errorElem.innerHTML !== "") {
        errorElem.style.opacity = "0";
        setTimeout(() => errorElem.style.opacity = "1", 50);        
    }
    errorElem.innerHTML = text;
}

for (const s of document.getElementsByClassName("slider")) {
    setSliderColors(s, "var(--accent-color)", "var(--primary-color)");
}

function setSliderColors(slider, left, right) {
    slider.updateSliderColors = function () {
        this.style.background = `linear-gradient(to right, ${left} 0%, ${left} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} ${(this.value-this.min)/(this.max-this.min)*100}%, ${right} 100%)`;
    }
    slider.oninput = slider.updateSliderColors;

    slider.updateSliderColors();
}

export function addSliderDragEvent(slider, ondrag) {
    if (slider.dragging === undefined) {
        slider.dragging = false;
        slider.addEventListener("mousedown", () => { slider.dragging = true; });
        slider.addEventListener("mouseup", () => { slider.dragging = false; });
    }
    slider.addEventListener("mousemove", (e) => { if (slider.dragging) ondrag(e); });
}