
const input = document.getElementById("input");

input.addEventListener("keypress", async (e) => {
    if (e.key !== "Enter") return;
    
    if (!isValidLink(input.value)) {
        console.log("invalid link");
        return;
    }

    const res = await fetch("http://127.0.0.1:5000/getyt/" + getYTID(input.value));
    console.log(await res.text());
})

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
