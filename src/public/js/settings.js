import { setSidebarContent } from "./sidebar.js";
import { accDropdown } from "./signinElems.js";

const generalSettings = document.getElementById("settings");
document.getElementById("settings-btn").addEventListener("click", () => setSidebarContent(generalSettings));

const userSettings = document.getElementById("user-settings");
document.getElementById("user-settings-btn").addEventListener("click", () => {
    setSidebarContent(userSettings);
    accDropdown.close();
});


export const settings = new Map();

for (const elem of document.getElementsByClassName("settings-field")) {    
    const updateMap = elem.type === "checkbox"? () => settings.set(elem.id, elem.checked) : () => settings.set(elem.id, elem.value);

    elem.addEventListener("change", updateMap);
    updateMap();
}


console.log(settings);