const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const db = require('better-sqlite3')(__dirname + "/../users.db");


const router = express.Router();

db.pragma('journal_mode = WAL'); 
db.prepare("CREATE TABLE IF NOT EXISTS users (uid TEXT, username TEXT, hash TEXT, userdata TEXT)").run();

const secretKey = fs.readFileSync(__dirname + "/../auth/secret.key", "utf8");
console.log("secretkey:", secretKey);

const createJWT = promisify(jwt.sign);
const verifyJWT = promisify(
    (someJWT, cb) => jwt.verify(someJWT, secretKey, cb)
);


function exists(searchColumn, value) {
    return db.prepare("SELECT uid FROM users WHERE ?=?").get(searchColumn, value) != undefined;
}

router.post("/create-account-dir/:uid", express.json(), async (req, res) => {
    if (exists("username", req.body.username)) return res.status(409).end("username taken");

    db.prepare("INSERT INTO users VALUES ( ?,?,?,? )").run(
        req.params["uid"],
        req.body.username,
        await bcrypt.hash(req.body.password, 11),
        JSON.stringify({
            "playlists": {},
            "songs": {}
        }),
    );
    res.status(200).end(await createJWT({uid: req.params["uid"], username: req.body.username}, secretKey));
});

router.post("/sign-in", express.json(), async (req, res) => {
    const row = db.prepare("SELECT uid, hash FROM users WHERE username=?").get(req.body.username);
    if (!row) return res.status(404).end();

    if (await bcrypt.compare(req.body.password, row.hash))   
        res.status(200).end(await createJWT({uid: row.uid, username: req.body.username}, secretKey));
    else 
        res.status(401).end();
});

router.put("/change-username/:uid", express.json(), async (req, res) => {
    const row = db.prepare("SELECT hash FROM users WHERE uid=?").get(req.params["uid"]);
    if (!row) return res.status(404).end();

    if (await bcrypt.compare(req.body.password, row.hash)) {
        if ( db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username) )
            return res.status(409).end();

        db.prepare("UPDATE users SET username=? WHERE uid=?").run(req.body.username, req.params["uid"]);
        res.status(200).end();
    }
    else res.status(401).end();
});

router.put("/change-password/:uid", express.json(), async (req, res) => {
    const row = db.prepare("SELECT hash FROM users WHERE uid=?").get(req.params["uid"]);
    if (!row) return res.status(404).end();

    if (await bcrypt.compare(req.body.oldPassword, row.hash)) {

        db.prepare("UPDATE users SET hash=? WHERE uid=?").run(
            await bcrypt.hash(req.body.newPassword, 11),
            req.params["uid"]
        );
        res.status(200).end();
    }
    else res.status(401).end();
});

router.post("/set-hash/:jwt", express.text(), async (req, res) => {

    let decoded;
    try { decoded = await verifyJWT(req.params["jwt"]); }
    catch (err) { return res.status(401).end(); }

    db.prepare("UPDATE users SET hash=? WHERE uid=?").run(
        await bcrypt.hash(req.body, 11), 
        decoded.uid
    );
    
    res.status(200).end("edited hash");
    
});

router.get("/get-data/:jwt", express.text(), async (req, res) => {

    let decoded;
    try { decoded = await verifyJWT(req.params["jwt"]); }
    catch (err) { return res.status(401).end(); }

    const row = db.prepare("SELECT userdata FROM users WHERE uid=?").get(decoded.uid);
    if (!row) return res.status(404).end();

    res.status(200).json(JSON.parse(row.userdata));
    
});

router.put("/upload-data/:jwt", express.json(), async (req, res) => {

    let decoded;
    try { decoded = await verifyJWT(req.params["jwt"]); }
    catch (err) { return res.status(401).end(); }

    db.prepare("UPDATE users SET userdata=? WHERE uid=?").run(req.body.userdata, decoded.uid);
    res.status(200).end();
    
});



module.exports = { router, db, verifyJWT };