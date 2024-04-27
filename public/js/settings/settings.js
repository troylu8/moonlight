import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import {data} from "../account/userdata.js";
import { initDeleteBtn } from "../view/fx.js";
import { createStragglerEntry, stragglersList } from "../view/elems.js";
import { uid } from "../account/account.js";
const fs = require("fs");


async function getStragglers() {
    const songFiles = new Set(await fs.promises.readdir(`${global.resources}/users/${uid}/songs`));
    data.songs.forEach(s => songFiles.delete(s.filename));

    return songFiles;
}

const generalSettings = document.getElementById("settings");
document.getElementById("settings-btn").addEventListener("click", async () => {
    setSidebarContent(generalSettings);
    deleteBtn.reset("delete all");

    // update stragglers list
    stragglersList.innerHTML = "";
    (await getStragglers()).forEach(basename => createStragglerEntry(basename));

    // createStragglerEntry("cinnamons evening cinema summertime Official Music Video.wav");
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
    console.log(data.settings);
}

const deleteBtn = document.getElementById("stragglers__delete-all");
const deleteErr = document.getElementById("stragglers__delete-all__error");
initDeleteBtn(deleteBtn, deleteErr, () => {
    //TODO: delete
});