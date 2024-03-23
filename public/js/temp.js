import * as userdata from "./userdata.js";

document.getElementById("next").onclick = () => {
    console.log("saving data");
    userdata.saveData();
}