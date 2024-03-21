const fs = require('fs');


let userdata;

// playlistid -> set of songs
const playlists = new Map();

fs.readFile("./public/resources/userdata.json",  "utf8", (err, data) => {
    userdata = JSON.parse(data);

    for (const id in userdata.songs) {
        console.log(id);
        loadSong(userdata.songs[id])
    }
        
})

/** convert playlistIDs to set, add to playlists, add to userdata.songs */
function loadSong(song) {
    song.playlistIDs = new Set(song.playlistIDs);

    for (const pid of song.playlistIDs) {
        playlists.set(pid, (playlists.get(pid) ?? new Set()).add(song));       
    }

    if (song.id !== undefined) {
        console.log(song.id + " is being written");
        userdata.songs[song.id] = song;
    }
        
}

function deleteSong(id) {
    const song = userdata.songs[id];

    for (const pid of song.playlistIDs) 
        playlists.get(pid).delete(song);

    delete userdata.songs[id];
}

function saveData(cb) {
    
    fs.writeFile(
        "./public/resources/userdata.json", 
        JSON.stringify(userdata, 
            (key, value) => {
                if (value instanceof Set) return Array.from(value);
                if (key === "id" || key === "size") return undefined;
                return value;
            },
            4
        ),
        (err) => { cb(); }
    )
}


const express = require('express');
const router = express.Router();

router.put("/save", (req, res) => {
    saveData(() => res.end("saved"));
});
router.get("/test-print-playlists", (req, res) => {
    for (const entry of playlists) {
        console.log(userdata.playlistNames["" + entry[0]]);
        console.log(Array.from(entry[1]).map(e => e.title));
    }
    res.end("printed")
})

module.exports = {loadSong, deleteSong, saveData, router};