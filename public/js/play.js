import { addSliderDragEvent } from "./sliders.js";
import { getTimeDisplay } from "./songElements.js";
import { data, Song } from "./userdata.js";

const audio = new Audio();

export const titleElem = document.getElementById("info__title");
export const artistElem = document.getElementById("info__artist");

/** `null` when shuffle is off 
 * @type {Array<string>} song history, contains ids instead of object references so that deleted songs can be garbage collected */
export let history = data.settings.shuffle? [] : null;
console.log(data.settings.shuffle, "shuffle");
/** @type {number} points to current song */
export let historyIndex = -1;

/** set a new currently playing song, will reset seek to beginning*/
export function setSong(song, withHoldFromHistory) {
    if (!song) return;
    if (song === "none") {
        audio.src = "";
        data.curr.song = null;

        titleElem.innerText = "-";
        artistElem.innerText = "-";
        data.curr.song = undefined
        return;
    };

    //TODO: WHEN USING ELECTRON, USE ./ INSTEAD OF ../
    audio.src = "../resources/songs/" + encodeURIComponent(song.filename);
    data.curr.song = song;

    titleElem.innerText = song.title;
    artistElem.innerText = song.artist;

    if (!withHoldFromHistory && history) {
        history.push(song.id);
        historyIndex = history.length-1;
    }
}

export function togglePlay(song) {
    // same song
    if (song === undefined || song === data.curr.song) {
        if (data.curr.song == null) return;
        if (audio.paused)   audio.play();
        else                audio.pause();
    }
    
    // new song
    else {
        setSong(song);
        audio.play();
    }

}

document.getElementById("play").onclick = () => togglePlay();

const volume = document.getElementById("volume-slider");

addSliderDragEvent(volume, () => {
    audio.volume = volume.value / 100;
})


const mute = document.getElementById("mute");
mute.addEventListener("click", () => {
    audio.muted = !audio.muted;
    mute.innerText = audio.muted? "unmute" : "mute";
});


const seek = document.getElementById("seek__slider");
const seekPassed = document.getElementById("seek__passed");
const seekTotal = document.getElementById("seek__total");


audio.addEventListener("loadedmetadata", () => { 
    seek.value = 0;
    seek.updateSliderColors(); 
    seek.max = Math.floor(audio.duration);
    seekTotal.innerText = getTimeDisplay(audio.duration);
});

audio.addEventListener("timeupdate", () => {
    if (seek.dragging) return;

    seek.value = audio.currentTime;
    seek.updateSliderColors(); 
    seekPassed.innerText = getTimeDisplay(audio.currentTime);
})

addSliderDragEvent(seek, () => {
    seekPassed.innerText = getTimeDisplay(seek.value);
}); 

seek.addEventListener("mouseup", () => { audio.currentTime = seek.value; });


export class SongNode {
    
    /** @type {SongNode} `SongNode` of last song in current playlist order */
    static last;

    /**
     * sole purpose is to be used to generate random SongNodes in O(1) amortized
     * 
     * NOT NECESSARILY IN ORDER!!!
     * 
     * `SongNode.last` ISNT ALWAYS THE LAST ELEMENT IN THIS ARR
     * @type {Array<SongNode>} `null` when shuffle is off */
    static all;

    constructor(song, prev, next) {
        /** @type {SongNode} */
        this.next = next;
        if (next) next.prev = this;

        /** @type {SongNode} */
        this.prev = prev;
        if (prev) prev.next = this;

        /** @type {Song} */
        this.song = song;

        this.index = (prev)? prev.index + 1 : 0;

        song.songNode = this;
    }

    delete() {
        if (SongNode.last.next === SongNode.last.next.next) {
            SongNode.last = null;
            if (SongNode.all) SongNode.all = [];
            console.log("deleted sole node");
            return;
        };

        if (SongNode.all) {
            const lastInArr = SongNode.all[SongNode.all.length-1];
            swap(SongNode.all, this.index, SongNode.all.length-1);
            lastInArr.index = this.index;
        }

        if (this === SongNode.last) {
            SongNode.last = this.prev;

            if (SongNode.all) SongNode.all.pop();
        }

        this.prev.next = this.next;
        this.next.prev = this.prev;
    }

    static addNodeToEnd(song) {
        const newNode = new SongNode(song, SongNode.last, SongNode.last.next);
        SongNode.last = newNode;
        if (SongNode.all) SongNode.all.push(newNode);
        return newNode;
    }

