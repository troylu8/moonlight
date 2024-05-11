import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import {data} from "../account/userdata.js";
import { initDeleteBtn } from "../view/fx.js";
import { stragglersList } from "../view/elems.js";
const fs = require("fs");
const { ipcRenderer } = require("electron");


const generalSettings = document.getElementById("settings");


document.getElementById("settings-btn").addEventListener("click", async () => {
    setSidebarContent(generalSettings);
    deleteAllBtn.reset("delete all");
});

const userSettings = document.getElementById("user-settings");
document.getElementById("user-settings-btn").addEventListener("click", () => {
    setSidebarContent(userSettings);
    accDropdown.close();
});

export async function initSettings() {
    for (const elem of document.getElementsByClassName("settings-field")) {    
        const updateMap = () => data.settings[elem.id] = elem.checked ?? elem.value;
        elem.addEventListener("change", updateMap);
        updateMap();
    }
}

const deleteAllBtn = document.getElementById("stragglers__delete-all");
const deleteAllErr = document.getElementById("stragglers__delete-all__error");
initDeleteBtn(deleteAllBtn, deleteAllErr, () => {
    stragglersList.querySelectorAll(".straggler__delete").forEach(btn => btn.click());
    deleteAllBtn.reset("delete all");
});

document.getElementById("open-song-folder").addEventListener("click", () => {
    ipcRenderer.invoke("show-folder", global.userDir + "/songs");
});



const changeU__username = document.getElementById("change-username__username");
const changeU__password = document.getElementById("change-username__password");

document.getElementById("change-username__submit").addEventListener("click", () => {
    
})