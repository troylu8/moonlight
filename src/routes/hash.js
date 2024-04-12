const express = require('express');
const { hash } = require("bcrypt");

const router = express.Router();

router.use(express.text());
router.post("/", (req, res) => {

    hash(req.body, 11, (err, hash) => {
        if (err) res.status(500).end();
        res.status(200).end(hash);
    })
})

module.exports = router;