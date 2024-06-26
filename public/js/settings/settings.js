import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import { data } from "../account/userdata.js";
import { disableBtn, enableBtn, initDeleteBtn, sendNotification, shiftDown, showError } from "../view/fx.js";
import { stragglersList } from "../view/elems.js";
import * as acc from "../account/account.js";
import { syncIfNotSyncing } from "../account/clientsync.js";
const { ipcRenderer, shell } = require("electron");
const { createHash } = require('crypto');


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

const showUnsyncedIcons = document.getElementById("show-unsynced-icons");
function showUnsyncedHandler() {
    if (showUnsyncedIcons.checked)  document.body.classList.add("show-unsynced-icons");
    else                            document.body.classList.remove("show-unsynced-icons");
}
showUnsyncedIcons.addEventListener("change", showUnsyncedHandler);

function updateColor(cssvar, value) {
    document.body.style.setProperty(cssvar, value);
    document.getElementById(cssvar + "__display").style.backgroundColor = value;
    if (cssvar === "--background-color") ipcRenderer.invoke("set-titlebar-color", getComputedStyle(document.body).getPropertyValue(cssvar));
}

export function initSettings() {
    for (const elem of document.getElementsByClassName("settings-checkbox")) {    
        elem.addEventListener("change", () => data.settings[elem.id] = elem.checked);
        elem.checked = data.settings[elem.id];
    }
    showUnsyncedHandler();

    for (const elem of document.getElementsByClassName("settings-color")) {    
        elem.addEventListener("input", () => {
            data.settings[elem.id] = elem.value;
            updateColor(elem.id, elem.value);
        });

        if (!data.settings[elem.id]) applyDefaultColor(elem);
        else {
            elem.value = data.settings[elem.id];
            updateColor(elem.id, elem.value);
        }
    }
}

function applyDefaultColor(colorElem) {
    data.settings[colorElem.id] = getComputedStyle(document.body).getPropertyValue(colorElem.id + "-default");
    updateColor(colorElem.id, `var(${colorElem.id}-default)`);
}

const resetColors = document.getElementById("reset-colors");
resetColors.addEventListener("click", () => {
    if (!shiftDown) return resetColors.textContent = "[shift + click] reset colors";
    for (const elem of document.getElementsByClassName("settings-color")) applyDefaultColor(elem);
    resetColors.textContent = "reset colors";
});

const deleteAllBtn = document.getElementById("stragglers__delete-all");
const deleteAllErr = document.getElementById("stragglers__delete-all__error");
initDeleteBtn(deleteAllBtn, deleteAllErr, () => {
    stragglersList.querySelectorAll(".straggler__delete").forEach(btn => btn.click());
    deleteAllBtn.reset("delete all");
});

document.getElementById("open-song-folder").addEventListener("click", () => {
    ipcRenderer.invoke("show-folder", global.userDir + "/songs");
});


/**
 * @param {{button, content, inputs, error, submit}} elems
 */
function initAccEditor(elems, onsubmit) {
    const {button, content, inputs, error, submit} = elems;

    button.addEventListener("click", () => {
        if (content.style.display !== "flex") {
            inputs.forEach(input => input.value = "");
            error.textContent = "";
            content.style.display = "flex";
        }
        else content.style.display = "none";
    });

    inputs.forEach(elem => elem.addEventListener("keypress", (e) => {
        if (e.key === "Enter")  submit.click();
        else                    error.textContent = "";
    }));

    submit.addEventListener("click", async () => {
        disableBtn(submit);
        if (await onsubmit()) content.style.display = "none";
        enableBtn(submit);
    });
}

const changeU__username = document.getElementById("change-username__username");
const changeU__password = document.getElementById("change-username__password");
const changeU__error = document.getElementById("change-username__error");

initAccEditor(
    {
        button: document.getElementById("change-username__btn"),
        content: document.getElementById("change-username__content"),
        inputs: [changeU__username, changeU__password],
        error: changeU__error,
        submit: document.getElementById("change-username__submit")
    }, 
    async () => {
        const username = changeU__username.value.trim();

        if (username === "") return showError(changeU__error, "username cannot be empty");
        if (username === acc.user.username) return showError(changeU__error, "this is your current username");

        const res = await fetch(`https://172.115.50.238:39999/change-username/${acc.user.uid}`, {
            method: "PUT",
            body: JSON.stringify({
                username: username,
                hash1: createHash("sha256").update(changeU__password.value.trim()).digest("hex")
            }),
            headers: {
                "Content-Type": "application/json"
            },
        }).catch(acc.fetchErrHandler);
        if (!res) return;

        if (res.status === 409) return showError(changeU__error, "username taken");
        if (res.status === 401) return showError(changeU__error, "wrong password");

        acc.user.setUsername(username);

        sendNotification("set username as " + username)
        return true;
    }
);

const changeP__old = document.getElementById("change-password__old-password");
const changeP__new = document.getElementById("change-password__new-password");
const changeP__repeat = document.getElementById("change-password__repeat-password");
const changeP__error = document.getElementById("change-password__error");

initAccEditor(
    {
        button: document.getElementById("change-password__btn"),
        content: document.getElementById("change-password__content"),
        inputs: [changeP__old, changeP__new, changeP__repeat],
        error: changeP__error,
        submit: document.getElementById("change-password__submit")
    },
    async () => {
        const oldPassword = changeP__old.value.trim();
        const newPassword = changeP__new.value.trim();
        const newHash1 = createHash("sha256").update(newPassword).digest("hex");
        if (newPassword !== changeP__repeat.value.trim()) return showError(changeP__error, "passwords don't match");
        
        const res = await fetch(`https://172.115.50.238:39999/change-password/${acc.user.uid}`, {
            method: "PUT",
            body: JSON.stringify({
                oldHash1: createHash("sha256").update(oldPassword).digest("hex"),
                newHash1: newHash1
            }),
            headers: {
                "Content-Type": "application/json"
            },
        }).catch(acc.fetchErrHandler);
        if (!res) return;
        if (res.status === 401) return showError(changeP__error, "wrong password");

        // sync with updated hash but still using old key 
        acc.user.hash1 = newHash1;
        await syncIfNotSyncing()

        // sync again with the new key
        await acc.user.setPassword(newPassword, newHash1);
        await syncIfNotSyncing(true);

        sendNotification("password change success");
        return true;
    }
);

document.getElementById("discord").addEventListener("click", () => {
    shell.openExternal("https://www.discord.gg/3yt3mNMcnK");
})