const express = require('express');
const fs = require('fs');
const Zip = require("adm-zip");
const { join } = require("path");
const { promisify } = require('util');

const router = express.Router();

/** @returns {Promise<boolean>} true if new file was created */
async function createFile(path) {
    try { 
        await fs.promises.open(path, "r");
        return false;
    }
    catch (err) { 
        await fs.promises.writeFile(path, ""); 
        return true;
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
            console.log("ignore changes entry");
            continue;
        }

        try {
            const data = await getDataPromise(entry);
            allSongs.addFile(entry.name, data);
        } catch (err) {
            console.log(err);
        }
        
    }

    const data =  JSON.parse( await fs.promises.readFile( join(userDir, "data.json"),  "utf8") );
    
    const changes = JSON.parse( await getDataPromise(arrived.getEntry("changes.json")) );
    
    console.log("changes", changes);

    // merge json data
    for (const sid of Object.keys(changes.server.wants)) {
        data.songs[sid] = changes.server.wants[sid];
        console.log("setting ", changes.server.wants[sid].title);
    }
    // changes.server.trash: [ [sid, filename], ... ]
    for (const song of changes.server.trash) {
        delete data.songs[song[0]];
        allSongs.deleteFile(song[1]);
        console.log("deleted", song[1]);
    }

    await fs.promises.writeFile( join(userDir, "data.json"), JSON.stringify(data), "utf8");
    console.log("finished writing json");
    
    await writeZipPromise(allSongs, zipPath);
    console.log("finished writing zip");

    const toClient = new Zip();

    for (const filename of changes.client.wants) {
        const entry = allSongs.getEntry(filename);
        toClient.addFile(entry.name, await getDataPromise(entry));
        console.log("returning", entry.name);
    }
    
    res.send(toClient.toBuffer())
});

module.exports = router;