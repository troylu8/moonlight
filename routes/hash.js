const express = require('express');
const { hash } = require("bcrypt");

const router = express.Router();

router.get("/:input", async (req, res) => {

    hash(req.params["input"], 11, (err, hash) => {
        if (err) res.status(500).end();
        res.status(200).end(hash);
    })
    
})

module.exports = router;