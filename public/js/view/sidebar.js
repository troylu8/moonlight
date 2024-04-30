import { updateSongEntries, songSettings, clearCurrentlyEditing } from "../settings/songSettings.js";

export let open = false;

export function setSidebarOpen(val) {
    if (open === val) return;
    document.body.style.setProperty("--sidebar-div-width", val? "350px" : "0px");
    open = val;
}

/** @type {HTMLElement} */
let currentContent;

export function setSidebarContent(elem) {
    // if switching away from songsettings or to different song, update song entries of song we were just editing
    if (currentContent === songSettings) updateSongEntries();
    if (currentContent === elem) return setSidebarOpen(true);

    if (currentContent) currentContent.classList.remove("sidebar__active");
    
    currentContent = elem;
    currentContent.classList.add("sidebar__active");
    console.log(currentContent, currentContent.classList);

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => {
    clearCurrentlyEditing();
    setSidebarOpen(false)
};

