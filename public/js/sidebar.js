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

function setSidebarContent(elem, toggle) {
    if (currentContent === elem) {
        if (toggle) toggleSidebar();
        else        setSidebarOpen(true);
        console.log("toggle");
        return;
    }

    if (currentContent !== null) currentContent.style.display = "none";
    
    currentContent = elem;
    currentContent.style.display = "flex";

    setSidebarOpen(true);
}

document.getElementById("sidebar__collapse").onclick = () => setSidebarOpen(false);

const settings = document.getElementById("settings");
const songSettings = document.getElementById("song-settings");

document.getElementById("settings-btn").onclick = () => setSidebarContent(settings, true);

const songSettingsBtns = document.getElementsByClassName("song__options");
for (const b of songSettingsBtns) {
    b.onclick = () => {
        // update song settings to current song
        setSidebarContent(songSettings);
    }
}

const filename = document.getElementById("song-settings__filename");
const size = document.getElementById("song-settings__size");
const title = document.getElementById("song-settings__title");
const artist = document.getElementById("song-settings__artist");


export function openSongOptions(song) {
    filename.innerText = song.filename;
    size.innerText = song.size ?? "?";
    title.value = song.title;
    artist.value = song.artist;


    setSidebarContent(songSettings);
}