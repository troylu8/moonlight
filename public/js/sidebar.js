let open = false;

const setSidebarOpen = (val) => {
    if (open === val) return;
    document.body.style.setProperty("--sidebar-div-width", val? "350px" : "0");
    open = val;
}
const toggleSidebar = () => {
    setSidebarOpen(!open);
    console.log("toggle");
};


let currentContent = null;

function setSidebarContent(elem) {
    if (currentContent === elem) {
        toggleSidebar();
        console.log("toggle");
        return;
    }

    if (currentContent !== null) currentContent.style.display = "none";
    
    
    currentContent = elem;
    currentContent.style.display = "flex";

    setSidebarOpen(true);
}

const songSettings = document.getElementById("song-settings");
const settings = document.getElementById("settings");

document.getElementById("settings-btn").onclick = () => setSidebarContent(settings);

const songSettingsBtns = document.getElementsByClassName("song__options");
for (b of songSettingsBtns) {
    b.onclick = () => {
        // update song settings to current song
        setSidebarContent(songSettings);
    }
}
