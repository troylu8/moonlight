console.log("V0BwILbJDOY");

const input = document.getElementById("paste-link");

const loadingBar = document.getElementById("loading-bar");

input.addEventListener("keypress", async (e) => {
    if (e.key !== "Enter") return;
    
    if (!isValidLink(input.value)) {
        console.log("invalid link");
        return;
    }

    let loading = true;

    loadingBar.style.opacity = "1";
    setLoadingBar(0.05);

    const updateLoadingBar = setInterval( async () => {
        if (!loading) return;

        const percent = await fetch("http://127.0.0.1:5000/loaded");
        const n = Number(await percent.text())
        console.log("received " + n);
        setLoadingBar(Math.max(n, 0.05));
    }, 50); 

    console.log("starting getyt");
    const res = await fetch("http://127.0.0.1:5000/getyt/" + getYTID(input.value));

    loading = false;
    clearInterval(updateLoadingBar);

    console.log(await res.text());

    setLoadingBar(1);
    setTimeout(() => {
        loadingBar.style.opacity = "0";
        setTimeout(() => setLoadingBar(0), 300);
    }, 500)
})

function setLoadingBar(percent) {
    loadingBar.style.width = percent * 100 + "%";
}
let percent = 0.5;
document.getElementById("prev").onclick = () => setLoadingBar(percent -= 0.5);
document.getElementById("next").onclick = async () => {
    const percent = await fetch("http://127.0.0.1:5000/loaded");
    console.log(await percent.json());
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
