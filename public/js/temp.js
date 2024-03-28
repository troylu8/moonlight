import * as userdata from "./userdata.js";
import * as play from "./play.js";

document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.data.saveDataLocal();
}

document.body.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "A":
            userdata.data.curr.listenPlaylist.cycle.print();
            break;
        case "C":
            console.log(userdata.data.curr.song);
            break;
        case "L":
            console.log(userdata.data.curr.listenPlaylist.cycle.last);
            break;
        case "Q":
            console.log(userdata.data);
            break;
        case "H":
            if (!play.history) return console.log(" history is null ");
            console.log(play.historyIndex, play.history.map(id => userdata.data.songs.get(id).title));
            break;
    }
    
})