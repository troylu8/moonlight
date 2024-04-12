const express = require('express');
const fs = require('fs');
const { dirname } = require('path');
const crypto = require('crypto');
const { QuickDB } = require('quick.db');

const router = express.Router();

crypto.

router.get("guest-id", (req, res) => {
    
    fs.readFile(`${__dirname}/../public/resources/guestID.txt`, "utf8", (err, data) => {
        if (err) throw err;
        res.end(data);
    })
})