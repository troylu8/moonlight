import { setSidebarContent } from "./sidebar.js";

const settingsElem = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => setSidebarContent(settingsElem);

export const settings = new Map();

for (const elem of document.getElementsByClassName("settings-field")) {    
    const updateMap = elem.type === "checkbox"? () => settings.set(elem.id, elem.checked) : () => settings.set(elem.id, elem.value);

    elem.addEventListener("change", updateMap);
    updateMap();
}


console.log(settings);