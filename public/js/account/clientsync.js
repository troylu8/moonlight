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

export async function syncToServer(uid, changes) {
    const resourcesDir = join(global.resources, "users", uid);

    const zip = new Zip();
    zip.addFile("changes.json", Buffer.from(
        JSON.stringify(changes, 
            (key, value) => {
                if ([
                    "groupElem",
                    "songEntries",
                    "playlistEntry",
                    "checkboxDiv",
                    "cycle",
                    "_syncStatus",
                    "state"
                ].includes(key)) return undefined;

                if (key === "songs" || key === "playlists") return Array.from(value).map(i => i.id);

                return value;
            })
    ));

    for (const song of changes["unsynced-songs"]) {
        if (song._syncStatus === "new") 
            zip.addLocalFile( join(resourcesDir, "songs", song.filename), "songs/" );
    }
    //TODO: add playlist files here!!!!!  ! 


    const newItems = await axios({
        method: 'POST',
        url: "https://localhost:5001/sync/" + uid, 
        data: zip.toBuffer(), 
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        responseType: "arraybuffer"
    });

    await extractAllToPromise(new Zip(Buffer.from(newItems.data)), resourcesDir);
}
