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
router.post("/upload/:username", async (req, res) => {
    
    const songsDir = join(__dirname, "../public/resources/songs");

    const outward = req.body.wants;
    console.log("body", req.body);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(JSON.stringify(req.body)) );
    for (const song of Object.values(outward)) {
        zip.addLocalFile( join(songsDir, song.filename) );
    }

    console.log("got here");

    try {
        const newSongsBuffer = await axios({
            method: 'POST',
            url: "https://localhost:5001/sync/" + req.params["username"], 
            data: zip.toBuffer(), 
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        await extractAllToPromise(new Zip(newSongsBuffer), songsDir);
        console.log("added new songs");
        res.status(200).end();

    } catch (err) {
        console.log("error");
        res.end();
    }
    
    
    
})

// ask for client.wants and send server.trash


module.exports = router;