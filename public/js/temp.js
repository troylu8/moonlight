import * as userdata from "./userdata.js";
import * as play from "./play.js";

document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.data.saveData();
}

document.body.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "a":
            userdata.data.curr.listenPlaylist.cycle.print();
            break;
        case "c":
            console.log(userdata.data.curr.song);
            break;
        case "l":
            console.log(userdata.data.curr.listenPlaylist.cycle.last);
            break;
        case "q":
            console.log(userdata.data);
            break;
        case "h":
            if (!play.history) return console.log(" history is null ");
            console.log(play.historyIndex, play.history.map(id => userdata.data.songs.get(id).title));
            break;
    }
    
})