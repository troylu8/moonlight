const express = require('express');
const Zip = require("adm-zip");
const axios = require('axios');
const { join } = require("path");

const router = express.Router();
router.use(express.json());

// send server.wants
router.post("/upload/:username", async (req, res) => {
    console.log(req.body);
    const outward = req.body.wants;

    const zip = new Zip();
    for (const filename of outward) {
        zip.addLocalFile( join(__dirname, "../public/resources/songs", filename) );
    }
    
    const serverRes = await axios({
        method: 'POST',
        url: "https://localhost:5001/sync/upload/" + req.params["username"], 
        data: await zip.toBufferPromise(), 
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });
    
    res.status(serverRes.status).end();
})

// ask for client.wants and send server.trash


module.exports = router;