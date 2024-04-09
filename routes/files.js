
const express = require('express');
const fs = require('fs');
const { dirname } = require('path');

const router = express.Router();

router.post("/create-account-dir/:uid", (req, res) => {

    // simply rename the guest directory to the user
    // a new guest directory will be created when needed
    fs.rename(
        `${__dirname}/../public/resources/users/guest`,
        `${__dirname}/../public/resources/users/${req.params["uid"]}`,
        (err) => res.end()
    )
})

const defaultUserData = `
{
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
}`;

router.get("/read-userdata/:uid", async (req, res) => {

    const data = await readFileOrDefault(
        `${__dirname}/../public/resources/users/${req.params["uid"]}/userdata.json`,
        defaultUserData
    )
    res.json(JSON.parse(data));
})

router.delete("/:uid/:songFilename", (req, res) => {

    const path = (req.params["songFilename"].startsWith("yt#")) ?
        `${__dirname}/../public/resources/yt/${req.params["song"]}` :
        `${__dirname}/../public/resources/users/${req.params["uid"]}/songs/${req.params["song"]}`;
    
    fs.unlink(path, () => res.end());
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