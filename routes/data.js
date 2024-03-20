const fs = require('fs');
const express = require('express');


let userdata;
fs.readFile("./public/resources/userdata.json", "utf8", (err, data) => {
    userdata = JSON.parse(data);
})

const songs = new Map();
const playlists = new Map();

class Song {
    constructor(id, src, title, artist, playlistIDs) {
        this.id = id;
        this.src = src;
        this.title = title;
        this.artist = artist;
        this.playlistIDs = playlistIDs ?? [];

        userdata.songs["" + id] = this;

        songs.set(id, this);
    }
}

class Playlist {
    constructor(id, title, songIDs) {
        this.id = id;
        this.title = title;
        this.songIDs = songIDs ?? [];

        playlists.set(id, this);
    }
}

const router = express.Router();

router.get("/song/:id", (req, res) => {
    res.send(songs.get(req.params["id"]));
})

module.exports = router;