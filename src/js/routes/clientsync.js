const express = require('express');
const Zip = require("adm-zip");
const axios = require('axios');
const { join } = require("path");
const { promisify } = require('util');


/**
 * @param {import('adm-zip')} zip 
 * @param {string} targetPath
 * @param {function(err)} cb 
 */
function extractAllToAsync(zip, targetPath, cb) {
    const total = zip.getEntryCount();
    console.log("total in buffer", total);
    let done = 0;
    
    if (total === 0) return cb();

    console.log("starting extracting");
    
    zip.extractAllToAsync(targetPath, true, (err) => {
        console.log("extracted", done+1);
        if (++done === total) cb();
    });
}
const extractAllToPromise = promisify(extractAllToAsync);

const router = express.Router();
router.use(express.json());

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

router.post("/:uid", async (req, res) => {
    
    const resourcesDir = join(global.resources, "users", req.params["uid"]);

    console.log("client backend got: ", req.body);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(
        // exclude syncStatus from json before sending to server
        JSON.stringify(req.body, (key, value) => key === "_syncStatus"? undefined : value)
    ));

    for (const song of req.body["unsynced-songs"]) {
        if (song._syncStatus === "new") 
            zip.addLocalFile( join(resourcesDir, "songs", song.filename), "songs/" );
            
    }
    //TODO: add playlist files here!!!!!  ! 

    try {
        const newSongs = await axios({
            method: 'POST',
            url: "https://localhost:5001/sync/" + req.params["uid"], 
            data: zip.toBuffer(), 
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            responseType: "arraybuffer"
        });
        console.log("returned buffer", Buffer.from(newSongs.data));

        await extractAllToPromise(new Zip(Buffer.from(newSongs.data)), resourcesDir);
        console.log("added new songs");

        res.status(200).end();
    } catch (err) {
        console.log("error!!", err);
        res.end();
    }
    
    
    
})

// ask for client.wants and send server.trash


module.exports = router;