import * as elems from "../view/elems.js";
import * as play from "../play.js";
import { PlaylistCycle } from "../play.js";
import { updateSongEntries } from "../settings/songSettings.js";
import * as acc from "./account.js";
import { deleteSongFile, missingFiles, readUserdata, writeUserdata } from "./files.js";
import { initSettingsCheckboxes } from "../settings/settings.js";
import * as fx from "../view/fx.js";

export class Song {
    constructor(id, options, changeSyncStatus) {
        data.songs.set(id, this);
        this.id = id;
        this.title = options.title;
        this.artist = options.artist;
        
        this.filename = options.filename;
        elems.deleteStragglerEntry(this.filename);

        this.size = options.size;
        this.duration = options.duration;

        /** @type {"local" | "synced" | "doomed"} */
        this.syncStatus = options.syncStatus ?? "local";

        /** @type {Map<Playlist, HTMLElement>} */
        this.songEntries = new Map();

        /** @type {"playable" | "active" | "error"} */
        this.state = "playable";
        
        /** @type {Set<Playlist>} */
        this.playlists = new Set();
        if (options.playlists) {
            for (const pid of options.playlists) this.addToPlaylist(pid, changeSyncStatus);
        }
    }
    
    /** @param {"local" | "synced" | "doomed"} syncStatus cannot set `syncStatus` to `local` when it is `new`*/
    setSyncStatus(syncStatus) {
        this.syncStatus = syncStatus;

        if (syncStatus === "local") fx.setSynced(false);

        for (const songEntry of this.songEntries.values())
            elems.setEntrySyncStatus(songEntry, syncStatus);
    }

    /** @param {"playable" | "active" | "error"} state  */
    setState(state) {
        this.state = state;

        if (state === "error") {
            this.setSyncStatus("local");
            if (data.curr.song === this) play.setSong(null);
        } 
        
        for (const songEntry of this.songEntries.values()) 
            elems.setEntryState(songEntry, state);
    }
    
    update(options) {
        this.title = options.title;
        this.artist = options.artist;
        this.playlists = new Set(options.playlists);
        if (options.playlists) {
            for (const playlist of options.playlists) 
                this.addToPlaylist(playlist, false);
        }
        updateSongEntries();
    }


    /** 
     * @param {Playlist} playlist
     * @param {boolean} changeSyncStatus `true` if adding to playlist should set `.syncStatus` of song and playlist to `"local"`
     * @param {HTMLElement} before 
     */
    addToPlaylist(playlist, changeSyncStatus, before) {
        if ( !(playlist instanceof Playlist) ) playlist = data.playlists.get(playlist);
        
        if (!playlist || playlist.songs.has(this)) return;
        
        if ( changeSyncStatus ?? true ) {
            this.setSyncStatus("local");
            playlist.setSyncStatus("local");
        }

        playlist.songs.add(this);
        this.playlists.add(playlist);

        const songElems = elems.createSongEntry(this, playlist, before);

        if (this === data.curr.song && playlist === data.curr.listenPlaylist && playlist.songs.size !== 0) 
            play.toBeDeleted.set(null, null);
        if (playlist.cycle) playlist.cycle.addSong(this, true);

        return songElems;
    }

    /** @param {Playlist} playlist */
    removeFromPlaylist(playlist) {
        if (!playlist.songs.has(this)) return;

        this.setSyncStatus("local");
        playlist.setSyncStatus("local");

        playlist.songs.delete(this);
        this.playlists.delete(playlist);
        if (playlist.groupElem) elems.deleteSongEntry(this, playlist);

        if (this === data.curr.song && playlist === data.curr.listenPlaylist && playlist.songs.size !== 0) 
            play.toBeDeleted.set(playlist, this);
        else if (playlist.cycle) playlist.cycle.deleteSong(this);
    }

    delete() {
        
        if (this === data.curr.song) {
            if (data.curr.listenPlaylist.songs.size === 1) play.setSong(null);
            else data.curr.listenPlaylist.cycle.setSongNext(!play.audio.paused);
        }

        data.trashqueue.set(this.id, "songs/" + this.filename);

        for (const playlist of this.playlists) 
            this.removeFromPlaylist(playlist);

        play.toBeDeleted.delete();
        data.songs.delete(this.id);

        if (this.state !== "error") deleteSongFile(this.filename);
        missingFiles.delete(this.filename);
    }
}

export class Playlist {
    
    constructor(id, options, changeSyncStatus) {
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

        /** @type {"local" | "synced" | "doomed"} */
        this.syncStatus = options.syncStatus ?? "local";

        elems.createPlaylistEntry(this);
        elems.createPlaylistCheckboxEntry(this);

        /** @type {Set<Song>} */
        this.songs = new Set();
        if (options.songs) {
            for (const sid of options.songs) data.songs.get(sid).addToPlaylist(this, changeSyncStatus);
        }
    }

