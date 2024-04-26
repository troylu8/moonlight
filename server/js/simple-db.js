const BetterSQLite3 = require('better-sqlite3');

module.exports = class SimpleDB {

    /**
     * @param {string} path 
     * @param {string} tableName 
     * @param {string} columns example: `"(uid TEXT, username TEXT, userdata TEXT)"`
     */
    constructor(path, tableName, columns) {
        this.db = new BetterSQLite3(path);

        this.db.pragma('journal_mode = WAL');
        this.db.prepare(`CREATE TABLE IF NOT EXISTS ${tableName} ${columns}`).run();
    }

    set(searchColumn, key, editColumn, value) {

        // only wrap in apostrophes if not null
        const str = value? ` '${value}' `: "null";
        
        if (!this.get(searchColumn, key, editColumn)) {
            this.db.prepare(`INSERT INTO local (${editColumn}) VALUES ( '${key}', ${str} ) `).run();
        }
        this.db.prepare(`UPDATE local SET ${editColumn}=`)
    }

    get(searchColumn, key, destColumn) {
        const res = this.db.prepare(`SELECT ${destColumn} FROM local WHERE ${searchColumn}='${key}' `).get();
        return res? res[destColumn] : undefined;
    }

    has(searchColumn, key) {
        return this.db.prepare(`SELECT value FROM local WHERE ${searchColumn}='${key}' `).get() != undefined;
    }

    print() {
        console.log(this.db.prepare("SELECT * FROM local").all());
    }
        
}