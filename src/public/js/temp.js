import * as userdata from "./userdata.js";
import * as play from "./play.js";
import * as sync from "./account.js";
import { setTitleScreen } from "./signinElems.js";
import { settings } from "./settings.js";

document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.data.saveDataLocal();
}

document.body.addEventListener("keydown", async (e) => {
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
        case "I":
            console.log({
                gid: sync.guestID,
                uid: sync.uid,
                jwt: sync.jwt,
                username: sync.username
            });
            break;
        case "T":
            setTitleScreen(true);
            break;
        case "Y":
            setTitleScreen(false);
            break;
        case "S":
            console.log(settings);
            break;
    }
    
})