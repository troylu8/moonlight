const express = require("express");
const cors = require('cors');

global.resources = __dirname + "/../public/resources";

const server = express();
server.use(cors());
server.use(express.static("../public"));
server.use("/getyt", require("./routes/getyt.js"));
server.use("/upload", require("./routes/upload.js"));
server.use("/files", require("./routes/files.js"));
server.use("/hash", require("./routes/hash.js"));
server.use("/sync", require("./routes/clientsync.js"));

server.listen(5000, () => console.log("listening.."));