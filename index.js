const express = require('express');
const path = require('path');

const app = express();

app.use("*", express.static(path.resolve(__dirname, "./public")));

app.get("*", (req, res) => {
    console.log(req.url);
})

app.listen(5000);