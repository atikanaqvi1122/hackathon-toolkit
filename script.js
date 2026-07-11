// Ensure the table is empty on initial load if no data exists
window.onload = function() {
    console.log("Page loaded. Checking for saved data...");
    let savedData = localStorage.getItem("hackathonData");
    if (savedData) {
        document.getElementById("teamBody").innerHTML = savedData;
        console.log("Data successfully loaded from browser memory!");
    }
};

function saveData() {
    let tbody = document.getElementById("teamBody");
    localStorage.setItem("hackathonData", tbody.innerHTML);
    console.log("Data saved!");
}

function addTeam() {
    let name = document.getElementById("teamName").value;
    let link = document.getElementById("link").value;
    let tbody = document.getElementById("teamBody");

    if (!name) return; // Prevent empty teams

    let row = tbody.insertRow(-1);
    row.innerHTML = `
        <td>${name}</td>
        <td><a href="${link}" target="_blank">View</a></td>
        <td>In Progress</td>
        <td><input type="number" min="1" max="5" value="1"></td>
        <td><input type="text" placeholder="Note..."></td>
        <td><button onclick="toggleStatus(this)">Toggle</button></td>
    `;
    
    document.getElementById("teamName").value = "";
    document.getElementById("link").value = "";
    saveData(); 
}

function toggleStatus(btn) {
    let row = btn.parentNode.parentNode;
    let statusCell = row.cells[2];
    statusCell.innerText = (statusCell.innerText === "In Progress") ? "Submitted" : "In Progress";
    saveData(); 
}
