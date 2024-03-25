import * as songElements from "./songElements.js";
import {setSong, SongNode, nextSongShuffle } from "./play.js";

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
        this.songElems = null;
        /** @type {SongNode} */
        this.songNode = null;

        data.songs.set(this.id, this);
    }

    addToPlaylist(playlist) {
        playlist.songs.add(this);
        this.playlists.add(playlist);

        if (playlist === data.curr.listenPlaylist) {
            SongNode.addNode(this, data.settings.shuffle);
        }

        return songElements.createSongEntry(this, playlist);
    }

    removeFromPlaylist(playlist) {
        playlist.songs.delete(this);
        this.playlists.delete(playlist);
        songElements.deleteSongEntry(this, playlist);
    }

    delete() {

        // if song in curr playlist, delete SongNode. 
        // if it isnt, no need to delete as future updatePlaylistCycle() wont include this song
        if (this.playlists.has(data.curr.listenPlaylist)) {
            this.songNode.delete();
        }

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

        data.playlists.set(pid, this);
        songElements.createPlaylistElems(this);
    }
}

export const data = {

    Song: Song,
    Playlist: Playlist,

    settings: {
        shuffle: true
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
        this.curr.listenPlaylist = this.curr.viewPlaylist;
        SongNode.updatePlaylistCycle(this.curr.listenPlaylist, data.settings.shuffle);
    },

    async saveData(cb) {
    
        const stringified = JSON.stringify(data, 
            (key, value) => {
                if (value instanceof Function) return undefined;

                const ignore = [
                    "id",
                    "groupElem",
                    "songElems",
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

    data.curr.song = data.songs.get(json.curr.song);
    setSong(data.curr.song);

    songElements.setViewPlaylist(data.playlists.get(json.curr.listenPlaylist), true);
    data.updateListenPlaylist();
}
fetchUserdata();