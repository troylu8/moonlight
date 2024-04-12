const fs = require('fs');
const express = require('express');
const { join } = require("path");
const bcrypt = require("bcrypt");
const https = require('https');
const cors = require("cors");

const app = express();
app.use(cors())

app.use("/", require("./account.js"));
app.use("/sync", require("./serversync.js"));

app.post("get-jwt/:username", async (req, res) => {
    console.log("got something");
    const uid = await uidDB.get(req.params["username"]);
    console.log("uid", uid);
    if (!uid) return res.status(404).end();

    const hash = await usersDB.get(uid + ".hash");
    
    if (await bcrypt.compare(req.body, hash)) res.status(200).end(createJWT(uid));
    else                                  res.status(401).end();
})

https.createServer({
    key: fs.readFileSync( join(__dirname, "auth/server.key"), "utf8"),
    cert: fs.readFileSync( join(__dirname, "auth/server.cert"), "utf8"),
}, app)
    .listen(5001, () => console.log("server listening.."));
