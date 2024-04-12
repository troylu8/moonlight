
const express = require('express');
const fs = require('fs');
const { dirname } = require('path');
const { QuickDB } = require("quick.db");

const guestbook = new QuickDB({filePath: `${__dirname}/../public/resources/guestbook.sqlite`});

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

/** read file, or create file with default text if doesnt exist */
async function readFileOrDefault(path, defaultString, encoding) {
    encoding = encoding ?? "utf8";
    
    try {
        return await fs.promises.readFile(path, encoding);
    } catch (err) {
        if (err.code === "ENOENT") {
            await fs.promises.mkdir(dirname(path), {recursive: true});
            await fs.promises.writeFile(path, defaultString, encoding);

            return defaultString;
        }
    }
}

async function ensurePathThen(func) {
    console.log("ensuring");
    try {
        return await func();
    } catch (err) {
        if (err.code === "ENOENT") {
            await fs.promises.mkdir(dirname(err.path), {recursive: true});
            return await func();
        }
        else throw err;
    }
} 

module.exports = router;
module.exports.ensurePathThen = ensurePathThen;