const fs = require('fs');
const express = require('express');
const { join } = require("path");
const bcrypt = require("bcrypt");
const https = require('https');
const cors = require("cors");

const app = express();
app.use(cors())

app.post("/create-account-dir/:username", (req, res) => {
    fs.mkdir(join(__dirname, "users", req.params["username"]), (err) => {
        res.status((err && err.code === "EEXIST")? 409 : 200).end();
    })
})

app.use("/set-hash", express.text());
app.post("/set-hash/:username", async (req, res) => {
    
    fs.writeFile(
        join(__dirname, "users", req.params["username"], "hash.txt"), 
        await bcrypt.hash(req.body, 11), 
        (err) => { res.status(err? 500 : 200).end() }
    )
    
})

app.use("/get-data", express.text());
app.post("/get-data/:username", async (req, res) => {

    const userDir = join(__dirname, "users", req.params["username"]);
    
    const passMatches = await comparePass(req.body, userDir);
    if (passMatches === "no user") return res.status(404).end();

    if (passMatches === "success") {
        const json = await fs.promises.readFile(join(userDir, "data.json"),"utf-8");
        res.status(200).json(JSON.parse(json));
    }
    else res.status(401).end();
});

app.use("/upload-data", express.json());
app.put("/upload-data/:username", async (req, res) => {

    const userDir = join(__dirname, "users", req.params["username"]);
    
    const passMatches = await comparePass(req.body.pass, userDir);
    if (passMatches === "no user") return res.status(404).end();
    
    if (passMatches === "success") {
        fs.writeFile(
            join(userDir, "data.json"),
            JSON.stringify(req.body.userdata),
            () => res.end("written")
        )
    }
    else res.status(401).end();
    
})

async function comparePass(pass, userDir) {
    try {
        const hash = await fs.promises.readFile(join(userDir, "hash.txt"), "utf8");
        return (await bcrypt.compare(pass, hash))? "success" : "wrong pass";
    } catch (err) {
        if (err.code === "ENOENT") return "no user";
    }
}

https.createServer({
    key: fs.readFileSync( join(__dirname, "server.key"), "utf8"),
    cert: fs.readFileSync( join(__dirname, "server.cert"), "utf8"),
}, app)
    .listen(5001, () => console.log("server listening.."));
