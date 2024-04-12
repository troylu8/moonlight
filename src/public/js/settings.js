import genID from "./id.js";
import { setSidebarContent } from "./sidebar.js";
import * as sync from "./account.js";
import { loadUserdata } from "./userdata.js";

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
        

        //TODO: sync!!
}) 

const signIn__username = document.getElementById("sign-in__username");
const signIn__password = document.getElementById("sign-in__password");

document.getElementById("sign-in__submit")
    .addEventListener("click", async () => {

        if (usernameErrors(signIn__username.value)) 
            return console.log("username not found");
        
        const jwtReq = await fetch("https://localhost:5001/get-jwt/" + signIn__username.value, {
            method: "POST",
            body: signIn__password.value
        });
        if (jwtReq.status === 404) return console.log("no user named ", signIn__username.value);
        if (jwtReq.status === 401) return console.log("unauthorized!");
        
        const jwt = await jwtReq.text();
        console.log("successfully signed in with jwt", jwt,  jwt.length, jwtReq.status);
        sync.setAccInfo(jwt, extractUID(jwt), signIn__username.value);
        loadUserdata(sync.uid);

        signedInAs.innerText = "signed in as " + signIn__username.value;
        setAccountElem(accountInfo);
})

/** [stack overflow link](https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library) */
function extractUID(jwt) {
    const base64Url = jwt.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

async function hash(input) {
    const res = await fetch("http://localhost:5000/hash", {
        method: "POST",    
        body: input
    });
    return await res.text();
}



const isSafeFilename = (str) => ! (/[/\\?%*:|"<>]/g.test(str));

document.getElementById("create-account__already-have")
    .addEventListener("click", () => setAccountElem(signIn));
document.getElementById("sign-in__create-account")
    .addEventListener("click", () => setAccountElem(createAccount));

document.getElementById("sign-out").addEventListener("click", () => {
    sync.setAccInfo("guest");
    loadUserdata(sync.guestID);
    setAccountElem(signIn);
});
