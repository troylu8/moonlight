import { addDragEvent } from "./view/fx.js";
import { getTimeDisplay } from "./view/elems.js";
import { setSpin, updateVolumeIcon } from "./view/fx.js";
import { data, Playlist, Song } from "./account/userdata.js";
import { uid } from "./account/account.js";


class SpinningAudio extends Audio {
    play() {
        if (this.src === "") return;
        
        // add to history
        if (inThePresent() && history[historyIndex] != data.curr.song.id) {
            history.push(data.curr.song.id);
            historyIndex++;
        }

        setSpin(true);
        return super.play();
    }
    pause() {
        setSpin(false);
        return super.pause();
    }

    /** @param {boolean} muted */
    set muted(muted) {
        super.muted = muted;
        if (muted) updateVolumeIcon(0);
        else updateVolumeIcon(this.volume);
    }

    /** @param {number} val */
    set volume(val) {
        super.volume = val;
        updateVolumeIcon(val);
    }

    get volume() { return super.volume; }
    get muted() { return super.muted; }
}
export const audio = new SpinningAudio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** 
 * @type {Array<string>} song history, contains ids instead of object references so that deleted songs can be garbage collected */
export const history = [];
/** @type {number} points to current song */
export let historyIndex = -1;

function inThePresent() {
    return historyIndex === history.length-1;
}

/** set a new currently playing song, will reset seek to beginning
 * @param {Song} song 
 * @returns {boolean} `true` if successful, `false` if `song.state === "error"`
*/
export function setSong(song) {
    
    // set previous song to "playable" state
    if (data.curr.song && data.curr.song.state !== "error") data.curr.song.setState("playable");

    // if setting song to none
    if (!song) {
        console.log("set song to none");
        audio.src = "";
        data.curr.song = null;

        titleElem.textContent = "-";
        artistElem.textContent = "-";

        setSpin(false);
        return true;
    };

    if (song.state === "error") return false;

    const path = `resources/users/${uid}/songs/${encodeURIComponent(song.filename)}`;

    audio.src = path;
    data.curr.song = song;

    titleElem.textContent = song.title;
    artistElem.textContent = song.artist;

    toBeDeleted.delete();

    song.setState("active");

    return true;
}

/**
 * @param {Song} song 
 * @returns {boolean} `true` if successful, `false` if `song.state === "error"`
 */
export function togglePlay(song) {
    song = song ?? data.curr.song;

    if (!song || song.state === "error") return false;

    // same song
    if (song === data.curr.song) {
        if (data.curr.song == null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
        return true;
    }

    // new song
    if ( !setSong(song) ) return false;
    audio.play();

    return true;
}

/** if song is removed from playlist while it is playing, remove song from playlist cycle upon next song */
export const toBeDeleted = {
    /** @type {Playlist} */
    playlist: null,
    /** @type {Song} */
    song: null,

    set(playlist, song) {
        this.playlist = playlist;
        this.song = song;
    },

    delete() {
        if (this.playlist) {
            this.playlist.cycle.deleteSong(this.song);
            this.playlist = null;
            this.song = null;
        }
    }
}


document.getElementById("play").addEventListener("click", () => togglePlay());


const seek = document.getElementById("seek__slider");
const seekPassed = document.getElementById("seek__passed");
const seekTotal = document.getElementById("seek__total");


audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration);
    seekTotal.textContent = getTimeDisplay(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime;
    seek.updateSliderColors(); 
    seekPassed.textContent = getTimeDisplay(audio.currentTime);
});
audio.addEventListener("ended", () => nextBtn.dispatchEvent(new Event("click")));

addDragEvent(seek, () => {
    seekPassed.textContent = getTimeDisplay(seek.value);
}); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value; });


export class SongNode {
    
    constructor(cycle, song, prev, next) {
        /** @type {SongNode} */
        this.next = next;
        if (next) next.prev = this;

        /** @type {SongNode} */
        this.prev = prev;
        if (prev) prev.next = this;

        /** @type {Song} */
        this.song = song;

        /** @type {PlaylistCycle} */
        this.cycle = cycle;
        cycle.nodes.set(song, this);

        this.index = (prev)? prev.index + 1 : 0;
    }

    delete() {
        // if this node is alone
        if (this.next === this) {
            this.cycle.last = null;
            return console.log("deleted sole node");
        };

        if (this === this.cycle.last) {
            this.cycle.last = this.prev;
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }
}

export class PlaylistCycle {

    /** `SongNode` of last song in playlist (unshuffled)
     * @type {SongNode} `null` when shuffle is ON */
    last;

    /** @type {Array<Song>} */
    shuffleArr = [];
    currIndex;

    constructor(playlist) {
        /** @type {Playlist} */
        this.playlist = playlist;

        /** @type {Map<Song, SongNode>}*/
        this.nodes = new Map();

        /** @type {Map<Song, number>} song -> index in `shuffleArr`*/
        this.songIndexes = new Map();

        for (const song of playlist.songs) 
            this.addSong(song)
    }

    addSong(song, afterCurrent) {
        this._appendNode(song);
        this._insertSongRandom(song, afterCurrent);
    }

    deleteSong(song) {
        this.nodes.get(song).delete();

        const i = this.songIndexes.get(song);
        this.shuffleArr[i] = this.shuffleArr[this.shuffleArr.length-1];
        this.songIndexes.set(this.shuffleArr[i], i);
        
        this.shuffleArr.pop();
        this.songIndexes.delete(song);
    }

