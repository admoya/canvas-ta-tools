// ==UserScript==
// @name         Ed Discussion Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Give points to students in discussions and save to a file in Canvas
// @author       Adrian Moya
// @match        https://edstem.org/us/courses/*/discussion/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

'use strict';

let scoreboard = {};
let titleMap = localStorage.getItem('titleMap') || {};
const countNodes = {};
var discussionId = location.href.match(/(?<=discussion\/)\d*/gm)[0];
const databaseFileName = 'discussionPoints.json';

const updateTitleMap = () => {
    let title = document.getElementsByClassName('disthrb-title')[0].textContent.split('#')[0].trim();
    if (title) {
        titleMap[discussionId] = title;
        localStorage.setItem('titleMap',JSON.stringify(titleMap));
    }
}

const updateScore = (name, increment) => {
    scoreboard[name] = scoreboard[name] + increment;
    countNodes[name].forEach((node) => {
        node.textContent = scoreboard[name];
    });
    saveScores();
}

const loadScores = () => {
    const allScores = JSON.parse(localStorage.getItem('scoreboard')) || {};
    scoreboard = allScores[discussionId] || {};
}

const saveScores = () => {
    const allScores = JSON.parse(localStorage.getItem('scoreboard')) || {};
    allScores[discussionId] = scoreboard;
    localStorage.setItem('scoreboard', JSON.stringify(allScores));
}

var style = document.createElement('style');
style.type = 'text/css';
style.innerHTML = `
.toolbarFlex {display: inline-flex; align-items: center; justify-content: space-around; width: 75px }
.headerToolBarFlex { display: inline-flex; align-items: center; justify-content: space-between; width: 100% }
.sticky {position: sticky; top: 0; z-index: 3}
.
`;

document.head.appendChild(style);
loadScores();
const observeUrlChange = () => {
let oldHref = null;
const body = document.querySelector("body");
const observer = new MutationObserver(mutations => {
    const content = document.querySelector(".disindf-content");
    const authors = document.getElementsByClassName('discom-user-name');
    if (content && authors.length) {
        if (oldHref !== document.location.href) {
            oldHref = document.location.href;
            setTimeout(initializeWhenReady, 2000);
        }
    }
  });
  observer.observe(body, { childList: true, subtree: true });
};

window.onload = observeUrlChange;
var toolbarAdded = false;
const initializeWhenReady = () => {
    if (document.getElementsByClassName('discom-user-name').length && document.getElementsByClassName('disindf-content').length) {
        initialize();
    }
    else {
        setTimeout(initializeWhenReady, 100);
    }
}
const initialize = () => {
    if (!toolbarAdded) {
        const toolbar = document.createElement('div');
        toolbar.className = 'sticky toolbarView';

        const headerBar = document.createElement('div');
        headerBar.className = 'headerBar';
        toolbar.appendChild(headerBar);

        const container = document.createElement('div')
        container.className = 'headerToolBarFlex';
        headerBar.appendChild(container);

        document.getElementsByClassName('disindf-content')[0].prepend(toolbar);
        toolbarAdded = true;
    }
    discussionId = location.href.match(/(?<=discussion\/)\d*/gm)[0];
    loadScores();
    const authors = document.getElementsByClassName('discom-user-name');
    for (const author of authors){
        const name = author.textContent;
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