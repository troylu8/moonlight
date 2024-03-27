import { setSidebarContent } from "./sidebar.js";

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
        if (!isSafeFilename(create__username.value)) return console.log("username forbidden characters");
        if (create__password.value !== repeatPassword.value) return console.log("passwords dont match");

        //TODO: change to actual ip!
        const createReq = await fetch(`https://localhost:5001/create-account-dir/${create__username.value}`, {method: "POST"});
        if (createReq.status === 409) return console.log("username taken!");

        const hashReq = await fetch(`http://localhost:5000/hash/${create__password.value}`);
        const hash = await hashReq.text();
        
        const setHashReq = await fetch(`https://localhost:5001/set-hash/${create__username.value}`, 
            {
                method: "POST",
                body: hash
            }
        );
        if (setHashReq.ok) {
            console.log("successfully created account");
            signedInAs.innerText = "signed in as " + create__username.value;
            setAccountElem(accountInfo);
        }
    }) 

function isSafeFilename(str) {
    return ! (/[/\\?%*:|"<>]/g.test(str));
}

document.getElementById("create-account__already-have")
    .addEventListener("click", () => setAccountElem(signIn));
document.getElementById("sign-out")
    .addEventListener("click", () => setAccountElem(signIn));
document.getElementById("sign-in__create-account")
    .addEventListener("click", () => setAccountElem(createAccount));

