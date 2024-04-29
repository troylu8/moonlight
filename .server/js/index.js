const fs = require('fs');
const express = require('express');
const https = require('https');
const cors = require("cors");

const app = express();
app.use(cors());

app.use("/", require("./reception.js").router);
app.use("/sync", require("./sync.js"));

https.createServer({
    key: fs.readFileSync( __dirname + "/../auth/server.key", "utf8"),
    cert: fs.readFileSync( __dirname + "/../auth/server.crt", "utf8"),
}, app)
    .listen(5001, () => console.log("server listening.."));
