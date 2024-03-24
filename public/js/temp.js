import * as userdata from "./userdata.js";

document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.saveData();
}