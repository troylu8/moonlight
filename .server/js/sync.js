const express = require('express');
const fs = require('fs');
const Zip = require("adm-zip");
const { join } = require("path");
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { db } = require("./reception.js");
const bcrypt = require('bcrypt');


fs.mkdir(__dirname + "/../userfiles", {recursive: true}, () => {});

const router = express.Router();

/** @returns {Promise<boolean>} true if new file was created */
async function createFile(path) {
    try {
        await fs.promises.writeFile(path, "", {flag: "ax"});
        return true;
    } catch (err) {
        if (err.code === "EEXIST") return false;
        throw err;
    }
}

/**
 * `entry.getDataAsync` but with `err` first in the callback, so it's promisify-able
 * @param {import('adm-zip').IZipEntry} entry 
 * @param {function(err, data)} cb 
 */
function getDataReversed(entry, cb) {
    entry.getDataAsync((data, err) => cb(err, data));
}
const getDataPromise = promisify(getDataReversed);

/**
 * @param {import('adm-zip')} zip 
 * @param {string} targetfilename
 * @param {function(err)} cb 
 */
function writeZip(zip, targetfilename, cb) {
    zip.writeZip(targetfilename, cb);
}
const writeZipPromise = promisify(writeZip);

router.put('/:uid/:username/:hash1/:deviceID', express.json({limit: Infinity}), async (req, res) => {

    const row = db.prepare("SELECT hash2,username,userdata FROM users WHERE uid=? ").get(req.params["uid"]);
    if (!row) return res.status(404).end()
    if ( !(await bcrypt.compare(req.params["hash1"], row.hash2)) ) return res.status(401).end();
    
    const zipPath = join(__dirname, "../userfiles", req.params["uid"] + ".zip");

    const createdNewFile = await createFile(zipPath);
    
    const userZip = new Zip(createdNewFile? undefined : zipPath);
    const receivedZip = new Zip(Buffer.from(req.body.data));

    // add new files to user zip
    for (const entry of receivedZip.getEntries()) {
        if (entry.name === "meta.json") continue;

        try {
            const data = await getDataPromise(entry);
            userZip.addFile(entry.entryName, data);
            console.log("added file ", entry.entryName);
        } catch (err) {
            console.log(err);
        }
    }
    
    const meta = JSON.parse( await getDataPromise(receivedZip.getEntry("meta.json")) );
    console.log("server backend got: ", meta);

    // update userdata
    db.prepare("UPDATE users SET userdata=? WHERE uid=?").run(meta.userdata, req.params["uid"]);
    console.log("finished editing data");

    // delete files
    if (meta.files.delete === "*") await fs.promises.rm(zipPath);
    else {
        for (const path of meta.files.delete) {
            userZip.deleteFile(path);
            console.log("deleted", path );
        }
    }
    
    await writeZipPromise(userZip, zipPath);
    console.log("finished writing zip");

    const toClient = new Zip();

    // send back requested files
    for (const path of meta.files.sendToClient) {
        console.log("packing ", path);
        const entry = userZip.getEntry(path);
        toClient.addFile(entry.entryName, await getDataPromise(entry));
    }

    const resJSON = toClient.toBuffer().toJSON();
    
    // if username was changed
    if (req.params["username"] !== row.username) resJSON.newUsername = row.username;

    res.json(resJSON);
});

module.exports = router;