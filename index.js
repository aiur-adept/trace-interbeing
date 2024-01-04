var MarkovChain = require('markovchain');
var toib = require('./toib.json');
var text = toib.join(' ');
const markov = new MarkovChain(text);

const src = ['ᚷ', 'ᚾ', 'ᛲ', 'ᛱ', '_', 'ᛥ', 'o', 'r', 'z', 'ᛸ', 'ᛷ', 'ᛶ', 'ᛗ', 'ᚽ', 'ᛏ', 'ᛝ', 'ᛤ', 'ᚱ', 'ᚩ', 'ᚠ', 'ᛈ', 'ᛉ', 'ᛏ', 'ᛓ', 'ᛃ', 'ᚻ', 'ᚼ'];

function generateAndDisplayText() {
    let txt = ';';
    let gold = false;
    let kind = 'div';
    if (Math.random() < 0.05) {
        txt = toib[Math.floor(Math.random() * toib.length)];
        gold = true;
        kind = 'span';
    } else if (Math.random() < 0.90) {
        const n = Math.floor(Math.random() * 128);
        for (let i = 0; i < n; i++) {
            txt += src[Math.floor(Math.random() * src.length)];
        }
    } else {
        txt = markov.start('and').end(8 + Math.floor(Math.random() * 26)).process();
    }

    const newDiv = document.createElement(kind);
    if (gold) {
        newDiv.style.color = 'gold';
    }

    // Simulate typing effect
    const typingSpeed = 5; // milliseconds per character
    let charIndex = 0;

    function typeCharacter() {
        if (charIndex < txt.length) {
            newDiv.textContent += txt[charIndex];
            charIndex++;
            scrollToBottom();
            setTimeout(typeCharacter, typingSpeed);
        }
    }

    typeCharacter();

    document.getElementById('terminal').appendChild(newDiv);
}


function scrollToBottom() {
    var terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

window.addEventListener('keydown', function (event) {
    generateAndDisplayText();
});

window.addEventListener('click', function (event) {
    generateAndDisplayText();
});
