import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import {data} from "../account/userdata.js";
import { initDeleteBtn } from "../view/fx.js";
import { createStragglerEntry, stragglersElem, stragglersList } from "../view/elems.js";
const fs = require("fs");


async function getStragglers() {
    try {
        const songFiles = new Set(await fs.promises.readdir(global.userDir + "/songs"));
        data.songs.forEach(s => songFiles.delete(s.filename));

        return songFiles;
    }
    catch (err) {
        if (err.code === "ENOENT") return new Set();
    }
}

const generalSettings = document.getElementById("settings");


document.getElementById("settings-btn").addEventListener("click", async () => {
    setSidebarContent(generalSettings);
    deleteAllBtn.reset("delete all");

    // update stragglers list
    stragglersList.innerHTML = "";
    const stragglers = await getStragglers();
    console.log("stragglers", stragglers);
    stragglersElem.style.display = (stragglers.size === 0)? "none" : "flex";
    stragglers.forEach(basename => createStragglerEntry(basename));

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

const deleteAllBtn = document.getElementById("stragglers__delete-all");
const deleteAllErr = document.getElementById("stragglers__delete-all__error");
initDeleteBtn(deleteAllBtn, deleteAllErr, () => {
    stragglersList.querySelectorAll(".straggler__delete").forEach(btn => btn.click());
    deleteAllBtn.reset("delete all");
});