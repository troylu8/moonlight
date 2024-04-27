import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import {data} from "../account/userdata.js";


const defaultSettings = {
    
}


const generalSettings = document.getElementById("settings");
document.getElementById("settings-btn").addEventListener("click", () => setSidebarContent(generalSettings));

const userSettings = document.getElementById("user-settings");
document.getElementById("user-settings-btn").addEventListener("click", () => {
    setSidebarContent(userSettings);
    accDropdown.close();
});

export function initSettings() {
    for (const elem of document.getElementsByClassName("settings-field")) {    
        const updateMap = () => data.settings[elem.id] = elem.checked ?? elem.value;
        elem.addEventListener("change", updateMap);
        updateMap();
    }
    console.log(data.settings);
}