    static addNode(song, shuffle) {
        if (shuffle) {
            
            const other = SongNode.all[Math.floor(Math.random() * SongNode.all.length)];
            console.log("other ", other);
            // add a copy of the other node to the end...
            SongNode.addNodeToEnd(other.song);

            // ...then edit the original other node to feature new song
            other.song = song;
            song.songNode = other;
        }
        else this.addNodeToEnd(song);
    }

    static createCycle(playlist, shuffle, randomizeCurrentSong) {
        data.curr.listenPlaylist = playlist;

        const songNodes = Array.from(playlist.songs).map(s => s.songNode ?? new SongNode(s));
        const currentIndex = data.curr.song.songNode.index;
        
        // if SongNode.all == null (shuffle was off previously) then shuffle evenly
        if (shuffle) {
            randomize(songNodes);
            // if previous round was shuffled, kick away recently played songs so they arent played again soon
            if (SongNode.all != null) {
                const recentlyPlayed = new Set();
                let p = data.curr.song.songNode;
                console.log(p);
                for (let i = 0; i < songNodes.length/4; i++) {
                    recentlyPlayed.add(p);
                    p = p.prev;
                }
                // console.log("recently played", Array.from(recentlyPlayed).map(n => n.song.title));

                kickAway(songNodes, currentIndex, recentlyPlayed);
                // console.log("kicked away from", currentIndex);
            
                if (randomizeCurrentSong) {
                    swap(
                        songNodes, currentIndex, 
                        rand(currentIndex, currentIndex + recentlyPlayed.size-1) % songNodes.length
                    );
                    setSong(songNodes[currentIndex].song);
                }
            }
        }
                        
        for (let i = 0; i < songNodes.length; i++) {
            songNodes[i].prev = songNodes[i === 0 ? songNodes.length-1 : i-1 ];
            songNodes[i].next = songNodes[(i+1) % songNodes.length];
        }

        SongNode.all = shuffle? songNodes : null;        
        
        // last is the previous of the current song upon creating cycle
        SongNode.last = data.curr.song.songNode.prev;

        // SongNode.print();
    }
    static updatePlaylistCycle(randomizeCurrentSong) {
        SongNode.createCycle(data.curr.listenPlaylist, data.settings.shuffle, randomizeCurrentSong);
        console.log("updated");
    }

    static print() {

        if (SongNode.last == null) return console.log("no song nodes");

        console.log("SongNode.all", SongNode.all? SongNode.all.map(n => n.song.title) : "null" );
        
        for (let p = data.curr.song.songNode; p !== SongNode.last; p = p.next) {
            console.log(p.song.title);
        }
        console.log("last: ", SongNode.last.song.title);
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

function randomize(arr) {
    for (let i = 0; i < arr.length; i++) 
        swap(arr, i, rand(i, arr.length-1));
    return arr;
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



document.getElementById("next").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    if (!data.settings.shuffle) 
        return togglePlay(data.curr.song.songNode.next.song);

    
    // if not at the top of history stack, play next in stack
    if (historyIndex < history.length-1) {
        console.log("not at top of history yet");
        console.log(historyIndex, history.map(id => data.songs.get(id).title));

        setSong( data.songs.get(history[++historyIndex], true) );
        return;
    }

    if (data.curr.song.songNode === SongNode.last) {
        SongNode.updatePlaylistCycle(true);
        audio.play();
    }

    togglePlay(data.curr.song.songNode.next.song);

    console.log("added to history");
    console.log(historyIndex, history.map(id => data.songs.get(id).title));
})

document.getElementById("prev").addEventListener("click", () => {
    if (data.curr.listenPlaylist.songs.size <= 1) return;

    if (!data.settings.shuffle) 
        togglePlay(data.curr.song.songNode.prev.song);
    
    else {
        togglePlay( data.songs.get(history[historyIndex--]) );
    }
        
})

const shuffleBtn = document.getElementById("shuffle")
shuffleBtn.addEventListener("click", () => {
    data.settings.shuffle = !data.settings.shuffle;
    SongNode.updatePlaylistCycle(false);

    history = data.settings.shuffle? [] : null;
    historyIndex = -1;

    console.log("shuffle ", data.settings.shuffle);
    shuffleBtn.innerText = data.settings.shuffle? "sh" : "__";
})