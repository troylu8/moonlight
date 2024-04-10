
const express = require('express');
const fs = require('fs');
const { dirname } = require('path');

const router = express.Router();

router.get("guest-id", (req, res) => {
    fs.readFile(`${__dirname}/../public/resources/guestID.txt`, "utf8", (err, data) => {
        if (err) throw err;
        res.end(data);
    })
})

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

    await createAndWriteFile(
        `${__dirname}/../public/resources/users/${req.params["uid"]}/userdata.json`,
        req.body
    )
    res.end();
})

/** read file, or create file with default text if doesnt exist */
async function readFileOrDefault(path, defaultString) {
    try {
        return await fs.promises.readFile(path, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            createAndWriteFile(path, defaultString);
            return defaultString;
        }
    }
}

/** creates file if it doesnt exist */
async function createAndWriteFile(path, data) {
    try {
        await fs.promises.writeFile(path, data, "utf8");
    } catch (err) {
        if (err.code === "ENOENT") {
            await fs.promises.mkdir(dirname(path), {recursive: true});
            await fs.promises.writeFile(path, data, "utf8");
        }
    }
}

module.exports = router;