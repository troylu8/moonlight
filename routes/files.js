
const express = require('express');
const fs = require('fs');
const { dirname, join } = require("path")

const router = express.Router();

router.get("/read-userdata", (req, res) => {
    fs.readFile("./public/resources/userdata.json",  "utf8", (err, data) => {
        res.json(JSON.parse(data));
    })
})

router.delete("/:songFilename", (req, res) => {
    fs.unlink(join(dirname(__dirname), "public/resources/songs" , req.params["songFilename"]), () => res.end());
})

router.use("/save-userdata", express.text())
router.put("/save-userdata", (req, res) => {
    fs.writeFile("./public/resources/userdata.json", req.body, (err) => {
        res.end();
    });
})

module.exports = router;