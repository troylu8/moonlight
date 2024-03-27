import * as songElements from "./songElements.js";
import * as play from "./play.js";
import { PlaylistCycle } from "./play.js";

export class Song {
    constructor(id, options, playlists) {
        this.id = id;
        this.filename = options.filename;
        this.title = options.title;
        this.artist = options.artist;
        this.size = options.size;
        this.duration = options.duration;
        
        /** @type {Set<Playlist>} */
        this.playlists = new Set(playlists);
        /** @type {Set<HTMLElement>} */
        this.songEntries = new Set();

        data.songs.set(this.id, this);
    }

    /** @param {Playlist} playlist */
    addToPlaylist(playlist) {
        playlist.songs.add(this);
        this.playlists.add(playlist);

        songElements.createSongEntry(this, playlist);

        if (playlist.cycle)
            playlist.cycle.addNode(this, data.settings.shuffle);
    }

    /** @param {Playlist} playlist */
    removeFromPlaylist(playlist) {
        playlist.songs.delete(this);
        this.playlists.delete(playlist);
        if (playlist.groupElem) songElements.deleteSongEntry(this, playlist);
        if (playlist.cycle) playlist.cycle.nodes.get(this).delete();
    }

    delete() {        

        for (const playlist of this.playlists) 
            this.removeFromPlaylist(playlist);
        
        data.songs.delete(this);

        fetch("http://localhost:5000/files/" + this.filename, {method: "DELETE"});
    }
}

export class Playlist {
    constructor(pid, title, songs) {
        this.id = pid;
        this.title = title;

        /** @type {Set<Song>} */
        this.songs = new Set(songs);
        /** @type {HTMLElement} */
        this.playlistElem = null;
        /** @type {HTMLElement} */
        this.groupElem = null;
        /** @type {HTMLElement} */
        this.checkboxDiv = null;

        /** @type {PlaylistCycle} */
        this.cycle = null;

        data.playlists.set(pid, this);

        songElements.createPlaylistEntries(this);
        songElements.createPlaylistCheckboxDivs(this);
    
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

    /** pid -> playlist @type {Map<string, Playlist>} */
    playlists: new Map(),

    /** sid -> song @type {Map<string, Song>} */
    songs: new Map(),

    updateListenPlaylist() {
        data.curr.listenPlaylist = data.curr.viewPlaylist;
        
        if (!data.curr.listenPlaylist.cycle)
            data.curr.listenPlaylist.cycle = new PlaylistCycle(data.curr.listenPlaylist);

        data.curr.listenPlaylist.cycle.update(data.settings.shuffle);
    },

    async saveData(cb) {
    
        const stringified = JSON.stringify(data, 
            (key, value) => {
                if (value instanceof Function) return undefined;

                const ignore = [
                    "id",
                    "groupElem",
                    "songEntries",
                    "playlistElem",
                    "checkboxDiv",
                    "songNode",
                    "viewPlaylist"
                ]
                if (ignore.includes(key)) return undefined;
                
                if (value instanceof Set) return (key === "songs")? Array.from(value).map(v => v.id) : undefined;
                if (key === "song" || key === "listenPlaylist") return value.id;
                if (value instanceof Map) return Object.fromEntries(value);
                
                return value;
            }, 4
        )
    
        await fetch("http://localhost:5000/files/save-userdata", {
            method: "PUT",
            body: stringified
        })
    
        if (cb) cb();
    }
};

async function fetchUserdata() {
    const res = await fetch("http://localhost:5000/files/read-userdata");
    const json = await res.json();

    for (const sid in json.songs)         
        new Song(sid, json.songs[sid]);

    for (let pid in json.playlists) {
        const playlistJSON = json.playlists[pid];
        const playlist = new Playlist(pid, playlistJSON.title, playlistJSON.songs.map(sid => data.songs.get(sid)));
        
        for (const song of playlist.songs) 
            song.addToPlaylist(playlist); 
    }

    play.setSong( data.songs.get(json.curr.song) );

    songElements.setViewPlaylist(data.playlists.get(json.curr.listenPlaylist), true);
    
    data.updateListenPlaylist();
    play.setShuffle(json.settings.shuffle);
    
    data.settings = json.settings;
}
fetchUserdata();