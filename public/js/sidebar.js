import { updateSongEntries, songSettings } from "./songSettings.js";

export let open = false;

export function setSidebarOpen(val) {
    if (open === val) return;
    document.body.style.setProperty("--sidebar-div-width", val? "350px" : "0px");
    open = val;
}
export function toggleSidebar() {
    setSidebarOpen(!open);
};

const settings = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => setSidebarContent(settings, true);


let currentContent = null;

export function setSidebarContent(elem, toggle) {
    // if switching away from songsettings or to different song, update song entries of song we were just editing
    if (currentContent === songSettings) updateSongEntries();

    if (currentContent === elem) {
        if (toggle) toggleSidebar();
        else        setSidebarOpen(true);
        return;
    }

    if (currentContent !== null) currentContent.style.display = "none";
    
    currentContent = elem;
    currentContent.style.display = "flex";

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => setSidebarOpen(false);

