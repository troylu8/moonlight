const express = require('express');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { QuickDB } = require('quick.db');
const jwt = require('jsonwebtoken');

const router = express.Router();
const uidDB = new QuickDB({filePath: __dirname + "/../uids.sqlite"});
const usersDB = new QuickDB({filePath: __dirname + "/../db.sqlite"});

const secretKey = fs.readFileSync(__dirname + "/auth/secret.key", "utf8");
console.log("secretkey:", secretKey);

router.post("/create-account-dir/:uid/:username", async (req, res) => {
    if (await uidDB.has(req.params["username"])) return res.status(409).end("username taken");
        
    await uidDB.set(req.params["username"], req.params["uid"]);
    await usersDB.set(req.params["uid"] + ".userdata", {
        "playlists": {},
        "songs": {}
    })

    res.status(200).end(createJWT(req.params["uid"]));
})

router.post("get-jwt/:username", express.text(), async (req, res) => {
    const uid = await uidDB.get(req.params["username"]);

    const verifyRes = await verifyPass(uid, req.body);
    if (verifyRes === "wrong pass") return res.status(401).end();
    if (verifyRes === "no user")    return res.status(404).end();

    res.end(createJWT(uid));
})

function createJWT(uid) {
    jwt.sign({uid: uid}, secretKey, (err, encoded) => {
        if (err) throw err;
        return encoded;
    })
}

router.post("/set-hash/:jwt", express.text(), async (req, res) => {
    
    const uid = jwt.decode(req.params["jwt"]).uid;

    if (await uidDB.has(uid)) {
        jwt.verify(req.params["jwt"], secretKey, async (err, payload) => {
            if (err) return res.status(401).end();

            await usersDB.set(uid + ".hash", await bcrypt.hash(req.body, 11));
            res.status(200).end("edited hash")
        })
    }
    else {
        await usersDB.set(uid + ".hash",  await bcrypt.hash(req.body, 11));
        res.status(200).end("added hash")
    }
    
})

router.get("/get-data/:jwt", express.text(), async (req, res) => {

    jwt.verify(req.params["jwt"], secretKey, async (err, payload) => {
        if (err) return res.status(401).end();

        res.status(200).json(await usersDB.get(payload.uid + ".userdata"));
    })

});

router.put("/upload-data/:jwt", express.json(), async (req, res) => {

    jwt.verify(req.params["jwt"], secretKey, async (err, payload) => {
        if (err) return res.status(401).end();

        await usersDB.set(payload.uid + ".userdata", req.body.userdata);
        res.status(200).end();
    })
    
})




/** @returns {Promise<"success"  | "wrong pass" | "no user">} */
async function verifyPass(uid, pass) {
    try {
        const hash = await usersDB.get(uid + ".hash");
        return (await bcrypt.compare(pass, hash))? "success" : "wrong pass";
    } catch (err) {
        if (err.code === "ENOENT") return "no user";
    }
}


module.exports = router;