import * as userdata from "./account/userdata.js";
import * as play from "./play.js";
import * as acc from "./account/account.js";
import { setTitleScreen } from "./view/signinElems.js";
import { missingFiles, writeSavedJWT } from "./account/files.js";


const songs = ["LaEgpNBt-bQ","shyRW65dvn0","eSW2LVbPThw","rB7XFQgJHBI","p0s0_4KO9t4","lzHtVBFE9jU"]
console.log(songs.join(" "));


document.getElementById("info__title").onclick = () => {
    console.log("saving data");
    userdata.data.saveDataLocal();
}
document.getElementById("info__artist").onclick = () => {
    if (userdata.data.settings["stay-signed-in"]) {
        console.log("caching jwt");
        writeSavedJWT(acc.isGuest()? "guest" : acc.jwt);
    }
}

document.body.addEventListener("keydown", async (e) => {
    switch (e.key) {
        case "A":
            userdata.data.curr.listenPlaylist.cycle.print();
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
        case "S":
            console.log(userdata.data.settings);
            break;
        case "Z":
            const serverJSON = await getData(jwt);
            getDoomed(serverJSON, "songs");
            getDoomed(serverJSON, "playlists");
            break;

        case "M":
            console.log(missingFiles);
            break;
        
    }
    
})