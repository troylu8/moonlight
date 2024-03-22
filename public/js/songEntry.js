


function createSongEntry(song) {
    return `
    <div class="song">
        <div class="song__left">
            <button class="song__play"> p </button>
            <div class="song__title"> ${song.title} <span class="song__author"> ${song.artist} </span> </div>    
        </div>

        <div class="song__right">
            <div class="song__duration"> ${song.length} </div>
            <button class="song__options"> ... </button>
        </div>
    </div>`
}