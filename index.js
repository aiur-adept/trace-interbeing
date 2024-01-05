var MarkovChain = require('markovchain');
var toib = require('./toib.json');
var text = toib.join(' ');
const markov = new MarkovChain(text);

let ix = 0;

const src = [
    'A', 'ᚷ', 'ᚾ', 'ᛲ', '_', 'ᛥ', 'o', 'r', 'z', 'ᛸ',
    'ᛷ', 'ᛶ', 'ᛗ', 'ᛏ', 'ᛝ', 'ᚱ', 'ᚩ', 'ᚠ', 'ᛈ', 'ᛉ',
    'ᛏ', 'ᛓ', 'ᛃ', 'ᚻ', 'ᚼ', 'Ω'
];

function generateAndDisplayText() {
    let txt = ';';
    let gold = false;

    if (ix == 0 || Math.random() < 0.07) {
        txt = toib[Math.floor(Math.random() * toib.length)];
        gold = true;
    } else if (Math.random() < 0.85) {
        const n = Math.floor(Math.random() * 108);
        for (let i = 0; i < n; i++) {
            txt += src[Math.floor(Math.random() * src.length)];
            if (i % 22 == 0) {
                txt += ' ';
            }
        }
    } else {
        txt = markov.start('and').end(8 + Math.floor(Math.random() * 26)).process();
    }

    const txtElem = document.createElement('div');
    txtElem.classList.add('txt');
    if (gold) {
        txtElem.style.color = 'gold';
    }

    // Simulate typing effect
    const typingSpeed = 5; // milliseconds per character
    let charIndex = 0;

    function typeCharacter() {
        if (charIndex < txt.length) {
            txtElem.textContent += txt[charIndex];
            charIndex++;
            scrollToBottom();
            setTimeout(typeCharacter, typingSpeed);
        }
    }

    typeCharacter();

    document.getElementById('terminal').appendChild(txtElem);

    ix++;
}


function scrollToBottom() {
    var terminal = document.getElementById('terminal');
    terminal.scrollTop = terminal.scrollHeight;
}

window.addEventListener('keydown', function (event) {
    generateAndDisplayText();
});

document.getElementById('terminal').addEventListener('click', function (event) {
    generateAndDisplayText();
});
