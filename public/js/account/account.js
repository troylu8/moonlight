import { data, loadLocaldata } from "./userdata.js";
import { decryptLocalData, getLocalData, setLocalData, watchFiles, encryptLocalData } from "./files.js";
import { setTitleScreen, updateForUsername } from "../view/signinElems.js";
import { sendNotification } from "../view/fx.js";
import { deriveBytes, getDoomed } from "./clientsync.js";
const { createHash } = require('crypto');
const { ipcRenderer } = require("electron");

/**
 * @param {number} len 
 * @returns {string} may contain `0-9` `a-z` `A-Z` `_` `-`
 */
export function genID(len) {
    const map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";
    
    let res = map[Math.floor(Math.random() * 52)]; // first character of css classes cannot be a number
    
    for (let i = 0; i < len-1; i++) 
        res += map[ crypto.getRandomValues(new Uint8Array(1))[0] >> 2 ]
    
    return res;
}

export let guestID;
function fetchGuestID() {
    guestID = getLocalData("guest id");
    return guestID;
}
function saveNewGuestID() {
    guestID = genID(14);
    setLocalData("guest id", guestID);
}

export function isGuest() { return data && user.uid === guestID; }

export let user = {

    uid: null,
    username: null,
    password: null,
    hash1: null,

    /** when encrypting filenames, the same filename should create the same ciphertext every time. so, a constant iv is used  */
    iv: null,
    key: null,
    
    setInfo(uid, username, password, hash1) {
        if (uid === "guest") {
            if (!guestID && !fetchGuestID() ) {
                console.log("no guest id, making one");
                saveNewGuestID();
            }
            uid = guestID;
            username = "";
        }
        else this.setPassword(password, hash1);
        
        this.setUID(uid);
        this.setUsername(username);
    },
    setUID(uid) {
        this.uid = uid;
        global.userDir = global.resources + "/users/" + uid;
    },
    setUsername(username) {
        this.username = username;
        updateForUsername(username, isGuest());
    },
    async setPassword(password, hash1) {
        this.password = password;
        this.key = await deriveBytes(password, 32);
        this.iv = await deriveBytes(password, 16)
        this.hash1 = hash1 ?? createHash("sha256").update(password).digest("hex");    
    },

    clearInfo() {
        this.setUID(null);
        this.setUsername(null);
        this.setPassword(null);
    },

    async saveLocal() {
        setLocalData("uid", isGuest()? "guest" : this.uid);
        setLocalData("username", isGuest()? null : this.username);
        await encryptLocalData("key", isGuest()? null : this.password);
    }
}

export async function loadAcc(uid, username, password) {
    user.setInfo(uid, username, password);
    await loadLocaldata(user.uid);
    watchFiles(global.userDir + "/songs");
}

window.addEventListener("load", async () => {

    const uid = getLocalData("uid");
    if (!uid) return;

    const username = getLocalData("username");
    const password = await decryptLocalData("key");
    console.log("saved pass: ", password);

    await loadAcc(uid, username, password);
    
    setTitleScreen(false);

    if (!isGuest()) getDoomed();
});

ipcRenderer.on("cleanup", async () => {
    if (data) {
        await data.saveDataLocal();
        if (data.settings["stay-signed-in"]) await user.saveLocal();
    }
    console.log("done");
    ipcRenderer.send("cleanup-done");
});

/** @returns {Promise<"username taken" | "success">} */
export async function createAccData(username, password) {
    const fromGuest = isGuest();
    console.log("fromGuest", fromGuest);

    const uid = fromGuest? guestID : genID(14);
    const hash1 = createHash("sha256").update(password).digest("hex");
    
    // create account at server
    const res = await fetch(`https://localhost:5001/create-account-dir/${uid}`, {
        method: "POST",
        body: JSON.stringify({
            username: username,
            hash1: hash1
        }),
        headers: {
            "Content-Type": "application/json"
        },
    }).catch(fetchErrHandler);
    if (!res) return;

    if (res.status === 409) return "username taken";

    // i was going to clear guest id here, but might as well save a new one
    if (fromGuest) saveNewGuestID();

    if (!fromGuest) await loadLocaldata(uid);
    user.setInfo(uid, username, password, hash1);

    watchFiles(global.userDir + "/songs")

    return "success";
}

/** @returns {Promise<"username not found" | "unauthorized" | "success">} */
export async function fetchAccData(username, password) {

    const hash1 = createHash("sha256").update(password).digest("hex");

    const res = await fetch("https://localhost:5001/sign-in", {
        method: "POST",
        body: JSON.stringify({
            username: username,
            hash1: hash1
        }),
        headers: {
            "Content-Type": "application/json"
        }
    }).catch(fetchErrHandler);
    if (!res) return;

    if (res.status === 404) return "username not found";
    if (res.status === 401) return "wrong password"

    await loadAcc(await res.text(), username, password, hash1);

    return "success";
}

/** [stack overflow link](https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library) */
// export function parseJWT(jwt) {    
//     const base64Url = jwt.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
//         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
//     }).join(''));

//     return JSON.parse(jsonPayload);
// }


export function fetchErrHandler(err) {
    if (err.message === "Failed to fetch")
        sendNotification("can't connect to server", "var(--error-color)");
}