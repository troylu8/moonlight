document.getElementById("next").onclick = async () => {
    const res = await fetch("http://127.0.0.1:5000/userdata/save", {method: "PUT"});
    console.log(await res.text());
}
document.getElementById("prev").onclick = async () => {
    const res = await fetch("http://127.0.0.1:5000/userdata/test-print-playlists");
    console.log(await res.text());
}