    /** adds node to end */
    _appendNode(song) {
        let newNode;

        // if no nodes, create sole node (points to itself)
        if (!this.last) {
            newNode = new SongNode(this, song);
            newNode.next = newNode;
            newNode.prev = newNode;
        }
        else newNode = new SongNode(this, song, this.last, this.last.next);

        this.last = newNode;
    }
    
    /** inserts a node randomly into `shuffleOrder`
     * @returns {number} the index which it was inserted
     */
    _insertSongRandom(song, afterCurrent) {

        // console.log("adding ", song.title, "to", this.playlist.title, " after? ", afterCurrent);        

        // push new song to end of arr
        this.shuffleArr.push(song);

        const n = this.shuffleArr.length;
        if (n === 1) return this.songIndexes.set(song, 0);

        // swap with random song
        const i = Math.floor(rand(afterCurrent? this.currIndex+1 : 0, n-1));
        swap(this.shuffleArr, i, n-1);

        this.songIndexes.set(song, i);
        this.songIndexes.set(this.shuffleArr[n-1], n-1);

        return i;
    }

    _reshuffle(randomizeCurrSong) {
        // console.log("reshuffling..");

        this.shuffleArr = [];
        this.currIndex = 0;

        for (const song of this.playlist.songs) {
            const i = this._insertSongRandom(song, false);
            if (!randomizeCurrSong && song === data.curr.song) this.currIndex = i;
        }

        const recentsArr = history.slice( -Math.ceil(this.shuffleArr.length/4) ).map(sid => data.songs.get(sid));
        const recents = new Set(recentsArr);
        console.log("recents:", recentsArr.map(s => s.title));
        kickAway(this.shuffleArr, randomizeCurrSong? this.currIndex : (this.currIndex + 1) % this.shuffleArr.length, recents);
    }

    updateCurrIndex() {
        // console.log("updated curr index");
        this.currIndex = this.songIndexes.get(data.curr.song);
    }

    async setSongNext(playSong) {
        if (!data.curr.song) return;
        if (data.curr.listenPlaylist.songs.size <= 1 && !toBeDeleted.playlist) return;

        // if not at the top of history stack, play next in stack
        if (!inThePresent()) {
            console.log("not at top of history yet");
            
            let song;
            do {
                song = data.songs.get(history[++historyIndex]);
            } while ( !song || !setSong(song) ); // if song was deleted || song.state === "error"
    

            if (playSong) audio.play();
            return;
        }
        
        // SHUFFLE OFF
        if (!data.settings.shuffle) {
            let node = this.nodes.get(data.curr.song).next;
            
            while ( !setSong(node.song) ) node = node.next;
        }
        // SHUFFLE ON
        else {
            let song;
            do {

                song = this.shuffleArr[++this.currIndex];

                if (!song) {
                    this._reshuffle(true);
                    song = this.shuffleArr[0];
                }

                // nullify songs we just played so that we reshuffle upon encountering an already played segment
                this.shuffleArr[this.currIndex - 1] = null;

            } while ( !setSong(song) );
        
        }

        if (playSong) audio.play();
    }

    print() {

        if (this.last == null) return console.log("no song nodes");

        const arr = [];
        for (let p = this.last.next; p !== this.last; p = p.next) {
            arr.push(p.song.title);
        }
        arr.push(this.last.song.title);

        // console.log("songnodes: ", arr);
        console.log("shuffleArr: ", this.shuffleArr.map(s => (s == null)? "null" : s.title));
        console.log("currIndex: ", this.currIndex);
    }
}


function rand(min, max) {
    return min + Math.floor(Math.random() * ((max - min) + 1));
}
function swap(arr, i, j) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

/**
 * any items in `banned` are not allowed to be within `banned.size` spaces in front of `start`
 * @param {Array<T>} arr
 * @param {number} start starting index
 * @param {Set<T>} banned 
 */
function kickAway(arr, start, banned) {
    const n = banned.size;

    let space = arr.length - n;

    let door = (start + n) % arr.length;
    for (let c = 0; c < n; c++) {
        const i = (start + c) % arr.length;
        while (banned.has(arr[i])) {
            let out = i;
            while (banned.has(arr[out])) {
                out = rand(door, door + space-1) % arr.length;
            }
            swap(arr, i, out);
        }
    }

    return arr;
}
const nextBtn = document.getElementById("next");
nextBtn.addEventListener("click", async () => 
    data.curr.listenPlaylist.cycle.setSongNext(true)
);

document.getElementById("prev").addEventListener("click", async () => {
    if (!data.curr.song) return;
    if (data.curr.listenPlaylist.songs.size <= 1 && !toBeDeleted.playlist) return;
    
    // SHUFFLE OFF: next in cycle
    if (!data.settings.shuffle) {
        let node = data.curr.listenPlaylist.cycle.nodes.get(data.curr.song).prev;
        while ( !togglePlay(node.song) ) node = node.prev;
    }
    
    // SHUFFLE ON: history
    else {
        let song;
        do {
            if (historyIndex-- === 0) {
                setSong(data.curr.song); // if no more history, replay curr song from beginning
                return audio.play();
            } 
            song = data.songs.get(history[--historyIndex]);
        } while ( !song || !setSong(song) ); // if song was deleted || song.state === "error"
    }
})

const shuffleSvg = document.getElementById("shuffle-svg");

export function setShuffle(shuffle) {
    data.settings.shuffle = shuffle;
    
    if (shuffle && data.curr.listenPlaylist) data.curr.listenPlaylist.cycle.updateCurrIndex();
    
    console.log("shuffle ", shuffle);
    shuffleSvg.style.stroke = shuffle? "var(--accent-color)" : "var(--primary-color)";
}

document.getElementById("shuffle").addEventListener("click", () => setShuffle(!data.settings.shuffle));