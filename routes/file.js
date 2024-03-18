const express = require('express');
const multer = require('multer');

const router = express.Router();

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/resources/songs'); // Destination folder where files will be stored
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
    fileFilter: function (req, file, cb) {
        
    }
});

// Create multer instance with storage configuration
const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => { 
        cb(null, file.mimetype.startsWith("audio"));
    }
});

router.post('/upload', upload.single('song-file'), (req, res) => {
    res.redirect("/");
});

module.exports = router;