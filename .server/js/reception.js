const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const db = require('better-sqlite3')(__dirname + "/../users.db");

const createJWT = promisify(jwt.sign);

const router = express.Router();

db.pragma('journal_mode = WAL'); 
db.prepare("CREATE TABLE IF NOT EXISTS users (uid TEXT, username TEXT, hash TEXT, userdata TEXT)").run();

const secretKey = fs.readFileSync(__dirname + "/../auth/secret.key", "utf8");
console.log("secretkey:", secretKey);


function exists(searchColumn, value) {
    return db.prepare("SELECT uid FROM users WHERE ?=?").get(searchColumn, value) != undefined;
}

router.post("/create-account-dir/:uid/:username", express.text(), async (req, res) => {
    if (exists("username", req.params["username"])) return res.status(409).end("username taken");

    db.prepare("INSERT INTO users VALUES ( ?,?,?,? )").run(
        req.params["uid"],
        req.params["username"],
        await bcrypt.hash(req.body, 11),
        JSON.stringify({
            "playlists": {},
            "songs": {}
        }),
    );
    res.status(200).end(await createJWT({uid: req.params["uid"], username: req.params["username"]}, secretKey));
})

router.post("/sign-in/:username", express.text(), async (req, res) => {
    const row = db.prepare("SELECT uid, hash FROM users WHERE username=?").get(req.params["username"]);
    if (!row) return res.status(404).end();

    if (await bcrypt.compare(req.body, row.hash))   
        res.status(200).end(await createJWT({uid: row.uid, username: req.params["username"]}, secretKey));
    else 
        res.status(401).end();
})



router.post("/set-hash/:jwt", express.text(), (req, res) => {

    jwt.verify(req.params["jwt"], secretKey, async (err, decoded) => {
        if (err) return res.status(401).end();

        db.prepare("UPDATE users SET hash=? WHERE uid=?").run(
            await bcrypt.hash(req.body, 11), 
            decoded.uid
        );
        
        res.status(200).end("edited hash");
    });    
    
})

router.get("/get-data/:jwt", express.text(), (req, res) => {

    jwt.verify(req.params["jwt"], secretKey, (err, decoded) => {
        if (err) return res.status(401).end();

        const row = db.prepare("SELECT userdata FROM users WHERE uid=?").get(decoded.uid);
        if (!row) return res.status(404).end();

        console.log(row);
        res.status(200).json(row.userdata);
    })

});

router.put("/upload-data/:jwt", express.json(), (req, res) => {

    jwt.verify(req.params["jwt"], secretKey, (err, decoded) => {
        if (err) return res.status(401).end();

        db.prepare("UPDATE users SET userdata=? WHERE uid=?").run(req.body.userdata, decoded.uid);
        res.status(200).end();
    })
    
})


module.exports = router;