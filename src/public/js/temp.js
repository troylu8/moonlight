import * as userdata from "./userdata.js";
import * as play from "./play.js";
import * as acc from "./account.js";
import { setTitleScreen } from "./signinElems.js";
import { settings } from "./settings.js";


const songs = ["LaEgpNBt-bQ","shyRW65dvn0","eSW2LVbPThw","rB7XFQgJHBI","p0s0_4KO9t4","lzHtVBFE9jU"]
console.log(songs.join(" "));


document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.data.saveDataLocal();
}
document.getElementById("info__artist").onclick = () => {
    
    if (acc.username && settings.get("stay-signed-in")) {

        console.log("caching jwt");

        fetch("http://localhost:5000/files/cache", {
            method: "PUT",
            body: acc.isGuest()? "guest" : acc.jwt
        })
    }
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
                gid: acc.guestID,
                uid: acc.uid,
                jwt: acc.jwt,
                username: acc.username
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
        case "Z":
            const h3 = document.getElementsByTagName("h3")[0];
            console.log(
                h3.textContent , h3.clientHeight, h3.getBoundingClientRect()
            );
            break;
    }
    
})