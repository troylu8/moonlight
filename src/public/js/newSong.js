import * as dropdown from "./toggleDropdown.js"
import * as songSettings from "./songSettings.js"
import { data, Song } from "./userdata.js";
import { uid } from "./sync.js";
import genID from "./id.js";

console.log("ORofRTMg-iY", "NRQRC_0ZQ00", "AqI97zHMoQw", "DXZPtndQw8U", "nmix0phrCVU");

const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");

/** between dings from getyt and destroy, button is disabled */
let enabled = true;
/** if true, loading bar active. determines whether button sends getyt or destroy, and stops loading bar  */
export let tracking = false;

let updateLoadingBarID;

async function getyt(link) {
    link = link.trim();
    
    if (!isValidLink(link)) 
        return showErrorMsg("invalid link");

    const ytid = getYTID(link);

    //TODO: enable this
    // if ( data.songs["yt" + id] !== undefined ) 
    //     return showErrorMsg("yt video already downloaded");

    setButtonEnabled(false, "...");
    
    if ( !(await videoExists(ytid)) ) {
        showErrorMsg("video doesnt exist");
        return setButtonEnabled(true, "ent");
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
        button.innerText = "ent";

        acceptSongResponse(res);
    }

}

/** add to data.songs, add to current playlist, open settings */
async function acceptSongResponse(fetchResponse) {
    const songJSON = JSON.parse(await fetchResponse.json());
    
    const song = new Song(songJSON.id ?? genID(14), songJSON)

    const songElems = song.addToPlaylist(data.curr.viewPlaylist); 

    songSettings.openSongSettings(song, songElems[1], songElems[2]);
}

function showErrorMsg(msg) {
    input.style.color = "red";
    console.log(msg);
}

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
    button.innerText = text;
}

async function destroy() {
    stopLoading(false);

    setButtonEnabled(false, "...");
    await fetch("http://localhost:5000/getyt/destroy");
    setButtonEnabled(true, "ent");
}

button.onclick = () => {
    if (!enabled) return console.log("can't click now!");

    if (tracking) destroy();
    else {
        if (data.playlists.size === 0) return console.log("no playlists to add song to!");
        getyt(input.value);
    } 
}

input.onkeydown = (e) => {
    input.style.color = "black";
    if (e.key !== "Enter") return;
    getyt(input.value);
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

document.getElementById("song-upload").addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async () => {
    if (data.playlists.size === 0) return console.log("no playlists to add song to!");

    const res = await fetch("http://localhost:5000/upload/" + uid, {
        method: "POST",
        body: fileInput.value
    });
    if (res.status === 200) acceptSongResponse(res);
});