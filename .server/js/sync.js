const express = require('express');
const fs = require('fs');
const Zip = require("adm-zip");
const { join } = require("path");
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { db } = require("./reception.js");
const bcrypt = require('bcrypt');


fs.mkdir(__dirname + "/../userfiles", {recursive: true}, () => {});

const router = express.Router();

/** @returns {Promise<boolean>} true if new file was created */
async function createFile(path) {
    try {
        await fs.promises.writeFile(path, "", {flag: "ax"});
        return true;
    } catch (err) {
        if (err.code === "EEXIST") return false;
        throw err;
    }
}

/**
 * `entry.getDataAsync` but with `err` first in the callback, so it's promisify-able
 * @param {import('adm-zip').IZipEntry} entry 
 * @param {function(err, data)} cb 
 */
function getDataReversed(entry, cb) {
    entry.getDataAsync((data, err) => cb(err, data));
}
const getDataPromise = promisify(getDataReversed);

/**
 * @param {import('adm-zip')} zip 
 * @param {string} targetfilename
 * @param {function(err)} cb 
 */
function writeZip(zip, targetfilename, cb) {
    zip.writeZip(targetfilename, cb);
}
const writeZipPromise = promisify(writeZip);

router.put('/:uid/:username/:hash1/:deviceID', express.json({limit: Infinity}), async (req, res) => {

    const row = db.prepare("SELECT hash2,username,userdata FROM users WHERE uid=? ").get(decoded.uid);
    if (!row) return res.status(404).end()
    if ( !(await bcrypt.compare(req.params["hash1"], row.hash2)) ) return res.status(401).end();
    
    const zipPath = join(__dirname, "../userfiles", decoded.uid + ".zip");

    const createdNewFile = await createFile(zipPath);
    console.log(zipPath, createdNewFile);
    
    const userfiles = new Zip(createdNewFile? undefined : zipPath);
    const arrived = new Zip(Buffer.from(req.body.data));

    // add new files to zip
    for (const entry of arrived.getEntries()) {
        if (entry.name === "changes.json") continue;

        try {
            const data = await getDataPromise(entry);
            userfiles.addFile(entry.entryName, data);
            console.log("added file ", entry.entryName);
        } catch (err) {
            console.log(err);
        }
    }

    const data = JSON.parse(row.userdata);
    
    const changes = JSON.parse( await getDataPromise(arrived.getEntry("changes.json")) );
    
    console.log("server backend got: ", changes);

    // merge json data
    for (const song of changes["unsynced-songs"]) {
        song.lastUpdatedBy = req.params["deviceID"];
        data.songs[song.id] = song;
        console.log("added", song.title, " to data");
    }
    for (const playlist of changes["unsynced-playlists"]) {
        playlist.lastUpdatedBy = req.params["deviceID"];
        data.playlists[playlist.id] = playlist;
        console.log("added", playlist.title, " to data");
    }
    // clear trash
    for (const info of changes.trash) {
        const objPath = info[0].split(".");
        delete data[ objPath[0] ][ objPath[1] ];

        userfiles.deleteFile(info[1]);
        console.log("deleted", info[0], info[1]);
    }

    db.prepare("UPDATE users SET userdata=? WHERE uid=?").run(JSON.stringify(data), decoded.uid);
    console.log("finished editing data");
    
    await writeZipPromise(userfiles, zipPath);
    console.log("finished writing zip");

    const toClient = new Zip();

    // send back requested files
    for (const filepath of changes.requestedFiles) {
        console.log("packing ", filepath);
        const entry = userfiles.getEntry(filepath);
        if (!entry) console.log("couldnt find ", filepath);
        toClient.addFile(entry.entryName, await getDataPromise(entry));
    }

    const resJSON = toClient.toBuffer().toJSON();
    
    // if username was changed
    if (req.params["username"] !== row.username) resJSON.newUsername = row.username;

    res.json(resJSON);
});

module.exports = router;