const express = require('express');
const fs = require('fs');
const Zip = require("adm-zip");
const { join } = require("path");

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

router.post('/upload/:user', express.raw( {type: "*/*", limit: Infinity} ), async (req, res) => {

    const path = join(__dirname, "users", req.params["user"], "songs.zip");

    const createdNewFile = await createFile(path);
    
    const allSongs = new Zip(createdNewFile? undefined : path);
    const newSongs = new Zip(req.body);

    const total = allSongs.getEntryCount() + newSongs.getEntryCount();

    for (const song of newSongs.getEntries()) {
        song.getDataAsync( (data, err) => {
            allSongs.addFile(song.name, data);

            if (allSongs.getEntryCount() === total) {
                res.send("done");
                allSongs.writeZip(path);
            }
        })
    }
});

module.exports = router;