import { setSidebarContent } from "../view/sidebar.js";
import { accDropdown } from "../view/signinElems.js";
import {data} from "../account/userdata.js";
import { initDeleteBtn, showError } from "../view/fx.js";
import { stragglersList } from "../view/elems.js";
import * as acc from "../account/account.js";
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
        if (username === acc.username) return showError(changeU__error, "this is your current username");

        const res = await fetch(`https://localhost:5001/change-username/${acc.uid}`, {
            method: "PUT",
            body: JSON.stringify({
                username: username,
                password: changeU__password.value.trim()
            }),
            headers: {
                "Content-Type": "application/json"
            },
        });
        if (res.status === 409) return showError(changeU__error, "username taken");
        if (res.status === 401) return showError(changeU__error, "wrong password");

        acc.setAccInfo(null, null, username);

        //TODO: notif
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
        const newPassword = changeP__new.value.trim();
        if (newPassword !== changeP__repeat.value.trim()) return showError(changeP__error, "passwords don't match");
        
        const res = await fetch(`https://localhost:5001/change-password/${acc.uid}`, {
            method: "PUT",
            body: JSON.stringify({
                oldPassword: changeP__old.value.trim(),
                newPassword: newPassword
            }),
            headers: {
                "Content-Type": "application/json"
            },
        });
        if (res.status === 401) return showError(changeP__error, "wrong password");

        //TODO: notif
        return true;
    }
);