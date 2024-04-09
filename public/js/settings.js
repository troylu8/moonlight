import genID from "./id.js";
import { setSidebarContent } from "./sidebar.js";
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
setAccountElem(signIn);

const create__username = document.getElementById("create-account__username");
const create__password = document.getElementById("create-account__password");
const repeatPassword = document.getElementById("create-account__repeat-password");

const signedInAs = document.getElementById("signed-in-as");

document.getElementById("create-account__submit")
    .addEventListener("click", async () => {
        const error = usernameErrors(create__username.value);
        if (error) return console.log(error);
        if (create__password.value !== repeatPassword.value) return console.log("passwords dont match");

        const uid = genID(14);

        //TODO: change to actual ip!
        // create account at server
        const createReq = await fetch(`https://localhost:5001/create-account-dir/${uid}/${create__username.value}`, {method: "POST"});
        if (createReq.status === 409) return console.log("username taken");

        // create account at client
        await fetch("http://localhost:5000/files/create-account-dir/" + uid, {method: "POST"});

        await sync.setCredentials(uid, create__username.value, create__password.value, true);
        
        signedInAs.innerText = "signed in as " + create__username.value;
        setAccountElem(accountInfo);

        //TODO: sync!!
}) 

const signIn__username = document.getElementById("sign-in__username");
const signIn__password = document.getElementById("sign-in__password");

document.getElementById("sign-in__submit")
    .addEventListener("click", async () => {

        if (usernameErrors(signIn__username.value)) 
            return console.log("username not found");
        
        const uid = await sync.getUID(signIn__username.value);
        if (!uid) return console.log("no user named ", signIn__username.value);

        const data = await sync.getData(uid, signIn__password.value);
        if (data === 401) return console.log("unauthorized!");
        
        sync.setCredentials(uid, signIn__username.value, signIn__password.value);

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

