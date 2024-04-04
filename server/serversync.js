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

router.post('/:user', express.raw( {type: "*/*", limit: Infinity} ), async (req, res) => {

    const userDir = join(__dirname, "users", req.params["user"]);
    const zipPath = join(userDir, "songs.zip");

    const createdNewFile = await createFile(zipPath);
    
    const allSongs = new Zip(createdNewFile? undefined : zipPath);
    const arrived = new Zip(req.body);

    // add songs to zip
    for (const entry of arrived.getEntries()) {
        if (entry.name === "changes.json") {
            console.log("ignored changes entry");
            continue;
        }

        try {
            const data = await getDataPromise(entry);
            allSongs.addFile(entry.name, data);
        } catch (err) {
            console.log(err);
        }
    }

    const data =  JSON.parse( await fs.promises.readFile( join(userDir, "data.json"), {encoding: "utf8", }) );
    
    const changes = JSON.parse( await getDataPromise(arrived.getEntry("changes.json")) );
    
    console.log("server backend got: ", changes);

    // merge json data
    for (const song of changes.unsynced) {
        data.songs[song.id] = song;
        console.log("added", song.title);
    }
    // clear trash
    for (const songInfo of changes.trash) {
        //songInfo:  [sid, filename]
        delete data.songs[songInfo[0]];
        allSongs.deleteFile(songInfo[1]);
        console.log("deleted", songInfo[1]);
    }

    await fs.promises.writeFile( join(userDir, "data.json"), JSON.stringify(data, (key, value) => key === "id"? undefined : value), "utf8");
    console.log("finished writing json");
    
    await writeZipPromise(allSongs, zipPath);
    console.log("finished writing zip");

    const toClient = new Zip();

    for (const filename of changes.wants) {
        const entry = allSongs.getEntry(filename);
        toClient.addFile(entry.name, await getDataPromise(entry));
        console.log("returning", entry.name);
    }
    
    res.send(toClient.toBuffer())
    
    
});

module.exports = router;