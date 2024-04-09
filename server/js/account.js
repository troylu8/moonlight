const express = require('express');
const fs = require('fs');
const { join } = require("path");
const bcrypt = require('bcrypt');
const { QuickDB } = require('quick.db');

const router = express.Router();
const uidDB = new QuickDB({filePath: __dirname + "/../uids.sqlite"});

router.post("/create-account-dir/:uid/:username", async (req, res) => {
    if (await uidDB.has(req.params["username"])) return res.status(409).end("username taken");

    const userDir = join(__dirname, "/../users/", req.params["uid"]);

    fs.mkdir(userDir, async (err) => {
        if (err) throw err;
        
        // initialize data.json
        await fs.promises.writeFile( 
            join(userDir, "data.json"),
            JSON.stringify({
                "playlists": {},
                "songs": {}
            }),
            "utf8"
        );
        
        await uidDB.set(req.params["username"], req.params["uid"]);

        res.status(200).end();
    })
})

router.get("/get-uid/:username", async (req, res) => {
    const uid = await uidDB.get(req.params["username"]);
    res.status(uid? 200 : 404).end(uid);
})

router.use("/set-hash", express.text());
router.post("/set-hash/:uid", async (req, res) => {
    
    fs.writeFile(
        join(__dirname, "/../users", req.params["uid"], "hash.txt"), 
        await bcrypt.hash(req.body, 11), 
        (err) => { res.status(err? 500 : 200).end() }
    )
    
})

router.use("/get-data", express.text());
router.post("/get-data/:uid", async (req, res) => {

    const userDir = join(__dirname, "../users", req.params["uid"]);

    const passMatches = await comparePass(req.body, userDir);
    if (passMatches === "no user") return res.status(404).end();

    if (passMatches === "success") {
        const json = await fs.promises.readFile(join(userDir, "data.json"),"utf-8");
        res.status(200).json(JSON.parse(json));
    }
    else res.status(401).end();
});

router.use("/upload-data", express.json());
router.put("/upload-data/:uid", async (req, res) => {

    const userDir = join(__dirname, "users", req.params["uid"]);
    
    const passMatches = comparePass(req.body.pass, userDir);
    if (passMatches === "no user") return res.status(404).end();
    
    if (passMatches === "success") {
        fs.writeFile(
            join(userDir, "data.json"),
            JSON.stringify(req.body.userdata),
            () => res.end("written")
        )
    }
    else res.status(401).end();
    
})


/** @returns {Promise<"success"  | "wrong pass" | "no user">} */
async function comparePass(pass, userDir) {
    try {
        const hash = await fs.promises.readFile(join(userDir, "hash.txt"), "utf8");
        return (await bcrypt.compare(pass, hash))? "success" : "wrong pass";
    } catch (err) {
        if (err.code === "ENOENT") return "no user";
    }
}


module.exports = router;