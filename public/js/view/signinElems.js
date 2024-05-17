import * as acc from "../account/account.js"
import Dropdown from "./dropdown.js";
import { audio } from "../play.js";
import { encryptLocalData } from "../account/files.js";
import { sendNotification, showError } from "./fx.js";
import { nullifyData } from "../account/userdata.js";

const titlescreen = document.getElementById("titlescreen");
const primary = document.getElementById("primary");

export function setTitleScreen(active) {
    titlescreen.style.display = active? "grid" : "none";
    primary.style.display = active? "none" : "block";

    if (active) audio.pause();
}

const signedInAs = document.getElementById("signed-in-as");


function inputErrors(username, password, repeatPassword, signingIn) {
    if (username === "") return "username cannot be empty";
    if (password === "") return "password cannot be empty";
    if (!signingIn && password !== repeatPassword) return "passwords don't match"
}

/**
 * @param {{username, password,repeatPassword, error, submit}} elems
 */
function initAccCreator(elems) {
    const {username, password, repeatPassword, error, submit} = elems;

    // typing clears error text, pressing enter clicks submit
    [username, password, repeatPassword].forEach((node) => {
        node.addEventListener("keypress", (e) => {
            if (e.key === "Enter")  submit.click();
            else                    error.textContent = "";
        })
    });

    submit.addEventListener("click", async () => {
        const signingIn = getComputedStyle(repeatPassword).display === "none";

        const res = inputErrors(username.value, password.value, repeatPassword.value, signingIn) ??
                    (signingIn? 
                    await acc.fetchAccData(username.value, password.value) :
                    await acc.createAccData(username.value, password.value))
    
        if (res === "success")  {
            setTitleScreen(false);
            updateForUsername(username.value);
            sendNotification("welcome, " + username.value);    
        }
        else showError(error, res);
    });

}

document.getElementById("account__continue").addEventListener("click", async () => {
    await acc.loadAcc("guest");

    setTitleScreen(false);
    updateForUsername("[guest]", true);
});

document.getElementById("sign-out").addEventListener("click", async () => {
    setSignInActive(true);

    setTitleScreen(true);
    acc.user.clearInfo();
    nullifyData();

    console.log("clearing cache");
    
    encryptLocalData("jwt", null); // clear saved jwt
});

const usernameDisplay = document.getElementById("username-display");
const changeU__btn = document.getElementById("change-username__btn");
const changeP__btn = document.getElementById("change-password__btn");

/** updates DOM elements to reflect new username */
export function updateForUsername(username, isGuest) {
    usernameDisplay.textContent = signedInAs.textContent = username;

    if (isGuest)  {
        accountDropdown.appendChild(fromGuestBtn);
        fromGuest.username.value = fromGuest.password.value = fromGuest.repeatPassword.value = "";
    }
    else          fromGuestBtn.remove();

    accDropdown.close();

    changeU__btn.style.display = changeP__btn.style.display = isGuest? "none" : "inline-block";
}

const repeatPassword = document.getElementById("account__repeat-password");
const error = document.getElementById("account__error")
const submit = document.getElementById("account__submit");

initAccCreator({
    username: document.getElementById("account__username"),
    password: document.getElementById("account__password"),
    repeatPassword: repeatPassword,
    error: error,
    submit: submit
})

const title = document.getElementById("account__title");
const toggle = document.getElementById("account__toggle");

toggle.addEventListener("click", () => {    
    setSignInActive(getComputedStyle(repeatPassword).display === "block");
});

/**
 * @param {boolean} signin `true` for sign in, `false` for create account
 */
function setSignInActive(signin) {
    toggle.textContent = signin?  "create new account" : "already have account";
    title.textContent = submit.textContent = signin? "sign in" : "create account";

    repeatPassword.style.display = signin? "none" : "block";
    repeatPassword.value = error.textContent = "";
}


const fromGuest = {
    username: document.getElementById("from__username"),
    password: document.getElementById("from__password"),
    repeatPassword: document.getElementById("from__repeat-password"),
    error: document.getElementById("from__error"),
    submit: document.getElementById("from__submit")
}
initAccCreator(fromGuest);

const fromGuestBtn = document.getElementById("create-account-from-btn");
const fromGuestInputs = document.getElementById("create-account-from");
fromGuestBtn.addEventListener("click", () => {
    fromGuestInputs.style.display = "flex";
    fromGuestBtn.style.display = "none";
});

const accountBtn = document.getElementById("account-btn");
const accountDropdown = document.getElementById("account__dropdown");

export const accDropdown = new Dropdown(accountBtn, accountDropdown, null, () => {
        fromGuestInputs.style.display = "none";
        fromGuestBtn.style.display = "block";
        fromGuest.error.textContent = "";
    }
); 