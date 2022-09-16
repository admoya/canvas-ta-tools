// ==UserScript==
// @name         Canvas Discussion Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Give points to students in discussions and save to a file in Canvas
// @author       Adrian Moya
// @match        https://gatech.instructure.com/courses/*/discussion_topics/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

'use strict';

let scoreboard = {};
const countNodes = {};
const discussionId = location.href.match(/(?<=discussion_topics\/)\d*/gm)[0];
const databaseFileName = 'discussionPoints.json'
const saveBtn = document.createElement('button');

const updateScore = (name, increment) => {
    scoreboard[name] = scoreboard[name] + increment;
    countNodes[name].forEach((node) => {
        node.textContent = scoreboard[name];
    });
    enableSaveButton();
}

const cleanName = (name) => {
    let newName = name;
    const pronounsIdx = name.search(/\(.*/gm);
    if (pronounsIdx > 0){
        newName = newName.substr(0, name.search(/\(.*/gm));
    }
    return newName.trim();
}

const getCSRFToken = () => decodeURIComponent(document.cookie.match(/(?<=_csrf_token=).*%3D%3D/gm)[0]);

const downloadAllDiscussions = async () => {
    const files = await fetch('https://gatech.instructure.com/api/v1/folders/3176877/files?include%5B%5D=user&include%5B%5D=usage_rights&include%5B%5D=enhanced_preview_url&include%5B%5D=context_asset_string&per_page=20&sort=&order=').then(d => d.json());
    const databaseFile = files.find(({filename}) => filename === databaseFileName);
    return fetch(`https://gatech.instructure.com/files/${databaseFile.id}/download?download_frd=1`).then(d => d.json());
}

const downloadScores = async () => {
    const allDiscussions = await downloadAllDiscussions();
    scoreboard = allDiscussions[discussionId] || {};
    disableSaveButton();
}

const uploadScores = async () => {
    const { upload_url } = await fetch('https://gatech.instructure.com/api/v1/folders/3176877/files', {
        method: 'POST',
        headers: {"x-csrf-token": getCSRFToken()},
        body: JSON.stringify(
            {
                "name":"discussionPoints.json",
                "content_type":"text/plain",
                "on_duplicate":"overwrite",
                "parent_folder_id":"3176877",
                "no_redirect":true
            }
        )
    }).then(data => data.json());

    const allDiscussions = await downloadAllDiscussions();
    allDiscussions[discussionId] = scoreboard;


    const data = new FormData();
    data.append('fileName', 'discussionPoints.json');
    data.append('content_type', 'application/json');
    data.append('file', new Blob([JSON.stringify(allDiscussions, null, 2)]), { type: 'application/json'});

    await fetch(upload_url, {
        method: 'POST',
        headers: {"x-csrf-token": getCSRFToken()},
        body: data
    });
    disableSaveButton();
}

const enableSaveButton = () => {
    saveBtn.className = 'btn edit-btn';
}

const disableSaveButton = () => {
    saveBtn.className = 'btn published disabled btn-published';
}

var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = `
.toolbarFlex {display: inline-flex; align-items: center; justify-content: space-around; width: 75px }
.headerToolBarFlex { display: inline-flex; align-items: center; justify-content: space-between; width: 100% }
.sticky {position: sticky; top: 0; z-index: 3}
.
`;

(async () => {
    document.head.appendChild(style);
    await downloadScores();
    window.onload = () => {
        disableSaveButton();
        const toolbar = document.createElement('div');
        toolbar.className = 'sticky toolbarView';

        const headerBar = document.createElement('div');
        headerBar.className = 'headerBar';
        toolbar.appendChild(headerBar);

        const container = document.createElement('div')
        container.className = 'headerToolBarFlex';
        headerBar.appendChild(container);

        const h3 = document.createElement('h3')
        h3.textContent = 'Discussion Helper';
        container.appendChild(h3);

        saveBtn.textContent = "Save"
        saveBtn.onclick = uploadScores;

        // saveBtn.disabled = true;
        container.appendChild(saveBtn);


        document.getElementById('content').prepend(toolbar);

        const authors = document.getElementsByClassName('author');
        for (const author of authors){
            const name = cleanName(author.text);
            if (!scoreboard[name]) {
                scoreboard[name] = 0
            }
            if (!countNodes[name]) {
                countNodes[name] = []
            }

            const toolbar = document.createElement('span');
            toolbar.className = 'toolbarFlex'

            const scoreCount = document.createElement('p')
            scoreCount.textContent = scoreboard[name]
            countNodes[name].push(scoreCount)

            const b1 = document.createElement('button')
            b1.textContent = '+'
            b1.onclick = () => updateScore(name, 1)

            const b2 = document.createElement('button')
            b2.textContent = '-'
            b2.onclick = () => updateScore(name, -1)

            toolbar.appendChild(b1)
            toolbar.appendChild(b2)
            toolbar.appendChild(scoreCount)

            author.parentElement.appendChild(toolbar)
        }

    }
})();
