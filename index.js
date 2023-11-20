let jsonData; // Global variable to store the JSON data
let resultFolderHandle; // Global variable to store the folder handle of the "result" folder

const target = document.getElementById("drag-drop-area");
const dropzoneText = document.getElementById("box-container")
target.addEventListener("dragenter", (event) => {
    // highlight potential drop target when the draggable element enters it
    if (event.target.classList.contains("dropzone")) {
        event.target.classList.add("dragover");
        dropzoneText.classList.add("pointer");
    }
});

target.addEventListener("dragleave", (event) => {
    // reset background of potential drop target when the draggable element leaves it
    if (event.target.classList.contains("dropzone")) {
        event.target.classList.remove("dragover");
        dropzoneText.classList.remove("pointer");
    }
});

// creating custom player controls for the video

// Video
var video = document.getElementById("video-iframe");
// Buttons
var playButton = document.getElementById("play-pause");
// Sliders
var seekBar = document.getElementById("seek-bar");

var timeDisplay = document.getElementById("display-time");

// Event listener for the play/pause button
playButton.addEventListener("click", function () {
    if (video.paused == true) {
        // Play the video
        video.play();
        // Update the button text to 'Pause'
        playButton.innerHTML = "Pause";
    } else {
        // Pause the video
        video.pause();
        // Update the button text to 'Play'
        playButton.innerHTML = "Play";
    }
});
// Event listener for the seek bar
seekBar.addEventListener("change", function () {
    // Calculate the new time
    var time = video.duration * (seekBar.value / 100);

    // Update the video time
    video.currentTime = time;

});
// Update the seek bar as the video plays
video.addEventListener("timeupdate", function () {
    // Calculate the slider value
    var value = (100 / video.duration) * video.currentTime;
    // Update the slider value
    seekBar.value = value;
    timeDisplay.innerText = video.currentTime;
});



async function openDirectory() {
    // Request directory handle
    const directoryHandle = await window.showDirectoryPicker();

    // Find and list the contents of the "trials" folder
    const trialsFolderHandle = await findTrialsFolder(directoryHandle);

    if (trialsFolderHandle) {
        await listTrialFolders(trialsFolderHandle, document.getElementById('trial-links'));
    } else {
        // If "trials" folder doesn't exist, display a message
        alert(" No trial folders found! Please upload Sampledata folder ");
    }
}
async function handleDrop(event) {
    event.preventDefault();
    const fileHandlesPromises = [...event.dataTransfer.items]
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFileSystemHandle());

    for await (const handle of fileHandlesPromises) {
        if (handle.kind === 'directory') {
            const trialsFolderHandle = await findTrialsFolder(handle);
            if (trialsFolderHandle) {
                await listTrialFolders(trialsFolderHandle, document.getElementById('trial-links'));
            } else {
                // If "trials" folder doesn't exist, display a message
                alert(" No trial folders found! Please upload the Sampledata folder ");
                location.reload();
            }
        }
        else {
            alert(" Please upload the Sampledata folder ");
            location.reload();
        }
    }
}

function handleDragOver(event) {
    event.preventDefault();
}

async function findTrialsFolder(directoryHandle) {
    for await (const entryHandle of directoryHandle.values()) {
        if (entryHandle.name === 'trials' && entryHandle.kind === 'directory') {
            return entryHandle;
        }
    }
    return null;
}

async function itemHandleToDirectoryHandle(itemHandle) {
    if (itemHandle.getAsFileSystemHandle) {
        return await itemHandle.getAsFileSystemHandle();
    } else if (itemHandle.isFile) {
        // If it's a file, get the file and then the directory from its handle
        const file = await itemHandle.getFile();
        const directory = await file.getDirectory();
        return directory;
    } else {
        throw new Error('Unsupported itemHandle type');
    }
}
async function findTrialsFolder(directoryHandle) {
    for await (const entryHandle of directoryHandle.values()) {
        if (entryHandle.name === 'trials' && entryHandle.kind === 'directory') {
            return entryHandle;
        }
    }
    return null;
}

async function listTrialFolders(trialsFolderHandle, container) {

    const DragDropArea = document.getElementById("drag-drop-area");

    DragDropArea.style.display = 'none';

    for await (const entryHandle of trialsFolderHandle.values()) {
        if (entryHandle.kind === 'directory' && entryHandle.name.startsWith('trial')) {
            // If it's a directory that starts with "trial," create a clickable link to view video and result
            const directoryLink = document.createElement('a');
            directoryLink.textContent = entryHandle.name;
            directoryLink.className = 'directory-link';
            directoryLink.addEventListener('click', async () => {
                await showTrialContent(entryHandle);
            });
            container.appendChild(directoryLink);
            container.appendChild(document.createElement('br')); // Add a line break
        }
    }
}

