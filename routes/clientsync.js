const express = require('express');
const Zip = require("adm-zip");
const axios = require('axios');
const { join } = require("path");

const router = express.Router();
router.use(express.json());

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// send server.wants
router.post("/upload/:username", async (req, res) => {
    
    const outward = req.body.wants;
    console.log("body", req.body);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(JSON.stringify(req.body)) );
    for (const song of Object.values(outward)) {
        zip.addLocalFile( join(__dirname, "../public/resources/songs", song.filename) );
    }

    try {
        await axios({
            method: 'POST',
            url: "https://localhost:5001/sync/upload/" + req.params["username"], 
            data: zip.toBuffer(), 
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
    } catch (err) {console.log("error");}
    
    
    res.end();
    
})

// ask for client.wants and send server.trash


module.exports = router;