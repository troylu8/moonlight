import { updateSongEntries, songSettings, clearCurrentlyEditing } from "./songSettings.js";

export let open = false;

export function setSidebarOpen(val) {
    if (open === val) return;
    document.body.style.setProperty("--sidebar-div-width", val? "350px" : "0px");
    open = val;
}


let currentContent = null;

export function setSidebarContent(elem) {
    // if switching away from songsettings or to different song, update song entries of song we were just editing
    if (currentContent === songSettings) updateSongEntries();
    if (currentContent === elem) return setSidebarOpen(true);

    if (currentContent !== null) currentContent.style.display = "none";
    
    currentContent = elem;
    currentContent.style.display = "flex";

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => {
    clearCurrentlyEditing();
    setSidebarOpen(false)
};

