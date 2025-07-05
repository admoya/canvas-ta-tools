// ==UserScript==
// @name         Ed Discussion Helper Enhanced
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Grade Ed discussion posts with counts, navigation, and bottom sticky toolbar for batch grading and student jump tools. Handles SPA transitions and improves styling clarity for toolbar and scores.
// @author       Adrian
// @match        https://edstem.org/us/courses/*/discussion/*
// @grant        none
// ==/UserScript==

'use strict';

let scoreboard = {};
const countNodes = {};
const postMap = {};
let discussionId = location.href.match(/(?<=discussion\/)[\d]+/)?.[0];

let jumpIndex = 0;
let jumpFilterEnabled = true;
let jumpList = [];

function loadScores() {
    const allScores = JSON.parse(localStorage.getItem('scoreboard') || '{}');
    scoreboard = allScores[discussionId] || {};
}

function saveScores() {
    const allScores = JSON.parse(localStorage.getItem('scoreboard') || '{}');
    allScores[discussionId] = scoreboard;
    localStorage.setItem('scoreboard', JSON.stringify(allScores));
}

function scrollToElement(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.border = '2px solid orange';
    setTimeout(() => (el.style.border = ''), 1000);
}

function createButton(label, handler, title = '') {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'ed-helper-button';
    btn.onclick = handler;
    if (title) btn.title = title;
    return btn;
}

function createNavigation(name, index) {
    const posts = postMap[name];
    if (posts.length < 2) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'ed-helper-info';

    const counter = document.createElement('span');
    counter.textContent = `(${index + 1}/${posts.length})`;

    const prevBtn = createButton('◀', () => scrollToElement(posts[index - 1]));
    const nextBtn = createButton('▶', () => scrollToElement(posts[index + 1]));

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === posts.length - 1;

    wrapper.append(counter, prevBtn, nextBtn);
    return wrapper;
}

const style = document.createElement('style');
style.textContent = `
.toolbarFlex {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 10px;
    font-size: 0.9em;
}
.ed-helper-button {
    font-size: 0.9em;
    padding: 2px;
    width: 24px;
    height: 24px;
    text-align: center;
    background-color: #f0f0f0;
    border: 1px solid #aaa;
    border-radius: 3px;
    cursor: pointer;
}
.ed-helper-score {
    font-weight: bold;
    font-size: 1.1em;
    text-align: center;
    min-width: 20px;
}
.ed-helper-info {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.9em;
}
.ed-helper-separator {
    margin: 0 6px;
    border-left: 1px solid #ccc;
    height: 18px;
    align-self: center;
}
#ed-helper-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    background: #f8f8f8;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: center;
    z-index: 1000;
    font-size: 0.9em;
}
#ed-helper-controls {
    display: flex;
    align-items: stretch;
    gap: 32px;
    flex-wrap: wrap;
    max-width: 1000px;
    justify-content: center;
}
.ed-helper-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}
.ed-helper-section > .section-label {
    font-weight: bold;
    font-size: 0.85em;
}
#jump-group {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 12px 16px;
    border: 1px solid #ccc;
    border-radius: 6px;
    background-color: #fff;
    gap: 8px;
}
#jump-group .jump-header {
    font-weight: bold;
    font-size: 1em;
    text-align: center;
}
#jump-group .jump-row {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
}`;
document.head.appendChild(style);

function updateScore(name, delta) {
    scoreboard[name] = (scoreboard[name] || 0) + delta;
    countNodes[name].forEach(node => (node.textContent = scoreboard[name]));
    saveScores();
}

function addPointToAllVisibleStudents() {
    Object.keys(postMap).forEach(name => {
        const posts = postMap[name];
        if (!posts.length) return;
        const userContainer = posts[0].closest('.discom-user');
        if (!userContainer?.querySelector('.discom-user-role .url-admin')) {
            updateScore(name, 1);
        }
    });
}

function buildJumpList() {
    jumpList = Object.entries(postMap)
        .filter(([_, posts]) => !jumpFilterEnabled || posts.length > 1)
        .map(([name, posts]) => ({ name, firstPost: posts[0] }));
    jumpIndex = 0;
    updateJumpUI();
}

