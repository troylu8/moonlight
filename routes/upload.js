const express = require('express');
const { dialog } = require('electron');
const fs = require('fs');
const { basename } = require('path');
const mm = require('music-metadata');


const router = express.Router();

router.post('/:playlistID', async (req, res) => {
    const data = await dialog.showOpenDialog(
        {
            filters: [ { name: "sound", extensions: ["mp3", "wav"] } ],
            properties: ['openFile']
        }
    );
        
    if (data.filePaths.length === 0) 
        return res.status(204).end();

    const filename = basename(data.filePaths[0]);

    const writeStream = fs.createWriteStream("./public/resources/songs/" + filename);

    const song = {
        id: new Date().getTime(),
        filename: filename,
        title: filename.replace(/\.[^\/.]+$/, ""), // regex to remove extensions
        artist: "uploaded by you",
        playlistIDs: [ Number(req.params["playlistID"]) ],
        size: (await fs.promises.stat(data.filePaths[0])).size,
        duration: (await mm.parseFile(data.filePaths[0])).format.duration
    }

    writeStream.on("finish", () => res.status(200).json(JSON.stringify(song)) );
    
    fs.createReadStream(data.filePaths[0]).pipe(writeStream);
    
});


module.exports = router;