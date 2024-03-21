const fs = require('fs');

// playlistid -> list of songs
const playlists = new Map();

let userdata;
fs.readFile("./public/resources/userdata.json", "utf8", (err, data) => {
    userdata = JSON.parse(data);

    for (const pid in userdata.playlistNames) 
        playlists.set(Number(pid), new Set());
    
    for (const id in userdata.songs) 
        loadSong(userdata.songs[id])

})

/** convert playlistIDs to set, add to playlists, add to userdata.songs */
function loadSong(song) {
    song.playlistIDs = new Set(song.playlistIDs);

    for (const pid of song.playlistIDs) 
        playlists.get(pid).add(song);

    if (userdata.songs[song.id] === undefined)
        userdata.songs[song.id] = song;
}

function deleteSong(id) {
    const song = userdata.songs[id];

    for (const pid of song.playlistIDs) 
        playlists.get(pid).delete(song);

    delete userdata.songs[id];
}

function saveData(cb) {
    console.log(userdata);
    fs.writeFile(
        "./public/resources/userdata.json", 
        JSON.stringify(userdata, 
            (_key, value) => value instanceof Set ? 
            Array.from(value) : value
        ),
        (err) => {
            console.log("saved");
            cb();
        }
    )
}

const express = require('express');
const router = express.Router();

router.put("/save", (req, res) => {
    saveData(() => res.end("saved"));
});

module.exports = { router, loadSong, deleteSong, saveData };