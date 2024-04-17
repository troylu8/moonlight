import * as acc from "./account.js"
import Dropdown from "./dropdown.js";
import { audio } from "./play.js";

const titlescreen = document.getElementById("titlescreen");
const primary = document.getElementById("primary");

export function setTitleScreen(active) {
    titlescreen.style.display = active? "grid" : "none";
    primary.style.display = active? "none" : "block";

    if (active) audio.pause();
}

const signedInAs = document.getElementById("signed-in-as");


const isSafeFilename = (str) => ! (/[/\\?%*:|"<>]/g.test(str));
function inputErrors(username, password, repeatPassword, signingIn) {
    if (!isSafeFilename(username)) return "username has forbidden characters";
    if (username === "") return "username cannot be empty";
    if (password === "") return "password cannot be empty";
    if (!signingIn && password !== repeatPassword) return "passwords don't match"
}

/**
 * @param {object} options contains `username`, `password`, `repeatPassword`, `error`, `submit` fields
 */
function initAccCreator(options) {
    const {username, password, repeatPassword, error, submit} = options;

    // typing clears error text, pressing enter clicks submit
    [username, password, repeatPassword].forEach((node) => {
        node.addEventListener("keypress", (e) => {
            if (e.key === "Enter")  submit.click();
            else                    error.textContent = "";
        })
    });

    submit.addEventListener("click", async () => {
        const signingIn = repeatPassword.style.display !== "block";
        const res = inputErrors(username.value, password.value, repeatPassword.value, signingIn) ??
                    (signingIn? 
                    await acc.fetchAccData(username.value, password.value) :
                    await acc.createAccData(username.value, password.value))
    
        if (res === "success")  {
            setTitleScreen(false);
            updateForUsername(username.value);
        }
        else error.showError(res);
    });

}

const usernameDisplay = document.getElementById("username-display");

/** updates DOM elements to reflect new username */
export function updateForUsername(username) {
    usernameDisplay.textContent = signedInAs.textContent = username;

    if (acc.isGuest())  accountDropdown.appendChild(fromGuestBtn);
    else                fromGuestBtn.remove();

    accDropdown.close();
}

document.getElementById("account__continue").addEventListener("click", async () => {
    
    await acc.fetchGuestData();

    setTitleScreen(false);
    updateForUsername("[guest]");
});

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
    const signInActive = repeatPassword.style.display !== "block";
    
    toggle.textContent = signInActive? "already have account" : "create new account";
    title.textContent = submit.textContent = signInActive? "create account" : "sign in" ;

    repeatPassword.style.display = signInActive? "block" : "none";
    repeatPassword.value = error.textContent = "";
});



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

document.getElementById("sign-out").addEventListener("click", () => {
    setTitleScreen(true);
    acc.clearAccInfo();

    console.log("clearing cache");
    fetch("http://localhost:5000/files/cache", {method: "PUT"});
});

const accountBtn = document.getElementById("account-btn");
const accountDropdown = document.getElementById("account__dropdown");

export const accDropdown = new Dropdown(accountBtn, accountDropdown, {
    onclose: () => {
        fromGuestInputs.style.display = "none";
        fromGuestBtn.style.display = "block";
        fromGuest.error.textContent = "";
    }
}); 