import { setSidebarContent } from "./sidebar.js";
import { data } from "./userdata.js";
import * as sync from "./sync.js";

const settings = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => setSidebarContent(settings);

export const createAccount = document.getElementById("create-account");
export const signIn = document.getElementById("sign-in");
export const accountInfo = document.getElementById("account-info");

/** @type {HTMLElement} */
let activeAccountElem;
export function setAccountElem(accountElem) {
    if (activeAccountElem) activeAccountElem.style.display = "none";
    activeAccountElem = accountElem;
    activeAccountElem.style.display = "flex";
}
setAccountElem(createAccount);

const create__username = document.getElementById("create-account__username");
const create__password = document.getElementById("create-account__password");
const repeatPassword = document.getElementById("create-account__repeat-password");

const signedInAs = document.getElementById("signed-in-as");

document.getElementById("create-account__submit")
    .addEventListener("click", async () => {
        const error = usernameErrors(create__username.value);
        if (error) return console.log(error);
        if (create__password.value !== repeatPassword.value) return console.log("passwords dont match");

        //TODO: change to actual ip!
        const createReq = await fetch(`https://localhost:5001/create-account-dir/${create__username.value}`, {method: "POST"});
        if (createReq.status === 409) return console.log("username taken!");

        await sync.setCredentials(create__username.value, create__password.value, true);
        await sync.uploadData();

        signedInAs.innerText = "signed in as " + create__username.value;
        setAccountElem(accountInfo);
}) 

const signIn__username = document.getElementById("sign-in__username");
const signIn__password = document.getElementById("sign-in__password");

document.getElementById("sign-in__submit")
    .addEventListener("click", async () => {
        if (usernameErrors(signIn__username.value)) 
            return console.log("username not found");
        
        sync.setCredentials(signIn__username.value, signIn__password.value);
        const data = await sync.getData();

        if (data === 401) return console.log("unauthorized!");
        if (data === 404) return console.log("no user named ", signIn__username.value);

        signedInAs.innerText = "signed in as " + signIn__username.value;
        setAccountElem(accountInfo);
})

async function hash(input) {
    const res = await fetch("http://localhost:5000/hash", {
        method: "POST",    
        body: input
    });
    return await res.text();
}

function usernameErrors(username) {
    if (!isSafeFilename(username)) return "forbidden characters";
    if (username === "") return "empty";
}

const isSafeFilename = (str) => ! (/[/\\?%*:|"<>]/g.test(str));

document.getElementById("create-account__already-have")
    .addEventListener("click", () => setAccountElem(signIn));
document.getElementById("sign-out")
    .addEventListener("click", () => setAccountElem(signIn));
document.getElementById("sign-in__create-account")
    .addEventListener("click", () => setAccountElem(createAccount));

