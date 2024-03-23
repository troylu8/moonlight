const fs = require('fs');
const express = require('express');
const { join } = require("path");
const bcrypt = require("bcrypt");

const app = express();

app.post("/create-account-dir/:username", (req, res) => {
    fs.mkdir(join(__dirname, "users", req.params["username"]), (err) => {
        res.status((err && err.code === "EEXIST")? 409 : 200).end();
    })
})

app.post("/set-hash/:username/:pass", async (req, res) => {

    bcrypt.hash(req.params["pass"], 10, (err, hash) => {
        fs.writeFile(
            join(__dirname, "users", req.params["username"], "hash.txt"), 
            hash, 
            (err) => { res.status(err? 500 : 200).end() }
        )
    })
    
})

app.listen(5001, () => console.log("server listening.."));