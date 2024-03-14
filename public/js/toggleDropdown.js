const add = document.getElementById("new");
const dropdown = document.getElementById("new-song-dropdown");

let visible = false;

add.addEventListener("click", (e) => {
    if (e.target === add) {
        dropdown.style.visibility = visible? "hidden" : "visible";
        visible = !visible;   
    }
     
});
