import * as acc from "./account.js"
import Dropdown from "./dropdown.js";

const titlescreen = document.getElementById("titlescreen");
const primary = document.getElementById("primary");

export function setTitleScreen(active) {
    titlescreen.style.display = active? "grid" : "none";
    primary.style.display = active? "none" : "block";
}


let signInActive = true;


const isSafeFilename = (str) => ! (/[/\\?%*:|"<>]/g.test(str));
function inputErrors(username, password, repeatPassword) {
    if (!isSafeFilename(username)) return "username has forbidden characters";
    if (username === "") return "username cannot be empty";
    if (password === "") return "password cannot be empty";
    if (!signInActive && password !== repeatPassword) return "passwords don't match"
}

/**
 * @param {object} options contains `username`, `password`, `repeatPassword`, `error`, `submit` fields
 * @param {function() : boolean} isSigningIn returns `true` if signing in, `false` if creating an acc */
function initAccCreator(options, isSigningIn) {
    const {username, password, repeatPassword, error, submit} = options;

    // typing clears error text, pressing enter clicks submit
    [username, password, repeatPassword].forEach((node) => {
        node.addEventListener("keypress", (e) => {
            if (e.key === "Enter") submit.click();
            error.innerText = "";
        })
    });

    submit.addEventListener("click", async () => {
        const res = inputErrors(username.value, password.value, repeatPassword.value) ??
                    (isSigningIn()?
                    await acc.fetchAccData(username.value, password.value) :
                    await acc.createAccData(username.value, password.value))
    
        if (res === "success")  {
            setTitleScreen(false);
            accountBtn.firstElementChild.innerText = username.value;
            fromGuestBtn.remove();
        } 
        else {
            // blink effect if we get the error repeatedly 
            if (error.innerText !== "") {
                error.style.opacity = "0";
                setTimeout(() => error.style.opacity = "1", 50);        
            }
            error.innerText = res;
        } 
    });

}

document.getElementById("account__continue").addEventListener("click", () => {
    acc.signInAsGuest();
    setTitleScreen(false);
    
    accountDropdown.appendChild(fromGuestBtn);
    accountBtn.firstElementChild.innerText = "[guest]";
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
}, () => signInActive)

const title = document.getElementById("account__title");
const toggle = document.getElementById("account__toggle");

toggle.addEventListener("click", () => {
    signInActive = !signInActive;
    
    toggle.innerText = signInActive? "create new account" : "already have account";
    title.innerText = submit.innerText = signInActive? "sign in" : "create account";

    repeatPassword.style.display = signInActive? "none" : "block";
    repeatPassword.value = error.innerText = "";
});




const fromGuest = {
    username: document.getElementById("from__username"),
    password: document.getElementById("from__password"),
    repeatPassword: document.getElementById("from__repeat-password"),
    error: document.getElementById("from__error"),
    submit: document.getElementById("from__submit")
}
initAccCreator(fromGuest, () => false);

const fromGuestBtn = document.getElementById("create-account-from");
fromGuestBtn.addEventListener("click", () => {
    for (const elem of Object.values(fromGuest)) elem.style.display = "block";
    fromGuestBtn.style.display = "none";
});

document.getElementById("sign-out").addEventListener("click", () => {
    setTitleScreen(true);
});

const accountBtn = document.getElementById("account-btn");
const accountDropdown = document.getElementById("account__dropdown");

class AccDropdown extends Dropdown {
    close() {
        super.close();

        for (const elem of Object.values(fromGuest)) elem.style.display = "none";
        fromGuestBtn.style.display = "block";
    }
}
new AccDropdown(accountBtn, accountDropdown);