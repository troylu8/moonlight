import * as songElements from "./songElements.js";
import * as play from "./play.js";
import { PlaylistCycle } from "./play.js";
import { updateSongEntries } from "./songSettings.js";

export class Song {
    constructor(id, options) {
        data.songs.set(id, this);
        this.id = id;
        this.title = options.title;
        this.artist = options.artist;
        this.filename = options.filename;
        this.size = options.size;
        this.duration = options.duration;

        /** @type {"new" | "edited" | "synced"} */
        this._syncStatus = options.syncStatus ?? "new";

        /** @type {Set<HTMLElement>} */
        this.songEntries = new Set();
        
        /** @type {Set<Playlist>} */
        this.playlists = new Set();
        if (options.playlists) {
            for (const pid of options.playlists) 
                this.addToPlaylist(data.playlists.get(pid));
        }
    }

    /** @param {"new" | "edited" | "synced"} val cannot set `syncStatus` to `edited` when it is `new`*/
    set syncStatus(val) { 
        if (val === "edited" && this._syncStatus === "new") return;
        this._syncStatus = val;
    }

    /** @returns {"new" | "edited" | "synced"} */
    get syncStatus() {return this._syncStatus}
    
    update(options) {
        this.title = options.title;
        this.artist = options.artist;
        this.playlists = new Set(options.playlists);
        if (options.playlists) {
            for (const playlist of options.playlists) 
                this.addToPlaylist(playlist);
        }
        updateSongEntries();
    }

    /** @param {Playlist} playlist */
    addToPlaylist(playlist) {
        if (!playlist || playlist.songs.has(this)) return;
        
        this.syncStatus = "edited";
        playlist.syncStatus = "edited";

        playlist.songs.add(this);
        this.playlists.add(playlist);

        const songElems = songElements.createSongEntry(this, playlist);

        if (playlist.cycle) playlist.cycle.addSong(this, true);

        return songElems;
    }

    /** @param {Playlist} playlist */
    removeFromPlaylist(playlist) {
        if (!playlist.songs.has(this)) return;

        this.syncStatus = "edited";
        playlist.syncStatus = "edited";

        playlist.songs.delete(this);
        this.playlists.delete(playlist);
        if (playlist.groupElem) songElements.deleteSongEntry(this, playlist);

        if (playlist.cycle) playlist.cycle.deleteSong(this);
    }

    delete() {
        //TODO: test this
        if (data.curr.listenPlaylist.songs.size === 1) play.setSong("none");
        else if (this === data.curr.song) play.playNextSong();

        data.trashqueue.set("songs." + this.id, "songs/" + this.filename);

        for (const playlist of this.playlists) 
            this.removeFromPlaylist(playlist);
        
        data.songs.delete(this.id);

        console.log("deleted " + this.title);
        //TODO: enable file delete
        // fetch("http://localhost:5000/files/" + this.filename, {method: "DELETE"});
    }
}

export class Playlist {
    
    constructor(id, options) {
        data.playlists.set(id, this);
        this.id = id;
        this.title = options.title;
        this.desc = options.desc ?? "";
        
        /** @type {HTMLElement} */
        this.playlistEntry = null;
        /** @type {HTMLElement} */
        this.groupElem = null;
        /** @type {HTMLElement} */
        this.checkboxDiv = null;

        /** @type {PlaylistCycle} */
        this.cycle = null;

        /** @type {"new" | "edited" | "synced"} */
        this._syncStatus = options.syncStatus ?? "new";

        songElements.createPlaylistEntries(this);
        songElements.createPlaylistCheckboxDivs(this);

        /** @type {Set<Song>} */
        this.songs = new Set();
        if (options.songs) 
            options.songs.forEach(sid => this.songs.add(sid));
        
        
    }

    /** @param {"new" | "edited" | "synced"} val cannot set `syncStatus` to `edited` when it is `new`*/
    set syncStatus(val) { 
        if (val === "edited" && this._syncStatus === "new") return;
        this._syncStatus = val;
    }

    /** @returns {"new" | "edited" | "synced"} */
    get syncStatus() {return this._syncStatus}

