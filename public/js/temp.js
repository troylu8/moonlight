document.getElementById("next").onclick = async () => {
    const res = await fetch("http://127.0.0.1:5000/data/save", {method: "PUT"});
    console.log(await res.text());
}