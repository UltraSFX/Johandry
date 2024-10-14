function loadScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = url;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Script loading failed for ' + url));

        document.head.appendChild(script);
    });
}

class MIDIPiano extends Phaser.Scene {
    constructor() {
        super();
        this.currentLevel = 1;
        this.levelObjective = [];
        this.playerProgress = [];
        this.referenceKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];
        this.gameStarted = false;
        this.timer = null;
        this.timeLeft = 6000; // 6 seconds in milliseconds
        this.keyMappings = {
            'A': 'C5',
            'S': 'D5',
            'D': 'E5',
            'F': 'F5',
            'G': 'G5',
            'H': 'A5',
            'J': 'B5',
            'K': 'C6'
        };
        this.reverseKeyMappings = Object.fromEntries(
            Object.entries(this.keyMappings).map(([key, value]) => [value, key])
        );
        this.lowerKeyMappings = {
            'A': 'C4',
            'S': 'D4',
            'D': 'E4',
            'F': 'F4',
            'G': 'G4',
            'H': 'A4',
            'J': 'B4',
            'K': 'C5'
        };
        this.upperKeyMappings = {
            'A': 'C6',
            'S': 'D6',
            'D': 'E6',
            'F': 'F6',
            'G': 'G6',
            'H': 'A6',
            'J': 'B6',
            'K': 'C7'
        };
        this.blackKeyMappings = {
            'W': 'C#5',
            'E': 'D#5',
            'T': 'F#5',
            'Y': 'G#5',
            'U': 'A#5'
        };
        this.lowerBlackKeyMappings = {
            'W': 'C#4',
            'E': 'D#4',
            'T': 'F#4',
            'Y': 'G#4',
            'U': 'A#4'
        };
        this.upperBlackKeyMappings = {
            'W': 'C#6',
            'E': 'D#6',
            'T': 'F#6',
            'Y': 'G#6',
            'U': 'A#6'
        };
    }

    preload() {
        this.load.bitmapFont('FuturaBT-White', 'https://play.rosebud.ai/assets/FuturaBT-White.png?E0EY', 'https://play.rosebud.ai/assets/FuturaBT-White.xml?WvdS');
        this.load.bitmapFont('FuturaBT-Black', 'https://play.rosebud.ai/assets/FuturaBT-Black.png?UpSt', 'https://play.rosebud.ai/assets/FuturaBT-Black.xml?7KMN');
    }

    create() {
        // Constants for dimensions
        const whiteKeyWidth = 70;
        const whiteKeyHeight = 300;
        // Level system
        this.levelText = this.add.bitmapText(800, 50, 'FuturaBT-White', 'Nivel: 1', 32).setOrigin(0.5);
        this.objectiveText = this.add.bitmapText(800, 100, 'FuturaBT-White', 'Objetivo: ', 24).setOrigin(0.5);
        this.instructionsText = this.add.bitmapText(800, 150, 'FuturaBT-White', 'Presiona ESPACIO para comenzar', 24).setOrigin(0.5);
        this.explanationText = this.add.bitmapText(800, 200, 'FuturaBT-White', 'Usa las teclas A, S, D, F, G, H, J, K para tocar las notas', 20).setOrigin(0.5);
        this.explanationText.setVisible(false);
        this.timerText = this.add.bitmapText(800, 250, 'FuturaBT-White', 'Tiempo: 6', 24).setOrigin(0.5);
        this.timerText.setVisible(false);
        this.input.keyboard.on('keydown-SPACE', this.startGame, this);
        const blackKeyWidth = 50;
        const blackKeyHeight = 180;

        // Total number of octaves to display
        const octaves = 3;

        // X position to start placing white keys
        let xPos = 50; // Adjusted to move the piano slightly to the left

        // MIDI notes for white keys in an octave
        const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        // MIDI notes for black keys in an octave
        const blackNotes = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''];

        // Key mappings are now class properties, no need to redefine them here

        let whiteKeys = {};
        let blackKeys = {};
        let activeKeys = {};
        let currentScale = [];
        let autoPlayInterval = null;
        const bpm = 120;
        const beatsPerMinute = 60000 / bpm;

        // Create white keys
        for (let octave = 0; octave < octaves; octave++) {
            for (let i = 0; i < 7; i++) {
                const note = whiteNotes[i] + (4 + octave);
                const key = this.add.rectangle(xPos, 450, whiteKeyWidth, whiteKeyHeight, 0xffffff)
                    .setInteractive().setData('note', note);

                // Store references to white keys by note
                whiteKeys[note] = key;

                // Add keybind text to white keys
                const keybinds = {
                    'C4': ['  A', '  +', 'Caps'],
                    'D4': ['  S', '  +', 'Caps'],
                    'E4': ['  D', '  +', 'Caps'],
                    'F4': ['  F', '  +', 'Caps'],
                    'G4': ['  G', '  +', 'Caps'],
                    'A4': ['  H', '  +', 'Caps'],
                    'B4': ['  J', '  +', 'Caps'],
                    'C5': ['  K', '  +', 'Caps'],
                    'C5': 'A',
                    'D5': 'S',
                    'E5': 'D',
                    'F5': 'F',
                    'G5': 'G',
                    'A5': 'H',
                    'B5': 'J',
                    'C6': 'K',
                    'C6': ['K'],
                    'D6': [' S', ' +', 'Shift'],
                    'E6': [' D', ' +', 'Shift'],
                    'F6': ['F', ' +', 'Shift'],
                    'G6': ['G', ' +', 'Shift'],
                    'A6': [' H', ' +', 'Shift'],
                    'B6': [' J', ' +', 'Shift'],
                    'C7': [' K', ' +', 'Shift']
                };

                if (keybinds[note]) {
                    const keyText = Array.isArray(keybinds[note]) ? keybinds[note].join('\n') : keybinds[note];
                    this.add.bitmapText(xPos - whiteKeyWidth / 4 - 5, 500, 'FuturaBT-Black', keyText, 20);
                }

                // Increment position for the next white key
                xPos += whiteKeyWidth + 5;
            }
        }

        // Reset X position for black keys
        xPos = 50 + whiteKeyWidth - blackKeyWidth / 2; // Adjusted starting X position for black keys

        // Create black keys (skip 2nd and 6th position in each octave)
        for (let octave = 0; octave < octaves; octave++) {
            for (let i = 0; i < 7; i++) {
                if (blackNotes[i] !== '') {
                    const note = blackNotes[i] + (4 + octave);
                    const key = this.add.rectangle(xPos, 360, blackKeyWidth, blackKeyHeight, 0x000000)
                        .setInteractive().setData('note', note);

                    // Store references to black keys by note
                    blackKeys[note] = key;

                    // Add keybind text to black keys
                    const keybinds = {
                        'C#4': ['  W', '  +', 'Caps'],
                        'D#4': ['  E', '  +', 'Caps'],
                        'F#4': ['  T', '  +', 'Caps'],
                        'G#4': ['  Y', '  +', 'Caps'],
                        'A#4': ['  U', '  +', 'Caps'],
                        'C#5': '  W',
                        'D#5': '  E',
                        'F#5': '  T',
                        'G#5': '  Y',
                        'A#5': '  U',
                        'C#6': ['  W', '  +', 'Shift'],
                        'D#6': ['  E', '  +', 'Shift'],
                        'F#6': ['  T', '  +', 'Shift'],
                        'G#6': ['  Y', '  +', 'Shift'],
                        'A#6': ['  U', '  +', 'Shift']
                    };

                    if (keybinds[note]) {
                        const keyText = Array.isArray(keybinds[note]) ? keybinds[note].join('\n') : keybinds[note];
                        this.add.bitmapText(xPos - blackKeyWidth / 4 - 7, 345, 'FuturaBT-White', keyText, 20);
                    }

                    // Increment position for the next black key
                    xPos += whiteKeyWidth + 5;
                } else {
                    xPos += whiteKeyWidth + 5;
                }
            }
            // Adjust position for the next octave
            xPos += 5;
        }

        // Load Tone.js and initialize it
        loadScript('https://unpkg.com/tone')
            .then(() => {
                let synth = new Tone.PolySynth().toDestination();

                // Create container for Instrument dropdown and label
                const instrumentContainer = document.createElement('div');
                instrumentContainer.style.position = 'absolute';
                instrumentContainer.style.top = `max(${this.game.renderer.height * 0.1}px, 50px)`; // Adjust top position based on screen size
                instrumentContainer.style.left = `${100}px`; // Fixed distance from the left side of the screen
                instrumentContainer.style.display = 'flex';
                instrumentContainer.style.flexDirection = 'column';
                instrumentContainer.style.alignItems = 'center';
                document.body.appendChild(instrumentContainer);

                const instrumentLabel = document.createElement('div');
                instrumentLabel.style.color = 'white';
                instrumentLabel.style.fontFamily = 'FuturaBT-White';
                instrumentLabel.style.fontSize = '20px';
                instrumentLabel.innerText = 'Instrumento:';
                instrumentContainer.appendChild(instrumentLabel);

                // Instrument selection dropdown
                const instruments = {
                    'Sintetizador': Tone.Synth,
                    'Sintetizador AM': Tone.AMSynth,
                    'Sintetizador FM': Tone.FMSynth,
                    'Sintetizador de Membrana': Tone.MembraneSynth,
                    'Sintetizador Mono': Tone.MonoSynth,
                };

                const dropdown = document.createElement('select');
                dropdown.style.backgroundColor = 'transparent'; // Make the background transparent
                dropdown.style.color = 'white'; // Change text color to white
                dropdown.style.fontFamily = 'FuturaBT-White'; // Use the FuturaBT-White font
                dropdown.style.border = 'none'; // Remove border
                dropdown.style.fontSize = '20px'; // Increase font size
                dropdown.style.padding = '10px'; // Increase padding
                dropdown.style.textAlign = 'center'; // Center the text
                dropdown.style.width = '200px'; // Define width for dropdown

                // Styles for dropdown options
                const style = document.createElement('style');
                style.innerHTML = `
                    select option {
                        background-color: rgba(0, 0, 0, 0.8); // Make the background of options semi-transparent
                        color: white;
                        font-family: 'FuturaBT-White';
                        font-size: 20px;
                        text-align: center; // Center the text in options
                    }
                `;
                document.head.appendChild(style);

                for (const name in instruments) {
                    const option = document.createElement('option');
                    option.value = name;
                    option.innerText = name;
                    dropdown.appendChild(option);
                }

                dropdown.addEventListener('change', (event) => {
                    const selectedInstrument = instruments[event.target.value];
                    if (selectedInstrument) {
                        // Liberar todas las notas activas
                        releaseAllNotes();
                        // Crear un nuevo sintetizador
                        synth = new Tone.PolySynth(selectedInstrument).toDestination();
                        // Reiniciar las teclas activas
                        activeKeys = {};
                    }
                    // Prevenir que el cambio de foco active la tecla 'S'
                    event.target.blur();
                });

                instrumentContainer.appendChild(dropdown);

                // Create container for Scale dropdown and label
                const scaleContainer = document.createElement('div');
                scaleContainer.style.position = 'absolute';
                scaleContainer.style.top = `max(${this.game.renderer.height * 0.1}px, 50px)`; // Adjust top position based on screen size
                scaleContainer.style.right = `${100}px`; // Fixed distance from the right side of the screen
                scaleContainer.style.display = 'flex';
                scaleContainer.style.flexDirection = 'column';
                scaleContainer.style.alignItems = 'center';
                document.body.appendChild(scaleContainer);

                const scaleLabel = document.createElement('div');
                scaleLabel.style.color = 'white';
                scaleLabel.style.fontFamily = 'FuturaBT-White';
                scaleLabel.style.fontSize = '20px';
                scaleLabel.innerText = 'Escala:';
                scaleContainer.appendChild(scaleLabel);

                // Scales and keys dropdown
                const scales = {
                    'Ninguna': [],
                    'La Mayor': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
                    'Si♭ Mayor': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
                    'Si Mayor': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
                    'Do Mayor': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
                    'Do# Mayor': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
                    'Re Mayor': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
                    'Mi♭ Mayor': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
                    'Mi Mayor': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
                    'Fa Mayor': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
                    'Fa# Mayor': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
                    'Sol Mayor': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
                    'La♭ Mayor': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
                    'La Menor': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
                    'Si♭ Menor': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
                    'Si Menor': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
                    'Do Menor': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
                    'Do# Menor': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
                    'Re Menor': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
                    'Mi♭ Menor': ['Eb', 'Fb', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
                    'Mi Menor': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
                    'Fa Menor': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
                    'Fa# Menor': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
                    'Sol Menor': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
                    'La♭ Menor': ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb']
                };

                const scaleDropdown = document.createElement('select');
                scaleDropdown.style.backgroundColor = 'transparent';
                scaleDropdown.style.color = 'white';
                scaleDropdown.style.fontFamily = 'FuturaBT-White';
                scaleDropdown.style.border = 'none';
                scaleDropdown.style.fontSize = '20px';
                scaleDropdown.style.padding = '10px';
                scaleDropdown.style.textAlign = 'center';
                scaleDropdown.style.width = '200px'; // Set the same width as instrument dropdown

                for (const scale in scales) {
                    const option = document.createElement('option');
                    option.value = scale;
                    option.innerText = scale;
                    scaleDropdown.appendChild(option);
                }

                // AutoPlay functionality removed

                scaleDropdown.addEventListener('change', (event) => {
                    const selectedScale = scales[event.target.value];
                    currentScale = selectedScale; // Update the current scale
                    highlightScale(selectedScale);
                });

                scaleContainer.appendChild(scaleDropdown);

                // AutoPlay functionality removed

                function releaseAllNotes() {
                    pressedKeys.clear();
                    synth.releaseAll();
                    for (const note in whiteKeys) {
                        whiteKeys[note].setFillStyle(currentScale.includes(note.slice(0, -1)) ? 0xadd8e6 : 0xffffff);
                    }
                    for (const note in blackKeys) {
                        blackKeys[note].setFillStyle(currentScale.includes(note.slice(0, -1)) ? 0x00008b : 0x000000);
                    }
                }

                function highlightScale(scaleNotes) {
                    // Reset all key colors
                    for (const note in whiteKeys) {
                        whiteKeys[note].setFillStyle(0xffffff);
                    }
                    for (const note in blackKeys) {
                        blackKeys[note].setFillStyle(0x000000);
                    }

                    // Highlight notes in the selected scale
                    for (const note of scaleNotes) {
                        for (let octave = 4; octave <= 4 + octaves - 1; octave++) {
                            const noteInOctave = note + octave;
                            if (whiteKeys[noteInOctave]) {
                                whiteKeys[noteInOctave].setFillStyle(0xadd8e6); // Highlight white keys in very light blue
                            }
                            if (blackKeys[noteInOctave]) {
                                blackKeys[noteInOctave].setFillStyle(0x00008b); // Highlight black keys in dark blue
                            }
                        }
                    }
                }

                // Event for visual feedback and sound when keys are clicked
                this.input.on('gameobjectdown', (pointer, gameObject) => {
                    gameObject.setFillStyle(0xff0000); // Change color to red when clicked

                    // Extract note from the game object data
                    const note = gameObject.getData('note');
                    if (note) {
                        synth.triggerAttack(note);
                    }
                });

                this.input.on('gameobjectup', (pointer, gameObject) => {
                    const note = gameObject.getData('note');
                    if (gameObject.fillColor === 0xff0000) { // Ensure it was set to red
                        if (whiteKeys[note]) {
                            whiteKeys[note].setFillStyle(currentScale.includes(note.slice(0, -1)) ? 0xadd8e6 : 0xffffff); // Revert to blue or white
                        } else if (blackKeys[note]) {
                            blackKeys[note].setFillStyle(currentScale.includes(note.slice(0, -1)) ? 0x00008b : 0x000000); // Revert to dark blue or black
                        }
                        if (note) {
                            synth.triggerRelease(note);
                        }
                    }
                });

                let pressedKeys = new Set();
                // Keyboard event listeners for keys
                this.input.keyboard.on('keydown', event => {
                    event.preventDefault();
                    const key = event.key.toUpperCase();
                    if (!pressedKeys.has(key)) {
                        pressedKeys.add(key);
                        const isCapsLocked = event.getModifierState && event.getModifierState('CapsLock');
                        const isShiftPressed = event.shiftKey;
                        let note;
                        if (isCapsLocked) {
                            note = this.lowerKeyMappings[key] || this.lowerBlackKeyMappings[key];
                        } else if (isShiftPressed) {
                            note = this.upperKeyMappings[key] || this.upperBlackKeyMappings[key];
                        } else {
                            note = this.keyMappings[key] || this.blackKeyMappings[key];
                        }
                        if (note) {
                            const keyObject = whiteKeys[note] || blackKeys[note];
                            if (keyObject) {
                                keyObject.setFillStyle(0xff0000); // Change color to red when key pressed
                                synth.triggerAttack(note);
                                this.checkLevelProgress(note);
                            }
                        }
                    }
                });
                this.input.keyboard.on('keyup', event => {
                    const key = event.key.toUpperCase();
                    if (pressedKeys.has(key)) {
                        pressedKeys.delete(key);
                        const isCapsLocked = event.getModifierState && event.getModifierState('CapsLock');
                        const isShiftPressed = event.shiftKey;
                        let note;
                        if (isCapsLocked) {
                            note = this.lowerKeyMappings[key] || this.lowerBlackKeyMappings[key];
                        } else if (isShiftPressed) {
                            note = this.upperKeyMappings[key] || this.upperBlackKeyMappings[key];
                        } else {
                            note = this.keyMappings[key] || this.blackKeyMappings[key];
                        }
                        if (note) {
                            const keyObject = whiteKeys[note] || blackKeys[note];
                            if (keyObject) {
                                keyObject.setFillStyle(currentScale.includes(note.slice(0, -1)) ? 0xadd8e6 : (keyObject === whiteKeys[note] ? 0xffffff : 0x000000)); // Revert to appropriate color
                                synth.triggerRelease(note);
                            }
                        }
                    }
                });
                // Liberar todas las notas cuando la ventana pierde el foco
                window.addEventListener('blur', releaseAllNotes);

                // Add "Powered by Tone.js" text at the bottom right corner
                this.add.bitmapText(1580, 870, 'FuturaBT-White', 'Developed by UltraSFX', 24).setOrigin(1);
                // Event listeners for window focus and blur
                window.addEventListener('blur', releaseAllNotes);
                // Add level system logic
                this.input.keyboard.on('keydown', event => {
                    const isCapsLocked = event.getModifierState && event.getModifierState('CapsLock');
                    const isShiftPressed = event.getModifierState && event.getModifierState('Shift');
                    const whiteNote = isCapsLocked ? lowerKeyMappings[event.key.toUpperCase()] : (isShiftPressed ? upperKeyMappings[event.key.toUpperCase()] : keyMappings[event.key.toUpperCase()]);
                    const blackNote = isCapsLocked ? lowerBlackKeyMappings[event.key.toUpperCase()] : (isShiftPressed ? upperBlackKeyMappings[event.key.toUpperCase()] : blackKeyMappings[event.key.toUpperCase()]);
                    const playedNote = whiteNote || blackNote;
                    if (playedNote) {
                        this.checkLevelProgress(playedNote);
                    }
                });
            })
            .catch(error => {
                console.error(error);
            });
    }
    startGame() {
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.instructionsText.setVisible(false);
            this.explanationText.setVisible(true);
            this.timerText.setVisible(true);
            this.generateLevelObjective();
            this.startTimer();
        }
    }
    startTimer() {
        this.timeLeft = 6000;
        this.updateTimerText();
        this.timer = this.time.addEvent({
            delay: 100,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }
    updateTimer() {
        this.timeLeft -= 100;
        this.updateTimerText();
        if (this.timeLeft <= 0) {
            this.timer.remove();
            this.timeOut();
        }
    }
    updateTimerText() {
        this.timerText.setText('Tiempo: ' + (this.timeLeft / 1000).toFixed(1));
    }
    timeOut() {
        this.timer.remove();
        this.showLoseMessage();
    }
    showLoseMessage() {
        const loseText = this.add.text(800, 400, 'Perdiste', {
            fontFamily: 'FuturaBT',
            fontSize: '144px',
            color: '#FF0000',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#FFFFFF',
            strokeThickness: 16
        }).setOrigin(0.5);
        // Texto del contador
        const countdownLabel = this.add.text(800, 600, 'Tiempo restante para jugar de nuevo:', {
            fontFamily: 'FuturaBT',
            fontSize: '48px',
            color: '#FFFFFF',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        // Contador regresivo
        let countdown = 10;
        const countdownText = this.add.text(800, 675, countdown.toString(), {
            fontFamily: 'FuturaBT',
            fontSize: '96px',
            color: '#FF0000',
            align: 'center',
            stroke: '#FFFFFF',
            strokeThickness: 8
        }).setOrigin(0.5);
        // Efecto de entrada para todos los textos
        loseText.setScale(0);
        countdownLabel.setScale(0);
        countdownText.setScale(0);
        this.tweens.add({
            targets: [loseText, countdownLabel, countdownText],
            scale: 1,
            duration: 1000,
            ease: 'Bounce'
        });
        // Actualizar el contador cada segundo
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                countdown--;
                countdownText.setText(countdown.toString());
                if (countdown <= 0) {
                    countdownTimer.remove();
                }
            },
            repeat: 9
        });
        // Efecto de salida para todos los textos
        this.time.delayedCall(9000, () => {
            this.tweens.add({
                targets: [loseText, countdownLabel, countdownText],
                scale: 0,
                duration: 1000,
                ease: 'Back.easeIn'
            });
        });
        // Reiniciar el juego después de 10 segundos
        this.time.delayedCall(10000, () => {
            this.currentLevel = 1;
            this.playerProgress = [];
            this.gameStarted = false;
            this.scene.restart();
        });
    }
    showTimeOutMessage() {
        const timeOutText = this.add.bitmapText(800, 450, 'FuturaBT-White', '¡Tiempo agotado!', 64).setOrigin(0.5);
        this.tweens.add({
            targets: timeOutText,
            alpha: {
                from: 1,
                to: 0
            },
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                timeOutText.destroy();
            }
        });
    }
    generateLevelObjective() {
        this.levelObjective = [];
        for (let i = 0; i < this.currentLevel + 1; i++) {
            const randomKey = Phaser.Math.RND.pick(this.referenceKeys);
            this.levelObjective.push(randomKey);
        }
        this.objectiveText.setText('Objetivo: ' + this.levelObjective.join(' - '));
        this.playerProgress = [];
    }
    checkLevelProgress(playedNote) {
        if (!this.gameStarted) return;
        const expectedKey = this.levelObjective[this.playerProgress.length];
        const playedKey = this.reverseKeyMappings[playedNote];
        if (playedKey === expectedKey) {
            this.playerProgress.push(playedKey);
            if (this.playerProgress.length === this.levelObjective.length) {
                this.timer.remove();
                this.showCongratulation();
                this.currentLevel++;
                this.levelText.setText('Nivel: ' + this.currentLevel);
                this.time.delayedCall(3500, () => {
                    this.generateLevelObjective();
                    this.startTimer();
                });
            }
        } else {
            this.playerProgress = [];
        }
    }
    showCongratulation() {
        const congratsText = this.add.text(800, 450, '¡Felicidades!\n¡Nivel completado!', {
            font: 'bold 64px FuturaBT',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 6
        });
        congratsText.setOrigin(0.5);
        congratsText.setAlpha(0);
        congratsText.setScale(0.5);
        // Añadir un fondo semi-transparente
        const background = this.add.rectangle(800, 450, 1600, 900, 0x000000, 0.7);
        background.setAlpha(0);
        // Colores del arcoíris más brillantes
        const colors = [0xFF00FF, 0xFF00FF, 0xFFFF00, 0x00FFFF, 0x00FFFF, 0xFF00FF, 0xFF00FF];
        // Animación de aparición
        this.tweens.add({
            targets: [congratsText, background],
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: congratsText,
            scale: 1,
            duration: 1000,
            ease: 'Bounce'
        });
        // Animación del efecto arcoíris
        this.tweens.addCounter({
            from: 0,
            to: colors.length - 1,
            duration: 1000,
            repeat: -1,
            ease: 'Linear',
            onUpdate: (tween) => {
                const index = Math.floor(tween.getValue()) % colors.length;
                const nextIndex = (index + 1) % colors.length;
                const color1 = Phaser.Display.Color.ValueToColor(colors[index]);
                const color2 = Phaser.Display.Color.ValueToColor(colors[nextIndex]);
                const blendColor = Phaser.Display.Color.Interpolate.ColorWithColor(color1, color2, 100, tween.getValue() % 1);
                congratsText.setTint(Phaser.Display.Color.GetColor(blendColor.r, blendColor.g, blendColor.b));
            }
        });
        // Efecto de brillo
        this.tweens.add({
            targets: congratsText,
            alpha: {
                from: 0.7,
                to: 1
            },
            yoyo: true,
            repeat: -1,
            duration: 750,
            ease: 'Sine.easeInOut'
        });
        // Eliminar el texto y el fondo después de la animación
        this.time.delayedCall(3500, () => {
            this.tweens.add({
                targets: [congratsText, background],
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    congratsText.destroy();
                    background.destroy();
                }
            });
        });
    }
}

const container = document.getElementById('renderDiv');
const config = {
    type: Phaser.AUTO,
    parent: 'renderDiv',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    width: 1600,
    height: 900,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 0
            } // No gravity needed
        }
    },
    scene: MIDIPiano
};

window.phaserGame = new Phaser.Game(config);