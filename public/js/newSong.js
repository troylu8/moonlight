console.log("V0BwILbJDOY");

const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");

let loading = false;

async function getyt(link) {
    if (!isValidLink(link)) {
        input.style.color = "red";
        console.log("invalid link");
        return;
    }
    const id = getYTID(link);

    if ( !(await videoExists(id)) ) {
        input.style.color = "red";
        console.log("video doesnt exist");
        return;
    }

    loading = true;
    button.innerText = "x";
    loadingBar.style.opacity = "1";
    setLoadingBar(0.05);

    const updateLoadingBar = setInterval( async () => {

        const percent = await fetch("http://127.0.0.1:5000/getyt/loaded");
        
        if (!loading) return clearInterval(updateLoadingBar) // loading turned false while fetch response was on its way back
        
        const n = Number(await percent.text())
        console.log("received " + n);
        setLoadingBar(Math.max(n, 0.05));
    }, 50); 

    console.log("starting getyt");
    const res = await fetch("http://127.0.0.1:5000/getyt/ytid/" + id);
    
    if (res.status === 200) setLoadingBar(1);
    stopLoadingBarUpdates();
    button.innerText = "ent";

    console.log(await res.text());
}

function stopLoadingBarUpdates() {
    loading = false;
    setTimeout(() => {
        loadingBar.style.opacity = "0";
        setTimeout(() => setLoadingBar(0), 300);
    }, 500)
}

async function destroy() {
    button.innerText = "...";
    const res = await fetch("http://127.0.0.1:5000/getyt/destroy");
    console.log(res);
    button.innerText = "ent";

    stopLoadingBarUpdates();
    loading = false;
}

button.onclick = () => {
    if (loading) destroy();
    else         getyt(input.value);
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

// document.getElementById("next").onclick = async () => {
//     const percent = await fetch("http://127.0.0.1:5000/getyt/loaded");
//     console.log(await percent.json());
// }

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


const uploadInput = document.getElementById("song-upload__input");
const uploadSubmit = document.getElementById("song-upload__submit");
uploadInput.addEventListener("change", () => {
    uploadSubmit.click();
})