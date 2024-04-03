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
    
    zip.extractAllToAsync(targetPath, true, false, cb);
}
const extractAllToPromise = promisify(extractAllToAsync);

const router = express.Router();
router.use(express.json());

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// send server.wants
router.post("/:username", async (req, res) => {
    
    const songsDir = join(__dirname, "../public/resources/songs");

    console.log("body", req.body);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(JSON.stringify(req.body)) );
    for (const song of Object.values(req.body.server.wants)) {
        zip.addLocalFile( join(songsDir, song.filename) );
    }

    try {
        const newSongs = await axios({
            method: 'POST',
            url: "https://localhost:5001/sync/" + req.params["username"], 
            data: zip.toBuffer(), 
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            responseType: "arraybuffer"
        });
        console.log("returned buffer", Buffer.from(newSongs.data));
        // new Zip(res.data).extractAllTo(songsDir + "/", true);
        await extractAllToPromise(new Zip(Buffer.from(newSongs.data)), songsDir);
        console.log("added new songs");
        res.status(200).end();
    } catch (err) {
        console.log("error!!", err);
        res.end();
    }
    
    
    
})

// ask for client.wants and send server.trash


module.exports = router;