import { nextSongEntry } from "../play.js";
import { addDragEvent } from "./fx.js";

/**
 * @param {HTMLElement} entry 
 */
export function drag(entry) {

    function mouseInTopHalf(entry, y) {
        const rect = entry.getBoundingClientRect();
        return y < ( rect.y + rect.height/2 );
    }

    let pos;

    /** the dragging entry will be dropped before this entry */
    let destination;
    let dragBuffer;

    addDragEvent(entry, 
        (e) => {
            entry.style.top = (pos[1] += e.movementY) + "px";

            const hoveringEntry = document.elementFromPoint(pos[0], e.clientY).closest(".song");
            if (hoveringEntry) {
                destination = mouseInTopHalf(hoveringEntry, e.clientY)? hoveringEntry : nextSongEntry(hoveringEntry);
                entry.parentElement.insertBefore(dragBuffer, destination);
            }
        },

        (e) => {
            const rect = entry.getBoundingClientRect();
            entry.style.width = rect.width + "px";
            entry.style.height = rect.height + "px";
            entry.style.top = rect.y + "px";
            entry.style.left = rect.x + "px";
            entry.style.position = "fixed";
            entry.style.pointerEvents = "none";
            pos = [rect.x, rect.y];

            dragBuffer = document.createElement("div");
            dragBuffer.className = "drag__buffer";
            dragBuffer.style.minHeight = rect.height + "px";
            entry.parentElement.insertBefore(dragBuffer, entry);

            destination = entry;
        },

        (e) => {
            console.log("mouseup called on ", entry.song.title);
            ["width", "height", "top", "left", "position", "pointer-events"]
                .forEach(p => entry.style.removeProperty(p));
            
            dragBuffer.replaceWith(entry);
            dragBuffer = destination = null;
        }
    )
}

