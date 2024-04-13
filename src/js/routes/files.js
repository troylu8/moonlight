
const express = require('express');
const fs = require('fs');
const { QuickDB } = require("quick.db");
const cipher = require("../cipher.js");
const { readFileOrDefault, ensurePathThen } = require('../util.js');

const guestbook = new QuickDB({filePath: __dirname + "/../../public/resources/guestbook.sqlite"});

const router = express.Router();

const defaultUserData = JSON.stringify({
        "settings": {
            "shuffle": false,
            "volume": 0.5
        },
        "curr": {
            "listenPlaylist": "none"
        },
        "trashqueue": [],
        "playlists": {},
        "songs": {}
    }, 
    undefined, 4
);

router.get("/guest-id", async (req, res) => {
    res.end(await guestbook.get("guest id"));
})
router.put("/guest-id/:id", async (req, res) => {
    res.end(await guestbook.set("guest id", req.params["id"]));
})

router.get("/get-cached", async (req, res) => {
    const cache = await guestbook.get("cache");
    if (!cache) return res.status(404).end();

    const decrypted = cipher.decrypt(cache);
    res.end(decrypted);
})
router.put("/cache", express.text(), (req, res) => {
    if (typeof req.body !== "string") {
        guestbook.delete("cache");
    }    
    else {
        const encrypted = cipher.encrypt(req.body);
        guestbook.set("cache", encrypted);
    }
    
    res.end();
})


router.get("/read-userdata/:uid", async (req, res) => {

    const data = await readFileOrDefault(
        `${__dirname}/../public/resources/users/${req.params["uid"]}/userdata.json`,
        defaultUserData
    )
    res.json(JSON.parse(data));
})

router.delete("/:uid/:songFilename", (req, res) => {
    
    fs.unlink(
        `${__dirname}/../public/resources/users/${req.params["uid"]}/songs/${req.params["song"]}`,
        () => res.end()
    );
})

router.use("/save-userdata", express.text())
router.put("/save-userdata/:uid", async (req, res) => {

    await ensurePathThen( 
        async () => await fs.promises.writeFile(
            `${__dirname}/../public/resources/users/${req.params["uid"]}/userdata.json`, 
            req.body,
            "utf8"
        )
    );
    res.end();
})

module.exports = router;