function updateJumpUI() {
    const display = document.getElementById('jump-student-name');
    const goToBtn = document.getElementById('jump-go-to');
    const prevBtn = document.getElementById('jump-prev');
    const nextBtn = document.getElementById('jump-next');

    if (jumpList.length === 0) {
        display.textContent = 'No students';
        goToBtn.disabled = true;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const current = jumpList[jumpIndex];
    display.textContent = current.name;
    goToBtn.disabled = false;
    prevBtn.disabled = jumpIndex === 0;
    nextBtn.disabled = jumpIndex === jumpList.length - 1;
}

function addBottomToolbar() {
    const existingGiveAll = document.getElementById('give-all-btn');
    if (existingGiveAll) existingGiveAll.disabled = false;
    const oldFooter = document.getElementById('ed-helper-footer');
    if (oldFooter) oldFooter.remove();

    const footer = document.createElement('div');
    footer.id = 'ed-helper-footer';

    const controls = document.createElement('div');
    controls.id = 'ed-helper-controls';

    const giveAllSection = document.createElement('div');
    giveAllSection.className = 'ed-helper-section';
    const giveAllBtn = document.createElement('button');
    giveAllBtn.textContent = '➕ Give All +1';
    giveAllBtn.id = 'give-all-btn';
    giveAllBtn.onclick = () => {
        addPointToAllVisibleStudents();
        giveAllBtn.disabled = true;
    };
    giveAllSection.appendChild(giveAllBtn);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📤 Export CSV';
    exportBtn.onclick = () => {
        const csv = jsonToCSV(localStorage.getItem('scoreboard'));
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
        a.download = `discussionPoints_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    giveAllSection.appendChild(exportBtn);

    const jumpGroup = document.createElement('div');
    jumpGroup.id = 'jump-group';

    const jumpHeader = document.createElement('div');
    jumpHeader.className = 'jump-header';
    jumpHeader.textContent = 'Jump to Student';

    const jumpRow = document.createElement('div');
    jumpRow.className = 'jump-row';

    const filterToggle = document.createElement('input');
    filterToggle.type = 'checkbox';
    filterToggle.checked = true;
    filterToggle.id = 'jump-filter';
    filterToggle.onchange = () => {
        jumpFilterEnabled = filterToggle.checked;
        buildJumpList();
    };

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Multi-posters';
    filterLabel.htmlFor = 'jump-filter';
    const filterGroup = document.createElement('div');
    filterGroup.style.display = 'flex';
    filterGroup.style.alignItems = 'center';
    filterGroup.style.gap = '4px';
    filterGroup.append(filterToggle, filterLabel);

    const prevBtn = createButton('◀', () => {
        jumpIndex = Math.max(0, jumpIndex - 1);
        updateJumpUI();
    });
    prevBtn.id = 'jump-prev';

    const studentName = document.createElement('span');
    studentName.id = 'jump-student-name';

    const goToBtn = createButton('🎯', () => {
        const post = jumpList[jumpIndex]?.firstPost;
        if (post) scrollToElement(post);
    });
    goToBtn.id = 'jump-go-to';

    const nextBtn = createButton('▶', () => {
        jumpIndex = Math.min(jumpList.length - 1, jumpIndex + 1);
        updateJumpUI();
    });
    nextBtn.id = 'jump-next';

    const studentGroup = document.createElement('div');
    studentGroup.style.display = 'flex';
    studentGroup.style.alignItems = 'center';
    studentGroup.style.gap = '6px';
    studentGroup.append(prevBtn, studentName, goToBtn, nextBtn);

    jumpRow.append(filterGroup, studentGroup);
    jumpGroup.append(jumpHeader, jumpRow);

    controls.append(giveAllSection, jumpGroup);
    footer.appendChild(controls);
    document.body.appendChild(footer);
    document.body.style.paddingBottom = '100px';

function jsonToCSV(json) {
    const data = JSON.parse(json);
    const discussionIds = Object.keys(data);
    const authorSet = new Set();

    discussionIds.forEach(discussionId => {
        const authors = Object.keys(data[discussionId]);
        authors.forEach(author => authorSet.add(author));
    });

    const authors = Array.from(authorSet);
    authors.sort((a,b) => (a.split(' ').pop().localeCompare(b.split(' ').pop())));
    let csvContent = 'Discussion ID,' + authors.join(',') + '\n';

    discussionIds.forEach(discussionId => {
        let row = discussionId;
        authors.forEach(author => {
            row += ',' + (data[discussionId][author] || 0);
        });
        csvContent += row + '\n';
    });

    return csvContent;
}

    buildJumpList();
}

function observeUrlChange() {
    let previousUrl = null;
    const observer = new MutationObserver(() => {
        const content = document.querySelector('.disindf-content');
        if (content && document.querySelectorAll('.discom-user-name').length) {
            if (location.href !== previousUrl) {
                previousUrl = location.href;
                setTimeout(initializeWhenReady, 2000);
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function initializeWhenReady() {
    if (
        document.querySelectorAll('.discom-user-name').length &&
        document.querySelector('.disindf-content')
    ) {
        initialize();
    } else {
        setTimeout(initializeWhenReady, 100);
    }
}

function initialize() {
    discussionId = location.href.match(/(?<=discussion\/)[\d]+/)?.[0];
    loadScores();

    document.querySelectorAll('.ed-helper-toolbar').forEach(el => el.remove());
    const oldFooter = document.getElementById('ed-helper-footer');
    if (oldFooter) oldFooter.remove();

    Object.keys(postMap).forEach(k => delete postMap[k]);
    Object.keys(countNodes).forEach(k => delete countNodes[k]);
    jumpIndex = 0;
    jumpList = [];

    const authors = Array.from(document.querySelectorAll('.discom-user-name'))
        .filter(a => !a.closest('.discom-user')?.querySelector('.discom-user-role .url-admin'));

    authors.forEach((author) => {
        const name = author.textContent.trim();
        postMap[name] = postMap[name] || [];
        countNodes[name] = countNodes[name] || [];
        postMap[name].push(author);
        scoreboard[name] = scoreboard[name] || 0;
    });

    authors.forEach((author) => {
        const name = author.textContent.trim();
        const index = postMap[name].indexOf(author);

        const toolbar = document.createElement('span');
        toolbar.className = 'toolbarFlex ed-helper-toolbar';

        const downBtn = createButton('▼', () => updateScore(name, -1));
        const upBtn = createButton('▲', () => updateScore(name, 1));

        const scoreDisplay = document.createElement('span');
        scoreDisplay.className = 'ed-helper-score';
        scoreDisplay.textContent = scoreboard[name];
        countNodes[name].push(scoreDisplay);

        toolbar.append(downBtn, scoreDisplay, upBtn);

        const nav = createNavigation(name, index);
        if (nav) {
            const separator = document.createElement('div');
            separator.className = 'ed-helper-separator';
            toolbar.append(separator, nav);
        }

        author.parentElement.appendChild(toolbar);
    });

    addBottomToolbar();
}

window.onload = observeUrlChange;
