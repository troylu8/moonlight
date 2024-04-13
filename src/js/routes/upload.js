const express = require('express');
const fs = require('fs');
const { basename } = require('path');
const { parseFile } = require('music-metadata');
const { ensurePathThen } = require("../util.js");


const router = express.Router();

router.post('/:uid', express.text(), async (req, res) => {

    const filename = basename(req.body);    
    const data = await fs.promises.readFile(req.body);

    ensurePathThen(async () => {
        
        await fs.promises.writeFile(`${global.resources}/users/${req.params["uid"]}/songs/${filename}`, data);
        
        res.status(200).json(JSON.stringify( {
            filename: filename,
            title: filename.replace(/\.[^\/.]+$/, ""), // regex to remove extensions
            artist: "uploaded by you",
            size: (await fs.promises.stat(req.body)).size,
            duration: (await parseFile(req.body)).format.duration
        } ))
    })
    
});

module.exports = router;