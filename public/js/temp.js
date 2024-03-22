import * as userdata from "./userdata.js";

console.log("aaa");

document.getElementById("next").onclick = () => {
    console.log("saving data");
    userdata.saveData();
}
document.getElementById("prev").onclick = () => {
    console.log("printing playlists");
    userdata.printPlaylists();
}