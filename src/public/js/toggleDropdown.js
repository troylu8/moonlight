import { tracking } from "./newSong.js";

const add = document.getElementById("new");
const dropdown = document.getElementById("new-song-dropdown");

let visible = false;

add.addEventListener("click", (e) => {
    if (e.target !== add) return;
    
    if (visible) {
        if (!tracking) close();
    }
    else open();
});

document.body.addEventListener("mousedown", (e) => {
    if (visible && !tracking && !add.contains(e.target)) {
        close();
    }
})

export function open() {
    dropdown.style.display = "flex";
    visible = true;
}
export function close() {
    dropdown.style.display = "none";
    visible = false;
}