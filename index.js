let jsonData; // Global variable to store the JSON data
let resultFolderHandle; // Global variable to store the folder handle of the "result" folder

async function openDirectory() {
    // Request directory handle
    const directoryHandle = await window.showDirectoryPicker();

    // Find and list the contents of the "trials" folder
    const trialsFolderHandle = await findTrialsFolder(directoryHandle);

    if (trialsFolderHandle) {
        await listTrialFolders(trialsFolderHandle, document.getElementById('trial-links'));
    } else {
        // If "trials" folder doesn't exist, display a message
        const messageElement = document.createElement('p');
        messageElement.textContent = 'No "trials" folder found.';
        document.getElementById('trial-links').appendChild(messageElement);
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
    const openDirectoryButton = document.getElementById('open-directory-button');
    const trialLinks = document.getElementById('trial-links');
    const backToTrials = document.getElementById('back-to-trials');
    const videoAndResult = document.getElementById('video-and-result');
    const jsonTableContainer = document.getElementById('json-table-container');
    const jsonTableBody = document.getElementById('json-table-body');



    openDirectoryButton.style.display = 'none';
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

            rowData.appendChild(idCell);
            rowData.appendChild(startTimeCell);
            rowData.appendChild(endTimeCell);
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
    const openDirectoryButton = document.getElementById('open-directory-button');
    const trialLinks = document.getElementById('trial-links');
    const backToTrials = document.getElementById('back-to-trials');
    const videoAndResult = document.getElementById('video-and-result');
    const jsonTableContainer = document.getElementById('json-table-container');

    openDirectoryButton.style.display = 'block';
    trialLinks.style.display = 'block';
    backToTrials.style.display = 'none';
    videoAndResult.style.display = 'none';
    jsonTableContainer.style.display = 'none';
}