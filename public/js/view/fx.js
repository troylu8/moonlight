import { audio } from "../play.js";
import { data } from "../account/userdata.js";
import { activeSidebarElem } from "./sidebar.js";

const circle = document.getElementById("play__circle");

const play = document.getElementById("play__play");
const playlist__play = document.getElementById("playlist-play__play");

const pause = document.getElementById("play__pause");
const playlist__pause = document.getElementById("playlist-play__pause");

/**
 * @param {boolean} playing `true` to display the pause button, `false` for the play button 
 */
export function setPlaylistPlay(playing) {
    playlist__pause.style.display = playing? "block" : "none";   
    playlist__play.style.display = playing? "none" : "block";
}

const rpm = 15;
let spinning = false;

export function toggleSpin() {
    setSpin(!spinning);
}
export function setSpin(spin) {
    if (spin && data.curr.viewPlaylist === data.curr.listenPlaylist) setPlaylistPlay(true);
    if (spin === spinning) return;

    setRPM(circle, spin? rpm : 0);
    
    if (spin) {
        pause.style.display = "block";
        play.style.display = "none";
    } else {
        pause.style.display = "none";
        play.style.display = "block";
        setPlaylistPlay(false);
    }
    
    spinning = spin;
}

/**
 * @param {HTMLElement} elem 
 * @param {number} rpm 
 */
function setRPM(elem, rpm) {
    if (rpm === 0) {
        elem.style.animationPlayState = "paused";
    }
    else {
        elem.style.animationPlayState = "running";
        elem.style.animationDuration = (60 / rpm) + 's';
    }
}

const sync__circle = document.getElementById("sync__circle");
const sync__done = document.getElementById("sync__done");
export function startSyncSpin() {
    setSyncIcon(false);
    setRPM(sync__circle, 40);
}
export function stopSyncSpin(success = true) {
    setSyncIcon(success);
    setRPM(sync__circle, 0);

    // reset circle animation
    sync__circle.style.animation = "none";
    sync__circle.offsetHeight;
    sync__circle.style.animation = null;
}

let synced = false;

/** @param {boolean} check `true` to display checkmark, `false` for the sync symbol */
export function setSyncIcon(check) {
    if (synced === check) return;
    synced = check;

    sync__circle.style.display = synced? "none" : "block";
    sync__done.style.display = synced? "block" : "none";
}

const volumeSlider = document.getElementById("volume-slider");