    delete() {
        
        //TODO: add playlist files!
        data.trashqueue.set("playlists." + this.id, "playlists/ dummy value");

        // if only playlist, set view and listen playlists to none
        if (data.playlists.size === 1) songElements.setViewPlaylist("none", true);

        else if (this === data.curr.viewPlaylist) {
            const prevID = this.playlistEntry.previousElementSibling.id.substring(3);
            songElements.setViewPlaylist(data.playlists.get(prevID), true);
        }
        else if (this === data.curr.listenPlaylist && this.songs.has(data.curr.song)) {
            play.setSong("none");
            data.curr.listenPlaylist = "none";
        }

        for (const song of this.songs) 
            song.removeFromPlaylist(this);
        
        data.playlists.delete(this.id);

        this.playlistEntry.remove();
        if (this.groupElem) this.groupElem.remove();
        this.checkboxDiv.remove();

        console.log("deleted playlist " + this.title);
    }

    update(options) {        
        this.title = options.title;
        this.desc = options.desc;

        this.songs = new Set();
        for (const sid of options.songs) 
            data.songs.get(sid).addToPlaylist(this);

        if (this === data.curr.viewPlaylist) {
            songElements.playlistHeader.innerText = this.title;
            songElements.playlistDesc.innerText = this.desc;
            this.playlistEntry.firstElementChild.innerText = this.title;
        }
    }
    
}

export const data = {

    Song: Song,
    Playlist: Playlist,

    settings: {
        shuffle: false
    },

    curr: {
        /** @type {Song} */
        song: null,
        /** @type {Playlist} playlist currently listening */
        listenPlaylist: null,
        /** @type {Playlist} playlist currently viewing */
        viewPlaylist: null,
    },

    /** @type {Map<string, string>} songID -> filename */
    trashqueue: null,

    /** pid -> playlist @type {Map<string, Playlist>} */
    playlists: new Map(),

    /** sid -> song @type {Map<string, Song>} */
    songs: new Map(),

    /** set `listenPlaylist` to `viewPlaylist` and initialize shuffle  */
    updateListenPlaylist() {
        
        if (data.curr.viewPlaylist === "none") {
            if (data.curr.listenPlaylist === "none") return;

            play.setSong("none");
            data.curr.listenPlaylist = "none";
            console.log("listenplaylist set to none");
            return;
        }

        data.curr.listenPlaylist = data.curr.viewPlaylist;
        
        if (!data.curr.listenPlaylist.cycle)
            data.curr.listenPlaylist.cycle = new PlaylistCycle(data.curr.listenPlaylist);

        else data.curr.listenPlaylist.cycle._reshuffle(data.settings.shuffle);
    },

    stringify(obj, ignore) {
        obj = obj ?? this;
        ignore = ignore ?? [];
        ignore.push(
            "viewPlaylist",
            "id",
            "groupElem",
            "songEntries",
            "playlistEntry",
            "checkboxDiv",
            "cycle"        
        );

        return JSON.stringify(obj, 
            (key, value) => {
                if (value instanceof Function) return undefined;

                if (ignore.includes(key)) return undefined;
                
                if (value instanceof Set) {
                    if (key === "songs") return Array.from(value).map(v => v.id);
                    else return undefined;
                } 
                if (key === "song" || key === "listenPlaylist") return value? value.id : undefined;
                if (key === "trashqueue") return Array.from(value);
                if (value instanceof Map) return Object.fromEntries(value);
                
                return value;
            }, 4
        )
    },
    
    async saveDataLocal() {    
        await fetch("http://localhost:5000/files/save-userdata", {
            method: "PUT",
            body: this.stringify()
        })
    }
};



async function fetchUserdata() {
    const res = await fetch("http://localhost:5000/files/read-userdata");
    const json = await res.json();

    data.trashqueue = new Map(json.trashqueue);

    for (const sid in json.songs)         
        new Song(sid, json.songs[sid]);

    for (let pid in json.playlists) {
        const playlistJSON = json.playlists[pid];
        new Playlist(pid, playlistJSON);
    }

    play.setSong( data.songs.get(json.curr.song) );

    songElements.setViewPlaylist(data.playlists.get(json.curr.listenPlaylist), true);

    data.settings = json.settings;
    play.setShuffle(json.settings.shuffle);
    play.audio.volume = json.settings.volume;
    
}
fetchUserdata();