import { updateSongEntries, songSettings, clearCurrentlyEditing } from "../settings/songSettings.js";
import { mainDiv } from "./elems.js";

export let open = false;

const sidebar = document.getElementById("sidebar-div");
const options = document.getElementById("options-div");

const dragger = document.getElementById("sidebar__dragger");

export function setSidebarOpen(val) {
    if (open === val) return;
    open = val;
    dragger.style.display = open? "block" : "none";

    if (open) {
        sidebar.style.right = "0";
        options.style.right = mainDiv.style.right = "var(--sidebar-div-width)";
    }
    else {
        sidebar.style.right = "calc(var(--sidebar-div-width) * -1)";
        options.style.right = mainDiv.style.right = "0";
    }
    
}



/** @type {HTMLElement} */
export let activeSidebarElem;

export function setSidebarContent(elem) {
    // if switching away from songsettings or to different song, update song entries of song we were just editing
    if (activeSidebarElem === songSettings) updateSongEntries();
    if (activeSidebarElem === elem) return setSidebarOpen(true);

    if (activeSidebarElem) activeSidebarElem.classList.remove("sidebar__active");
    
    activeSidebarElem = elem;
    activeSidebarElem.classList.add("sidebar__active");
    console.log(activeSidebarElem, activeSidebarElem.classList);

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => {
    clearCurrentlyEditing();
    setSidebarOpen(false)
};

