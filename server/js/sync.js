const express = require('express');
const fs = require('fs');
const Zip = require("adm-zip");
const { join } = require("path");
const { promisify } = require('util');


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

router.post('/:uid', express.raw( {type: "*/*", limit: Infinity} ), async (req, res) => {

    const zipPath = join(__dirname, "../userfiles", req.params["uid"] + ".zip");

    const createdNewFile = await createFile(zipPath);
    console.log(zipPath, createdNewFile);
    
    const userfiles = new Zip(createdNewFile? undefined : zipPath);
    const arrived = new Zip(req.body);

    // add songs to zip
    for (const entry of arrived.getEntries()) {
        if (entry.name === "changes.json") {
            console.log("ignored changes entry");
            continue;
        }

        try {
            const data = await getDataPromise(entry);
            userfiles.addFile(entry.entryName, data);
            console.log("added file ", entry.entryName);
        } catch (err) {
            console.log(err);
        }
    }

    const row = db.prepare(`SELECT userdata FROM local WHERE uid='${req.params["uid"]}' `).get();
    if (!row) return res.status(404).end("userdata missing")
    const data = JSON.parse(row.userdata);
    
    const changes = JSON.parse( await getDataPromise(arrived.getEntry("changes.json")) );
    
    console.log("server backend got: ", changes);

    // merge json data
    for (const song of changes["unsynced-songs"]) {
        data.songs[song.id] = song;
        console.log("added", song.title);
    }
    for (const playlist of changes["unsynced-playlists"]) {
        data.playlists[playlist.id] = playlist;
        console.log("added", playlist.title);
    }
    // clear trash
    for (const info of changes.trash) {
        //info:  [ "songs.sid" or "playlists.pid", filename]
        const objPath = info[0].split(".");
        delete data[ objPath[0] ][ objPath[1] ];

        userfiles.deleteFile(info[1]);
        console.log("deleted", info[0], info[1]);
    }

    db.prepare(`UPDATE users SET userdata=${data} WHERE uid=${req.params["uid"]}`).run();
    console.log("finished writing json");
    
    await writeZipPromise(userfiles, zipPath);
    console.log("finished writing zip");

    const toClient = new Zip();

    for (const filepath of changes.requestedFiles) {
        console.log("packing ", filepath);
        const entry = userfiles.getEntry(filepath);
        toClient.addFile(entry.entryName, await getDataPromise(entry));
        console.log("returning", entry.entryName);
    }
    
    res.send(toClient.toBuffer())
});

module.exports = router;