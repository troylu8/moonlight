import { createSearchResultEntry } from '../view/elems.js';
const yts = require('yt-search');


export async function searchYT(query) {
    console.log("searching for ", query);
    const res = await yts(query);

    const all = res.all.filter(sr => sr.type === "video" || sr.type === "list");
    
    searchResults.innerHTML = "";
    if (all.length === 0) searchResults.innerHTML = "no results found."
    else for (const result of all) createSearchResultEntry(result);
}

const search = document.getElementById("search-yt__input");
const searchResults = document.getElementById("search-results");

searchResults.close = () => {
    searchResults.style.display = "none";
    searchResults.innerHTML = "";

    search.style.borderRadius = "5px";
    search.style.outline = "";

    search.value = "";
}

search.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    searchResults.style.display = "block";
    search.style.borderRadius = "5px 5px 0 0";
    search.style.outline = "solid 3px var(--accent-color)";
    
    let c = 0;
    const loadingAnimation = setInterval(() => {
        searchResults.innerHTML = "searching" + "...".substring(0, c++ % 4);
    }, 100);

    await searchYT(search.value);
    
    clearInterval(loadingAnimation);
});

document.body.addEventListener("mousedown", (e) => {
    if (searchResults.style.display === "block" && !searchResults.parentElement.contains(e.target)) 
        searchResults.close();
});

