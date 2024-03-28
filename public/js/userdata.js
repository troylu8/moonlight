import * as songElements from "./songElements.js";
import * as play from "./play.js";
import { PlaylistCycle } from "./play.js";

export class Song {
    constructor(id, options, playlists) {
        data.songs.set(id, this);
        this.id = id;
        this.title = options.title;
        this.artist = options.artist;
        this.filename = options.filename;
        this.size = options.size;
        this.duration = options.duration;

        /** @type {Set<HTMLElement>} */
        this.songEntries = new Set();
        
        /** @type {Set<Playlist>} */
        this.playlists = new Set(playlists);
        if (playlists) {
            for (const playlist of playlists) 
                this.addToPlaylist(playlist);
        }
        
    }

    update(options) {
        this.title = options.title;
        this.artist = options.artist;
    }

    /** @param {Playlist} playlist */
    addToPlaylist(playlist) {
        playlist.songs.add(this);
        this.playlists.add(playlist);

        const songElems = songElements.createSongEntry(this, playlist);

        if (playlist.cycle)
            playlist.cycle.addNode(this, data.settings.shuffle);

        return songElems;
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
        
        data.songs.delete(this.id);

        console.log("deleted " + this.title);
        //TODO: enable file delete
        // fetch("http://localhost:5000/files/" + this.filename, {method: "DELETE"});
    }
}

export class Playlist {
    
    constructor(pid, title, songs) {
        data.playlists.set(pid, this);
        this.id = pid;
        this.title = title;
        
        /** @type {HTMLElement} */
        this.playlistEntry = null;
        /** @type {HTMLElement} */
        this.groupElem = null;
        /** @type {HTMLElement} */
        this.checkboxDiv = null;

        /** @type {PlaylistCycle} */
        this.cycle = null;

        songElements.createPlaylistEntries(this);
        songElements.createPlaylistCheckboxDivs(this);

        /** @type {Set<Song>} */
        this.songs = new Set(songs);
        console.log(songs);
        if (songs) {
            for (const song of songs) 
                song.addToPlaylist(this);
        }
        
    }


    delete() {
        for (const song of this.songs) 
            song.removeFromPlaylist(this);
        
        this.playlistEntry.remove();
        if (this.groupElem) this.groupElem.remove();
        this.checkboxDiv.remove();
        
        data.playlists.delete(this.id);

        songElements.setViewPlaylist(null);

        console.log("deleted playlist " + this.title);
    }

    update(options) {
        this.title = options.title;

        this.songs = new Set();
        for (const sid of options.songs) 
            data.songs.get(sid).addToPlaylist(this);
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

    stringify(obj, ignore) {
        obj = obj ?? this;
        ignore = ignore ?? [];
        ignore.push(
            "viewPlaylist",
            "id",
            "groupElem",
            "songEntries",
            "checkboxDiv",
            "cycle",
            "edited"
        );
        console.log(ignore);

        return JSON.stringify(obj, 
            (key, value) => {
                if (value instanceof Function) return undefined;

                if (ignore.includes(key)) return undefined;
                
                if (value instanceof Set) return (key === "songs")? Array.from(value).map(v => v.id) : undefined;
                if (key === "song" || key === "listenPlaylist") return value.id;
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

    for (const sid in json.songs)         
        new Song(sid, json.songs[sid]);

    for (let pid in json.playlists) {
        const playlistJSON = json.playlists[pid];
        console.log(playlistJSON.songs);
        console.log(data.songs);
        new Playlist(pid, playlistJSON.title, playlistJSON.songs.map(sid => data.songs.get(sid)));
    }

    play.setSong( data.songs.get(json.curr.song) );

    songElements.setViewPlaylist(data.playlists.get(json.curr.listenPlaylist), true);
    
    data.updateListenPlaylist();
    play.setShuffle(json.settings.shuffle);
    
    data.settings = json.settings;
}
fetchUserdata();