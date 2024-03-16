const add = document.getElementById("new");
const dropdown = document.getElementById("new-song-dropdown");

let visible = false;

add.addEventListener("click", (e) => {
    if (e.target !== add) return;
    
    dropdown.style.display = visible? "none" : "flex";
    visible = !visible;
});

document.body.addEventListener("mousedown", (e) => {
    if (visible && !add.contains(e.target)) {
        dropdown.style.display = "none";
        visible = false;
    }
})