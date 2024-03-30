const express = require('express');
const fs = require('fs');
const { join } = require("path");
const bcrypt = require('bcrypt');

const router = express.Router();

router.post("/create-account-dir/:username", (req, res) => {
    fs.mkdir(join(__dirname, "users", req.params["username"]), (err) => {
        res.status((err && err.code === "EEXIST")? 409 : 200).end();
    })
})

router.use("/set-hash", express.text());
router.post("/set-hash/:username", async (req, res) => {
    
    fs.writeFile(
        join(__dirname, "users", req.params["username"], "hash.txt"), 
        await bcrypt.hash(req.body, 11), 
        (err) => { res.status(err? 500 : 200).end() }
    )
    
})

router.use("/get-data", express.text());
router.post("/get-data/:username", async (req, res) => {

    const userDir = join(__dirname, "users", req.params["username"]);
    
    const passMatches = await comparePass(req.body, userDir);
    if (passMatches === "no user") return res.status(404).end();

    if (passMatches === "success") {
        const json = await fs.promises.readFile(join(userDir, "data.json"),"utf-8");
        res.status(200).json(JSON.parse(json));
    }
    else res.status(401).end();
});

router.use("/upload-data", express.json());
router.put("/upload-data/:username", async (req, res) => {

    const userDir = join(__dirname, "users", req.params["username"]);
    
    const passMatches = await comparePass(req.body.pass, userDir);
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

async function comparePass(pass, userDir) {
    try {
        const hash = await fs.promises.readFile(join(userDir, "hash.txt"), "utf8");
        return (await bcrypt.compare(pass, hash))? "success" : "wrong pass";
    } catch (err) {
        if (err.code === "ENOENT") return "no user";
    }
}


module.exports = router;