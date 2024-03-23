import { setSidebarContent } from "./sidebar.js";

const settings = document.getElementById("settings");
document.getElementById("settings-btn").onclick = () => setSidebarContent(settings);


const username = document.getElementById("create-account__username");
const password = document.getElementById("create-account__password");
const repeatPassword = document.getElementById("create-account__repeat-password");

document.getElementById("create-account__submit")
    .addEventListener("click", async () => {
        if (!isSafeFilename(username.value)) return console.log("username forbidden characters");
        if (password.value !== repeatPassword.value) return console.log("passwords dont match");

        const createReq = await fetch(`https://172.115.50.238:5001/create-account-dir/${username.value}`, {method: "POST"});
        if (createReq.status === 409) return console.log("username taken!");

        // hash here

        const setHashReq = await fetch(`https://172.115.50.238:5001/create-account-dir/${username.value}/${HASH_HERE}`, {method: "POST"});
        if (setHashReq.ok) {
            console.log("successfully created account");
        }
})

function isSafeFilename(str) {
    return ! (/[/\\?%*:|"<>]/g.test(str));
}