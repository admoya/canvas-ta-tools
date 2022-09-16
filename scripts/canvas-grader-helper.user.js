// ==UserScript==
// @name         Canvas Grader Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Grade Canvas quizzes faster
// @author       You
// @match        https://gatech.instructure.com/courses/312186/gradebook/speed_grader?assignment_id=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=instructure.com
// @grant        none
// ==/UserScript==

let nextButton;
let prevButton;
let frame;

const modifyFrame = () => {
    if (frame.contentWindow.document.getElementsByClassName('giveCreditBtn').length) {
        return;
    }
    frame.contentWindow.addEventListener('keydown', ({key}) => {
        if (key === 'ArrowRight') {
            nextButton.click();
        }
        if (key === 'ArrowLeft') {
            prevButton.click();
        }
    });

    const updateBtn = frame.contentWindow.document.getElementsByClassName('btn-primary')[0];

    const questionPoints = [...frame.contentWindow.document.getElementsByClassName('question_points_holder')];
    questionPoints.forEach((el) => {
        const questionInput = el.getElementsByClassName('question_input')[0];
        const questionPoints = el.getElementsByClassName('question_points')[0].textContent.replace('/', '').trim();

        const btn = document.createElement('button');
        btn.className = "giveCreditBtn";

        const giveCredit = (e) => {
            e.preventDefault();
            btn.disabled = true;
            questionInput.value = questionPoints;
            questionInput.dispatchEvent(new Event('change'));
            updateBtn.click();
            //setTimeout(() => nextButton.click(), 1000);
        }

        btn.textContent = "Correct";
        btn.onclick = giveCredit;
        el.appendChild(btn);
    })
}
const onBodyChange = () => {
    frame = document.getElementById('speedgrader_iframe');
    if (frame) {
        if (frame.contentWindow.document.readyState === 'complete') {
            modifyFrame();
        }
        frame.contentWindow.onload = () => {
                modifyFrame();
            }
        //observer.disconnect();
    }
}

const observer = new MutationObserver(onBodyChange);


observer.observe(document.body, { attributes: true, childList: true, subtree: true });

window.onload = () => {
    nextButton = document.getElementById('next-student-button');
    prevButton = document.getElementById('prev-student-button');
    addEventListener('keydown', ({key}) => {
        if (key === 'ArrowRight') {
            nextButton.click();
        }
        if (key === 'ArrowLeft') {
            prevButton.click();
        }
    });
}