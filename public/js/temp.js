import * as userdata from "./userdata.js";
import * as play from "./play.js";

document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.saveData();
}

document.body.addEventListener("keydown", (e) => {
    if (e.key === "a") {
        play.SongNode.print();
    }
    if (e.key === "q") {
        console.log(userdata.data);
    }
})