async function showTrialContent(trialFolderHandle) {

    const DragDropArea = document.getElementById("drag-drop-area");
    const trialLinks = document.getElementById('trial-links');
    const backToTrials = document.getElementById('back-to-trials');
    const videoAndResult = document.getElementById('video-and-result');
    const jsonTableContainer = document.getElementById('json-table-container');
    const jsonTableBody = document.getElementById('json-table-body');




    DragDropArea.style.display = 'none';
    trialLinks.style.display = 'none';
    backToTrials.style.display = 'block';
    videoAndResult.style.display = 'block';
    jsonTableContainer.style.display = 'block';

    for await (const entryHandle of trialFolderHandle.values()) {
        if (entryHandle.kind === 'file' && entryHandle.name.endsWith('.mp4')) {
            // If it's an mp4 video file, play the video in the iframe
            const file = await entryHandle.getFile();
            const fileURL = URL.createObjectURL(file);
            document.getElementById('video-iframe').src = fileURL;
            jsonData = await getJsonData(trialFolderHandle);
            displayJsonData(jsonData, jsonTableBody);
        }
    }
}
async function getJsonData(trialFolderHandle) {
    for await (const entryHandle of trialFolderHandle.values()) {
        if (entryHandle.kind === 'directory' && entryHandle.name === 'result') {
            resultFolderHandle = entryHandle; // Save the folder handle of the "result" folder
            const resultFileHandle = await findResultFile(entryHandle);
            if (resultFileHandle) {
                const resultFile = await resultFileHandle.getFile();
                const resultText = await readTextFile(resultFile);
                return JSON.parse(resultText);
            }
        }
    }
    return null;
}

function displayJsonData(jsonData, tableBody) {
    tableBody.innerHTML = '';

    if (jsonData && jsonData.result) {
        for (const item of jsonData.result) {
            const rowData = document.createElement('tr');
            const idCell = document.createElement('td');
            idCell.contentEditable = true; // Make the cell editable
            // Convert ID value to a string before setting it as text content
            idCell.textContent = String(item.id);
            idCell.addEventListener('input', () => {
                // Update the JSON data when the cell content changes
                item.id = parseInt(idCell.textContent) || 0;
            });

            const startTimeCell = document.createElement('td');
            startTimeCell.contentEditable = true; // Make the cell editable
            startTimeCell.textContent = item.sp_start_time || '';
            startTimeCell.addEventListener('input', () => {
                // Update the JSON data when the cell content changes
                item.sp_start_time = startTimeCell.textContent;
            });

            const endTimeCell = document.createElement('td');
            endTimeCell.contentEditable = true; // Make the cell editable
            endTimeCell.textContent = item.qp_end_time || '';
            endTimeCell.addEventListener('input', () => {
                // Update the JSON data when the cell content changes
                item.qp_end_time = endTimeCell.textContent;
            });

            const actionCell = document.createElement('td');
            const logButton = document.createElement('button');
            logButton.textContent = 'Jump to OKN';
            logButton.addEventListener('click', () => {
                video.currentTime = item.sp_start_time;
            });
            actionCell.appendChild(logButton);

            rowData.appendChild(idCell);
            rowData.appendChild(startTimeCell);
            rowData.appendChild(endTimeCell);
            rowData.appendChild(actionCell);
            tableBody.appendChild(rowData);
        }
    }
}

async function findResultFile(resultFolderHandle) {
    for await (const entryHandle of resultFolderHandle.values()) {
        if (entryHandle.kind === 'file' && entryHandle.name === 'result.json') {
            return entryHandle;
        }
    }
    return null;
}

async function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function saveChanges() {
    if (jsonData && resultFolderHandle) {
        // Convert the updated JSON object back to a string
        const updatedResultText = JSON.stringify(jsonData, null, 2);

        // Generate a unique filename for the new JSON file
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
        const newFilename = `result_${timestamp}.json`;

        // Create a new result.json file in the "result" folder with the updated content
        const newResultFileHandle = await resultFolderHandle.getFileHandle(newFilename, { create: true });
        const writable = await newResultFileHandle.createWritable();
        await writable.write(updatedResultText);
        await writable.close();
    }
}

function showTrialLinks() {

    const DragDropArea = document.getElementById("drag-drop-area");
    const trialLinks = document.getElementById('trial-links');
    const backToTrials = document.getElementById('back-to-trials');
    const videoAndResult = document.getElementById('video-and-result');
    const jsonTableContainer = document.getElementById('json-table-container');

    DragDropArea.style.display = 'none';
    trialLinks.style.display = 'block';
    backToTrials.style.display = 'none';
    videoAndResult.style.display = 'none';
    jsonTableContainer.style.display = 'none';
}

function rotateVideo(direction) {
    var video = document.getElementById('video-iframe');
    var currentRotation = parseInt(video.getAttribute('data-rotation') || 0, 10);

    if (direction === 'clockwise') {
        currentRotation += 90;
    } else {
        currentRotation -= 90;
    }

    video.style.transform = 'rotate(' + currentRotation + 'deg)';
    video.setAttribute('data-rotation', currentRotation);
}