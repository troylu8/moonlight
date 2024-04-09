
const express = require('express');
const fs = require('fs');

const router = express.Router();

router.post("/create-account-dir/:uid", (req, res) => {

    // simply rename the guest directory to the user
    // a new guest directory will be created when needed
    fs.rename(
        `${__dirname}/public/resources/users/guest`,
        `${__dirname}/public/resources/users/${req.params["uid"]}`,
        (err) => res.end()
    )
})

router.get("/read-userdata/:uid", async (req, res) => {
    const userDir = `${__dirname}/../public/resources/users/${req.params["uid"]}`;
    await ensureUserDir(userDir);
    
    fs.readFile(
        userDir + "/userdata.json", 
        "utf8", 
        (err, data) => res.json(JSON.parse(data))
    )
})

router.delete("/:uid/:songFilename", (req, res) => {

    const path = (req.params["songFilename"].startsWith("yt")) ?
        `${__dirname}/../public/resources/yt/${req.params["song"]}` :
        `${__dirname}/../public/resources/users/${req.params["uid"]}/songs/${req.params["song"]}`;
    
    fs.unlink(path, () => res.end());
})

router.use("/save-userdata", express.text())
router.put("/save-userdata/:uid", async (req, res) => {
    const userDir = `${__dirname}/../public/resources/users/${req.params["uid"]}`;
    await ensureUserDir(userDir);

    fs.writeFile(
        userDir + "/userdata.json",
        req.body, 
        (err) => res.end()
    );
})

async function ensureUserDir(userDir) {
    try {
        await fs.promises.writeFile(userDir + "/userdata.json", "", {flag: "ax"});
        return false;
    } catch (err) {
        if (err.code === "EEXIST") return true;

        await fs.promises.mkdir(userDir, {recursive: true});
        await fs.promises.writeFile(userDir + "/userdata.json",
           `{
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
            }`,
        "utf8");
        
        return false;
    }
}

module.exports = router;