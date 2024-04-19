const express = require('express');
const fs = require('fs');
const { parseFile } = require('music-metadata');
const { ensurePathThen, pathExists } = require("../util.js");
const { basename, dirname, resolve } = require('path');

const router = express.Router();

/**  add the sid to end of filename */
function insertSID(path, sid) {
    const i = path.lastIndexOf(".");
    return path.substring(0, i) + " " + sid + path.substring(i);
}

router.post('/:uid/:sid', express.text(), async (req, res) => {
    const path = req.body;

    if (isStraggler(path, req.params["uid"])) {
        // return 
    }
    
    let dest = `${global.resources}/users/${req.params["uid"]}/songs/${basename(path)}`;
    if (pathExists(dest)) dest = insertSID(dest, req.params["sid"]);

    const data = await fs.promises.readFile(path);

    ensurePathThen(async () => {
        
        await fs.promises.writeFile(dest, data);
        
        res.status(200).json(JSON.stringify( {
            id: req.params["sid"],
            filename: basename(dest),
            title: basename(dest).replace(/\.[^\/.]+$/, ""), // regex to remove extensions
            artist: "uploaded by you",
            size: (await fs.promises.stat(req.body)).size,
            duration: (await parseFile(req.body)).format.duration
        } ))
    })
    
});

router.put("/resolve-songfile/:sid/:uid", express.text(), (req, res) => {
    const path = req.body;

    if (isStraggler(path, req.params["uid"])) return res.end(basename(path));
    

    let dest = `${global.resources}/users/${req.params["uid"]}/songs/${basename(path)}`;
    if (pathExists(dest)) dest = insertSID(dest);

    const writeStream = fs.createWriteStream(dest);
    fs.createReadStream(path).pipe(writeStream);

    writeStream.on("finish", () => {
        res.end(basename(path));
    });
});

function isStraggler(path, uid) {

}
const inSongFolder = (path, uid) => resolve(dirname(path)) === resolve(`${global.resources}/users/${uid}/songs`);

module.exports = router;