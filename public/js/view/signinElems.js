import * as acc from "../account/account.js"
import Dropdown from "./dropdown.js";
import { audio } from "../play.js";
import { disableBtn, enableBtn, sendNotification, setSyncIcon, showError } from "./fx.js";
import { data, nullifyData } from "../account/userdata.js";

const titlescreen = document.getElementById("titlescreen");
const primary = document.getElementById("primary");

export function setTitleScreen(active) {
    titlescreen.style.display = active? "grid" : "none";
    primary.style.display = active? "none" : "block";
    
    if (active) {
        audio.pause();
        setSyncIcon(false);
    }
}



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

        disableBtn(submit);
        
        username.value = username.value.trim();
        password.value = password.value.trim();
        repeatPassword.value = repeatPassword.value.trim();

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

        enableBtn(submit);
    });

}

document.getElementById("account__continue").addEventListener("click", async () => {
    await acc.loadAcc("guest");

    setTitleScreen(false);
    updateForUsername("", true);
});

document.getElementById("sign-out").addEventListener("click", async () => {
    setSignInActive(true);

    setTitleScreen(true);
    
    await data.saveDataLocal();
    nullifyData();

    acc.user.clearInfo();
    acc.user.saveLocal();
});

const signedInAs = document.getElementById("signed-in-as");
const usernameDisplay = document.getElementById("username-display");
const changeU__header = document.getElementById("change-username__header");
const changeP__header = document.getElementById("change-password__header");

const syncAfterSignIn = document.getElementById("sync-after-sign-in").parentElement;

/** updates DOM elements to reflect new username */
export function updateForUsername(username, isGuest) {
    accDropdown.close();

    usernameDisplay.textContent = username;
    signedInAs.textContent = isGuest? "guest" : username;
    syncAfterSignIn.style.display = isGuest? "none" : "block";
    fromGuestBtn.style.display = isGuest? "block" : "none";

    if (isGuest)  {
        fromGuest.username.value = fromGuest.password.value = fromGuest.repeatPassword.value = "";
    }

    changeU__header.style.display = changeP__header.style.display = isGuest? "none" : "flex";
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