import { data } from "./userdata.js";

let username;
let pass;

const syncBtn = document.getElementById("sync");

export async function setCredentials(u, p, newAccount) {
    username = u;
    pass = p;

    if (newAccount) await setPassword(pass);
}

export async function getData() {
    console.log("getting data with ", pass);
    const res = await fetch(`https://localhost:5001/get-data/${username}`, {
        method: "POST",
        body: pass
    })
    if (res.ok) return await res.json();

    return res.status;
}

export async function uploadData() {
    await fetch(`https://localhost:5001/upload-data/${username}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: data.stringify({
            "pass": pass,
            "userdata": data
        })
    });
}

async function setPassword(p) {
    await fetch(`https://localhost:5001/set-hash/${username}`, {
        method: "POST",
        body: p // in body to allow '/' character
    });
    pass = p;
}