    /** @param {"local" | "synced" | "doomed"} syncStatus cannot set `syncStatus` to `local` when it is `new`*/
    setSyncStatus(syncStatus) {
        this.syncStatus = syncStatus;

        if (syncStatus === "local") fx.setSynced(false);

        elems.setEntrySyncStatus(this.playlistEntry, syncStatus);
    }

    delete() {
        
        if (this === data.curr.viewPlaylist) elems.setViewPlaylist(null, this === data.curr.listenPlaylist);

        for (const song of this.songs) {
            song.removeFromPlaylist(this);
            if (song.playlists.size === 0) song.delete();
        } 
        
        data.playlists.delete(this.id);

        this.removeElements();

        console.log("deleted playlist " + this.title);
    }

    removeElements() {
        this.playlistEntry.remove();
        if (this.groupElem) this.groupElem.remove();
        this.checkboxDiv.remove();
    }

    update(options) {        
        this.title = options.title;
        this.desc = options.desc;

        this.songs = new Set();
        for (const sid of options.songs) 
            data.songs.get(sid).addToPlaylist(this, false);

        if (this === data.curr.viewPlaylist) {
            elems.playlistHeader.textContent = this.title;
            elems.playlistDesc.innerHTML = this.desc;
            this.playlistEntry.firstElementChild.textContent = this.title;
        }
    }

    getOrderedSIDs() {
        // if this playlist was viewed, then construct arr with songEntries in case they were moved around
        if (this.groupElem) {
            const res = [];
            for (let songEntry = this.groupElem.firstElementChild; songEntry != null ; songEntry = songEntry.nextElementSibling)
                if (songEntry.song) res.push(songEntry.song.id);
            return res;
        }
        return Array.from(this.songs).map(s => s.id);
    }
    
}


class UserData {

    settings = {
        shuffle: false,
    };

    curr = {
        /** @type {Song} */
        song: null,
        /** @type {Playlist} playlist currently listening */
        listenPlaylist: null,
        /** @type {Playlist} playlist currently viewing */
        viewPlaylist: null,
    };

    /** @type {Map<string, string>} songID -> filename */
    trashqueue = null;

    /** pid -> playlist @type {Map<string, Playlist>} */
    playlists = new Map();

    /** sid -> song @type {Map<string, Song>} */
    songs = new Map();

    /** set `listenPlaylist` to `viewPlaylist` and initialize shuffle  */
    updateListenPlaylist() {

        data.curr.listenPlaylist = data.curr.viewPlaylist;
        
        if (!data.curr.listenPlaylist) return play.setSong(null);
        
        if (!data.curr.listenPlaylist.cycle)
            data.curr.listenPlaylist.cycle = new PlaylistCycle(data.curr.listenPlaylist);

        else data.curr.listenPlaylist.cycle._reshuffle(data.settings.shuffle);
    };

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
            function(key, value) {
                if (value instanceof Function) return undefined;
                if (ignore.includes(key)) return undefined;
                
                if (value instanceof Set) {
                    // a Set of songs only appears under data.playlists
                    return (key === "songs")? this.getOrderedSIDs() : undefined;
                } 
                
                if (key === "song" || key === "listenPlaylist") return value? value.id : undefined;
                if (key === "trashqueue") return Array.from(value);
                if (value instanceof Map) return Object.fromEntries(value);
                
                return value;
            }, 4
        )
    };
    
    async saveDataLocal() {   
        await writeUserdata(acc.user.uid, this.stringify());
    }
};

/** @type {UserData}  */
export let data;

export async function loadLocaldata(uid) {
    if (data) {
        for (const playlist of data.playlists.values()) playlist.removeElements();
    }
    data = new UserData();
    
    const json = await readUserdata(uid);
    
    data.trashqueue = new Map(json.trashqueue);

    for (const sid in json.songs)         
        new Song(sid, json.songs[sid], false);

    for (let pid in json.playlists) {
        const playlistJSON = json.playlists[pid];
        new Playlist(pid, playlistJSON, false);
    }

    play.setSong( data.songs.get(json.curr.song) );

    elems.setViewPlaylist(data.playlists.get(json.curr.listenPlaylist), true);

    data.settings = json.settings;
    initSettingsCheckboxes();
    play.setShuffle(json.settings.shuffle);
    play.audio.volume = json.settings.volume;
    document.body.style.setProperty("--sidebar-div-width", data.settings.sidebarWidth);
    document.body.style.setProperty("--playlists-div-width", data.settings.playlistsWidth);
}

export function nullifyData() { data = null; }