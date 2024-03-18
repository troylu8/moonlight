console.log("V0BwILbJDOY");

const input = document.getElementById("paste-link__input");
const button = document.getElementById("paste-link__btn");

/** between dings from getyt and destroy, button is disabled */
let enabled = true;
/** determines whether button sends getyt or destroy, and stops loading bar  */
let tracking = false;

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

    enabled = false;
    button.innerText = "...";
    tracking = true;
    loadingBar.style.opacity = "1";
    setLoadingBar(0.05);

    const updateLoadingBar = setInterval( async () => {

        const percent = await fetch("http://127.0.0.1:5000/getyt/loaded");
                
        if (!tracking || percent.status === 205) { // not tracking anymore
            console.log(tracking);
            button.innerText = "ent";

            if (tracking) setLoadingBar(1); // if finished loading without cancelling
            setTimeout(() => {
                loadingBar.style.opacity = "0";
                setTimeout(() => setLoadingBar(0), 300); // wait for transition time before resetting loading bar
            }, 200);
            
            tracking = false;
            return clearInterval(updateLoadingBar);
        }

        const progress = Number(await percent.text());
        console.log("received " + progress);
        setLoadingBar(Math.max(progress, 0.05));
    }, 50);

    await fetch("http://127.0.0.1:5000/getyt/ytid/" + id);

    enabled = true;
    button.innerText = "x";
}

async function destroy() {
    enabled = false;
    button.innerText = "...";
    tracking = false;

    await fetch("http://127.0.0.1:5000/getyt/destroy");

    enabled = true;
    button.innerText = "ent";
}

button.onclick = () => {
    if (!enabled) return console.log("can't click now!");

    if (tracking) destroy();
    else          getyt(input.value);
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