addDragEvent(volumeSlider, () => {
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

for (const tArea of document.getElementsByClassName("auto-height")) {
    tArea.resize = () => {
        tArea.style.height = '1px';
        tArea.style.height = (tArea.scrollHeight) + "px";
    };

    // prevent newline characters and resize on input
    tArea.addEventListener("input", () => tArea.resize());
    tArea.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !tArea.allowNewline) e.preventDefault();
    });

    tArea.setText = (text) => {
        tArea.value = text;
        setTimeout(() => tArea.resize(), 0);
    }
    
    // initial resize
    let wasEmpty = tArea.value === "";
    if (wasEmpty) tArea.value = "a"; // dummy character
    setTimeout(() => {
        tArea.resize();
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


const primary = document.getElementById("primary");


/**
 * adds a tooltip to the element. if one already exists, overrides it.
 * @param {HTMLElement} parent parent element
 * @param {string} innerHTML 
 * @param {number} gap gap between parent and tooltip, in px
 * @returns {HTMLElement} the created tooltip
 */
export function setToolTip(parent, innerHTML, gap) {
    const tooltip = parent.tooltip ?? document.createElement("div");
    parent.tooltip = tooltip;
    
    tooltip.classList.add("tooltip");
    tooltip.innerHTML = innerHTML;
    tooltip.addEventListener("mousedown", e => e.stopPropagation());

    let baseAncestor = parent;
    while (baseAncestor.parentElement != primary) baseAncestor = baseAncestor.parentElement;
    
    /** moves tooltip to be centered on elem */
    function reposition() {
        const a = parent.getBoundingClientRect();
        const b = tooltip.getBoundingClientRect();
        const bounds = baseAncestor.getBoundingClientRect();
        
        const centerX = a.x + a.width/2;
        const finalX = clamp(centerX - b.width/2, bounds.x, bounds.x + bounds.width - b.width);
        
        tooltip.style.left = finalX + "px";
        tooltip.style.maxWidth = bounds.width - 20 + "px";
        
        const finalY = 
            (gap === 0)?  a.y + a.height/2 - b.height/2: 
            (gap < 0)?  a.y + a.height - gap : 
            a.y - b.height - gap;

        tooltip.style.top = finalY + "px";
    }

    new MutationObserver(() => reposition()).observe(tooltip, {childList: true, subtree: true});

    parent.addEventListener("mouseover", () => {
        reposition();
        tooltip.style.visibility = "visible";
        tooltip.style.opacity = 1;
        tooltip.style.pointerEvents = "auto";
    });

    const hide = () => {
        tooltip.style.opacity = 0;
        tooltip.style.pointerEvents = "none";
    }
    parent.addEventListener("mouseleave", hide);
    parent.addEventListener("wheel", () => {
        tooltip.style.visibility = "hidden";
        hide();
    });

    parent.appendChild(tooltip);
    return tooltip;
}

export function removeTooltip(elem) {
    if (!elem.tooltip) return;
    elem.tooltip.remove();
    delete elem.tooltip;
}


[
    ["sync", `sync data <p id="sync__error" class="error-msg" ></p>`],
    ["new", "new song"],
    ["account-btn", "account"],
    ["settings-btn", "settings"]
].forEach(pair => {
    setToolTip(document.getElementById(pair[0]), pair[1], -10);
});

setToolTip(document.getElementById("change-username__info"), "other devices won't display new username until syncing with server", 10, true);
setToolTip(document.getElementById("change-password__info"), "may take a while to re-encrypt all your data", 10, true);

// ERROR DISPLAYS
export function showError(errorElem, text) {
    // blink effect if we get the error repeatedly 
    if (errorElem.innerHTML !== "") {
        errorElem.style.opacity = "0";
        setTimeout(() => errorElem.style.opacity = "1", 50);        
    }
    errorElem.innerHTML = text ?? "";
}

export let shiftDown = false;
document.body.addEventListener("keydown", (e) => shiftDown = e.shiftKey);
document.body.addEventListener("keyup", (e) => shiftDown = e.shiftKey);

export function initDeleteBtn(btn, errElem, onShiftClick) {
    btn.reset = (text) => {
        btn.textContent = text ?? "delete";
        errElem.textContent = "";
    }
    btn.addEventListener("click", () => {
        if (shiftDown) onShiftClick();
        else {
            btn.textContent = "this cannot be undone";
            showError(errElem, "[shift + click] to delete");
        }
    });
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

export function addDragEvent(elem, ondrag, onmousedown, onmouseup) {
    if (elem.dragging === undefined) {
        elem.dragging = false;
        elem.addEventListener("mousedown", (e) => { 
            if (e.button !== 0) return;
            
            window.getSelection().empty();
            elem.dragging = true; 
            document.body.style.userSelect = "none";
            if (onmousedown) onmousedown(e);
        });
        document.body.addEventListener("mouseup", (e) => { 
            if (!elem.dragging) return;

            elem.dragging = false; 
            document.body.style.userSelect = "auto";
            if (onmouseup) onmouseup(e);
        });
    }
    document.body.addEventListener("mousemove", (e) => { if (elem.dragging) ondrag(e); });
}

function createResizeDragger(dragger, ondrag, onmousedown, onmouseup) {
    addDragEvent(dragger, 
        (e) => ondrag(e),
        () => { 
            document.body.style.setProperty("--movement-transition", "0s");
            if (onmousedown) onmousedown();
        },
        () => { 
            if (onmouseup) onmouseup();
            document.body.style.setProperty("--movement-transition", "0.2s"); 
        }
    );
}


/** @type {NodeList} */
let activeTextAreas;

function clamp(x, min, max) { return (max < min)? max : Math.max( Math.min(x, max), min ); }

/** minimum pixels between playlists and sidebar */
const MIN_GAP = 50;

/**
 * @param {string} opposingWidthcssvar css variable with a width in `px`
 */
function calculateMaxWidth(opposingWidthcssvar) {
    const str = getComputedStyle(document.body).getPropertyValue(opposingWidthcssvar);
    return window.innerWidth - Number(str.substring(0, str.length-2)) - MIN_GAP;
}

let maxSidebarWidth;

createResizeDragger(
    document.getElementById("sidebar__dragger"), 
    (e) => {
        document.body.style.setProperty("--sidebar-div-width", clamp(window.innerWidth - e.clientX, 200, maxSidebarWidth) + "px");
        if (activeTextAreas) activeTextAreas.forEach(tArea => tArea.resize());
    },
    () => {
        activeTextAreas = activeSidebarElem.querySelectorAll("textarea");
        maxSidebarWidth = calculateMaxWidth("--playlists-div-width");
    },
    () => {
        activeTextAreas = null;
        data.settings.sidebarWidth = getComputedStyle(document.body).getPropertyValue("--sidebar-div-width");
    } 
);

let maxPlaylistsWidth;
createResizeDragger(
    document.getElementById("playlists__dragger"), 
    (e) => document.body.style.setProperty("--playlists-div-width", clamp(e.clientX, 100, maxPlaylistsWidth) + "px"),
    () => maxPlaylistsWidth = calculateMaxWidth("--sidebar-div-width"),
    () => data.settings.playlistsWidth = getComputedStyle(document.body).getPropertyValue("--playlists-div-width")
);


const notifications = document.getElementById("notifications");

export function sendNotification(msg, color) {

    const notif = document.createElement("div");
    notif.className = "notification";
    if (color) notif.style.borderLeftColor = color;
    notif.textContent = msg;
    
    notifications.insertBefore(notif, notifications.firstChild);
    getComputedStyle(notif).transition;
    notif.style.left = "0";

    function closeNotification() {
        notif.style.left = "100%";
        notif.addEventListener("transitionend", notif.remove);
    }

    notif.addEventListener("click", closeNotification);
    setTimeout(closeNotification, 5000);
}

export function enableBtn(btn) {
    btn.style.removeProperty("background-color");
    btn.removeAttribute("disabled");
}
export function disableBtn(btn) {
    btn.style.backgroundColor = "var(--disabled-color)";
    btn.setAttribute("disabled", "");
}