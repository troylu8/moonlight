import { Playlist, Song } from "../account/userdata.js";
import { addDragEvent } from "./fx.js";


/** the dragging entry will be dropped before this entry */
let destination;

const a = document.createElement("div");
a.style.position = "fixed";
a.style.width = a.style.height = "5px";
a.style.left = "500px";
a.style.backgroundColor = "red";
a.style.zIndex = "100";

/**
 * @param {HTMLElement} entry 
 * @param {Song} song 
 * @param {Playlist} playlist 
 */
export function drag(entry, song, playlist) {

    function mouseInTopHalf(entry, y) {
        const rect = entry.getBoundingClientRect();
        return y < ( rect.y + rect.height/2 );
    }

    let pos;

    

    addDragEvent(entry, 
        (e) => {
            entry.style.top = (pos[1] += e.movementY) + "px";

            const hoveringEntry = document.elementFromPoint(pos[0], e.clientY).closest(".song");
            if (hoveringEntry) {
                console.log(mouseInTopHalf(hoveringEntry, e.clientY), hoveringEntry.song.title);
            }

            // document.body.appendChild(a);
            // a.style.top = e.clientY+ "px";
        },

        (e) => {
            const rect = entry.getBoundingClientRect();
            entry.style.width = rect.width + "px";
            entry.style.height = rect.height + "px";
            entry.style.top = rect.y + "px";
            entry.style.left = rect.x + "px";
            entry.style.position = "fixed";
            pos = [rect.x, rect.y];

            const buffer = document.createElement("div");
            buffer.className = "drag-buffer";
            buffer.style.minHeight = rect.height + "px";

            entry.parentElement.insertBefore(buffer, entry);

            entry.parentElement.addEventListener("wheel", () => {
                console.log("wheel event");
            });
            entry.style.pointerEvents = "none";

            destination = buffer;
        },

        (e) => {
            entry.style.pointerEvents = "auto";
            destination = null;
        }
    )
}

