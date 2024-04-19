import Dropdown from "./dropdown.js"
import * as songSettings from "./songSettings.js"
import { data, Song } from "./userdata.js";
import { uid } from "./account.js";
import genID from "./id.js";


const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");
const error = document.getElementById("new__error");


/** between dings from getyt and destroy, button is disabled */
let enabled = true;
/** if true, loading bar active. determines whether button sends getyt or destroy, and stops loading bar  */
export let tracking = false;

let updateLoadingBarID;

async function getyt(link) {
    link = link.trim();
    
    if (!isValidLink(link)) return error.showError("invalid link");

    const ytid = getYTID(link);

    //TODO: enable this
    // if ( data.songs["yt" + id] !== undefined ) return error.showError("yt video already downloaded");

    setButtonEnabled(false, "...");
    
    if ( !(await videoExists(ytid)) ) {
        error.showError("video doesn't exist");
        return setButtonEnabled(true, "get");
    }
    
 
    tracking = true;
    loadingBar.style.opacity = "1";
    setLoadingBar(0.05);

    updateLoadingBarID = setInterval( async () => {

        const percent = await fetch("http://localhost:5000/getyt/loaded");

        const progress = Number(await percent.text());
        console.log("received " + progress);
        setLoadingBar(Math.max(progress, 0.05));
    }, 50);

    
    await fetch("http://localhost:5000/getyt/ready");

    setButtonEnabled(true, "x");
    

    const res = await fetch(`http://localhost:5000/getyt/ytid/${ytid}/${uid}`);
    console.log("download ended");

    if (res.status === 200) { // video downloaded fully
        setLoadingBar(1);
        stopLoading(true);
        button.textContent = "get";

        acceptSongResponse(res);
    }

}

/** add to data.songs, add to current playlist, open settings */
async function acceptSongResponse(fetchResponse) {
    const songJSON = JSON.parse(await fetchResponse.json());
    
    const song = new Song(songJSON.id, songJSON)

    const songElems = song.addToPlaylist(data.curr.viewPlaylist); 

    songSettings.openSongSettings(song, songElems[1], songElems[2]);
}

const dropdown = new Dropdown(
    document.getElementById("new"), 
    document.getElementById("new__dropdown"),
    {
        allowClose: () => !tracking,
        onclose: () => error.textContent = ""
    }
);

function stopLoading(closeDropdown) {
    tracking = false;
    setTimeout(() => {
        loadingBar.style.opacity = "0";
        setTimeout(() => {  // wait for transition time before resetting loading bar
            setLoadingBar(0);
            if (closeDropdown) dropdown.close();

            console.log("stopped loading");
        }, 300);
    }, 200);
    
    return clearInterval(updateLoadingBarID);
}

function setButtonEnabled(val, text) {
    enabled = val;
    button.textContent = text;
}

async function destroy() {
    stopLoading(false);

    setButtonEnabled(false, "...");
    await fetch("http://localhost:5000/getyt/destroy");
    setButtonEnabled(true, "get");
}

button.onclick = () => {
    if (!enabled) return console.log("can't click now!");

    if (tracking) destroy();
    else {
        if (!data.curr.viewPlaylist) return error.showError("select a playlist to add song");
        getyt(input.value);
    } 
}

input.onkeydown = (e) => {
    if (e.key === "Enter") getyt(input.value);
}

const loadingBar = document.getElementById("loading-bar");
function setLoadingBar(percent) {
    loadingBar.style.width = percent * 100 + "%";
}

async function videoExists(id) {
    const res = await fetch("https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" + id);
    return res.status === 200; 
}

/** 
 * @param {string} input yt link 
 */
function isValidLink(input) {
    return  /^([0-9a-z]|-|_){11}$/i.test(input)  || // yt id 
            input.startsWith("https://www.youtube.com/watch?v=") ||
            input.startsWith("www.youtube.com/watch?v=") || 
            input.startsWith("youtube.com/watch?v=") || 
            input.startsWith("youtu.be/watch?v=")
}

/** 
 * @param {string} link yt link 
 */
function getYTID(link) { return link.slice(-11); }


const fileInput = document.getElementById("song-upload__input");


document.getElementById("song-upload").addEventListener("click", () => {
    if (!data.curr.viewPlaylist) return error.showError("select a playlist to add song");
    fileInput.click()
} );

fileInput.addEventListener("change", async () => {
    const res = await fetch(`http://localhost:5000/upload/${uid}/${genID(14)}`, {
        method: "POST",
        body: fileInput.value
    });
    if (res.status === 200) acceptSongResponse(res);
});