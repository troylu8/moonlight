const express = require("express");
const cors = require('cors');

const server = express();
server.use(cors());
server.use(express.static(__dirname + "/../public"));
server.use("/getyt", require(__dirname + "/routes/getyt.js"));
server.use("/upload", require(__dirname + "/routes/upload.js"));
server.use("/files", require(__dirname + "/routes/files.js"));
server.use("/hash", require(__dirname + "/routes/hash.js"));
server.use("/sync", require(__dirname + "/routes/clientsync.js"));

server.listen(5000, () => console.log("listening.."));