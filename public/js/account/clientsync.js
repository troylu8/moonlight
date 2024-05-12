import { sendNotification } from "../view/fx.js";
import { jwt, parseJWT, setAccInfo, uid } from "./account.js";
import { deviceID } from "./files.js";

const Zip = require("adm-zip");
const axios = require('axios');
const { join } = require("path");
const { promisify } = require('util');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


/**
 * @param {import('adm-zip')} zip 
 * @param {string} targetPath
 * @param {function(err)} cb 
 */
function extractAllToAsync(zip, targetPath, cb) {
    const total = zip.getEntryCount();
    let done = 0;
    
    if (total === 0) return cb();

    zip.extractAllTo(targetPath);
    cb();

    //TODO: change back to async when its fixed: https://github.com/cthackers/adm-zip/issues/484
    // zip.extractAllToAsync(targetPath, false, false, (err) => {
    //     console.log(done, "/", total);
    //     if (++done === total) cb();
    // });
}
const extractAllToPromise = promisify(extractAllToAsync);


export async function syncToServer(changes) {
    const resourcesDir = join(global.resources, "users", uid);

    console.log("client", changes);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(
        JSON.stringify(changes, 
            function(key, value) {
                if ([
                    "doomed",
                    "newItems",
                    
                    "playlists",
                    "groupElem",
                    "songEntries",
                    "playlistEntry",
                    "checkboxDiv",
                    "cycle",
                    "syncStatus",
                    "state"
                ].includes(key)) return undefined;

                if (key === "songs") return this.getOrderedSIDs();

                return value;
            })
    ));

    for (const song of changes["unsynced-songs"]) {
        if (song.syncStatus === "new") 
            zip.addLocalFile( join(resourcesDir, "songs", song.filename), "songs/" );
    }

    //TODO: remove this dependency
    const res = await axios({
        method: 'POST',
        url: `https://localhost:5001/sync/${jwt}/${deviceID}`, 
        data: zip.toBuffer(), 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    if (res.data.newJWT) {
        const info = parseJWT(res.data.newJWT);
        setAccInfo(res.data.newJWT, info.uid, info.username);
        sendNotification("username was changed to ", info.username);
    }

    await extractAllToPromise(new Zip(Buffer.from(res.data.data)), resourcesDir);
}