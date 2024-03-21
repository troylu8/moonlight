const express = require('express');
const { dialog } = require('electron');
const fs = require('fs');
const { basename } = require('path');

const router = express.Router();

router.post('/:playlistID', async (req, res) => {
    const data = await dialog.showOpenDialog(
        {
            filters: [ { name: "sound", extensions: ["mp3", "wav"] } ],
            properties: ['openFile']
        }
    );
    
    console.log(data.filePaths);
    
    if (data.filePaths.length === 0) 
        return res.status(204).end();

    const filename = basename(data.filePaths[0]);

    const write = fs.createWriteStream("../public/resources/songs/" + filename);

    write.on("finish", () => res.status(200).json(
        {
            "id": new Date().getTime(),
            "filename": filename,
            "title": filename.replace(/\.[^/.]+$/, ""),
            "artist": "??",
            "playlistIDs": [ req.params["playlistID"] ]
        }
    ))
    
    
    fs.createReadStream(data.filePaths[0]).pipe(write);
    
});


module.exports = router;