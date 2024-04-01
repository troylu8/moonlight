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

https.createServer({
    key: fs.readFileSync( join(__dirname, "server.key"), "utf8"),
    cert: fs.readFileSync( join(__dirname, "server.cert"), "utf8"),
}, app)
    .listen(5001, () => console.log("server listening.."));