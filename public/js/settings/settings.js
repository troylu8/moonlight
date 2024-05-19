import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import { data } from "../account/userdata.js";
import { initDeleteBtn, sendNotification, showError } from "../view/fx.js";
import { stragglersList } from "../view/elems.js";
import * as acc from "../account/account.js";
import { syncIfNotSyncing } from "../account/clientsync.js";
const { ipcRenderer } = require("electron");
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

export async function initSettingsCheckboxes() {
    for (const elem of document.getElementsByClassName("settings-field")) {    
        elem.addEventListener("change", () => data.settings[elem.id] = elem.checked);
        elem.checked = data.settings[elem.id];
    }
    showUnsyncedHandler();
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
        if (await onsubmit()) content.style.display = "none";
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

        const res = await fetch(`https://localhost:5001/change-username/${acc.user.uid}`, {
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
        
        const res = await fetch(`https://localhost:5001/change-password/${acc.user.uid}`, {
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

        console.log("password change success, syncing");

        // sync with updated hash but still using old key 
        acc.user.hash1 = newHash1;
        await syncIfNotSyncing()

        // sync again with the new key
        await acc.user.setPassword(newPassword, newHash1);
        console.log(acc.user);
        await syncIfNotSyncing(true);

        sendNotification("password change success");
        return true;
    }
);

