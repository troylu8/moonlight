const express = require('express');
const { dialog } = require('electron');


const router = express.Router();

router.post('/upload', async (req, res) => {
    const data = await dialog.showOpenDialog(
        {
            filters: [ { name: "sound", extensions: ["mp3", "wav"] } ],
            properties: ['openFile']
        }
    );

    console.log(data.filePaths);
    
    
    if (data.filePaths.length === 0) 
        res.status(204).end();
    else 
        res.status(200).send("uploaded" + data.filePaths[0]);
});


module.exports = router;