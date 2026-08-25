document.addEventListener('DOMContentLoaded', function () {
    var trackEl = document.getElementById('bpmTrack');
    var pickerEl = document.getElementById('bpmPicker');
    var startBtn = document.getElementById('startStopBtn');
    var beatEls = document.querySelectorAll('.beat');

    if (!trackEl || !pickerEl || !startBtn || !beatEls.length) {
        return;
    }

    var MIN_BPM = 40;
    var MAX_BPM = 220;
    var DEFAULT_BPM = 120;

    var ITEM_HEIGHT = 48;
    var VISIBLE_ROWS = 5;
    var SPACER_HEIGHT = Math.floor(VISIBLE_ROWS / 2) * ITEM_HEIGHT;

    var currentBpm = DEFAULT_BPM;
    var isPlaying = false;

    function buildPicker() {
        var topSpacer = document.createElement('div');
        topSpacer.className = 'bpm-picker-spacer';
        topSpacer.style.height = SPACER_HEIGHT + 'px';
        trackEl.appendChild(topSpacer);

        for (var bpm = MIN_BPM; bpm <= MAX_BPM; bpm++) {
            var item = document.createElement('div');
            item.className = 'bpm-value';
            item.textContent = String(bpm);
            item.setAttribute('data-bpm', String(bpm));

            item.addEventListener('click', function () {
                scrollToBpm(Number(this.getAttribute('data-bpm')), true);
            });

            trackEl.appendChild(item);
        }

        var bottomSpacer = document.createElement('div');
        bottomSpacer.className = 'bpm-picker-spacer';
        bottomSpacer.style.height = SPACER_HEIGHT + 'px';
        trackEl.appendChild(bottomSpacer);
    }

    function scrollToBpm(bpm, smooth) {
        var index = bpm - MIN_BPM;
        pickerEl.scrollTo({
            top: index * ITEM_HEIGHT,
            behavior: smooth ? 'smooth' : 'auto'
        });
    }

    var scrollRaf = null;
    function handleScroll() {
        if (scrollRaf) {
            return;
        }
        scrollRaf = requestAnimationFrame(function () {
            scrollRaf = null;
            var index = Math.round(pickerEl.scrollTop / ITEM_HEIGHT);
            var bpm = MIN_BPM + index;
            bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
            setCurrentBpm(bpm);
        });
    }

    function setCurrentBpm(bpm) {
        currentBpm = bpm;

        var items = trackEl.querySelectorAll('.bpm-value');
        items.forEach(function (item) {
            var isCurrent = Number(item.getAttribute('data-bpm')) === bpm;
            item.classList.toggle('current', isCurrent);
        });
    }

    pickerEl.addEventListener('scroll', handleScroll);

    buildPicker();

    // Se a URL vier com ?bpm=60 (o botão "Ir para o Metrônomo" da página de
    // cifra monta esse link), começa já com esse BPM em vez do padrão (120).
    var bpmDaUrl = parseInt(new URLSearchParams(window.location.search).get('bpm'), 10);
    var bpmInicial = (!isNaN(bpmDaUrl) && bpmDaUrl >= MIN_BPM && bpmDaUrl <= MAX_BPM) ? bpmDaUrl : DEFAULT_BPM;

    scrollToBpm(bpmInicial, false);
    setCurrentBpm(bpmInicial);

    var audioContext = null;

    function ensureAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext;
    }

    function playClick(time, accent) {
        var osc = audioContext.createOscillator();
        var gain = audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = accent ? 1500 : 900;

        var peakVolume = accent ? 0.9 : 0.5;
        var duration = accent ? 0.09 : 0.05;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(peakVolume, time + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.start(time);
        osc.stop(time + duration + 0.02);
    }

    var SCHEDULE_AHEAD_TIME = 0.1;
    var LOOKAHEAD_INTERVAL = 25;
    var nextNoteTime = 0;
    var beatInSchedule = 0;
    var schedulerTimer = null;
    var beatQueue = [];

    function scheduleNote(beat, time) {
        playClick(time, beat === 0);
        beatQueue.push({ beat: beat, time: time });
    }

    function scheduler() {
        while (nextNoteTime < audioContext.currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleNote(beatInSchedule, nextNoteTime);

            var secondsPerBeat = 60.0 / currentBpm;
            nextNoteTime += secondsPerBeat;
            beatInSchedule = (beatInSchedule + 1) % 4;
        }

        schedulerTimer = window.setTimeout(scheduler, LOOKAHEAD_INTERVAL);
    }

    var visualRaf = null;
    function updateVisualBeat() {
        if (!isPlaying) {
            return;
        }

        var now = audioContext.currentTime;
        while (beatQueue.length && beatQueue[0].time <= now) {
            var next = beatQueue.shift();
            highlightBeat(next.beat);
        }

        visualRaf = requestAnimationFrame(updateVisualBeat);
    }

    function highlightBeat(beatIndex) {
        beatEls.forEach(function (el, index) {
            el.classList.toggle('active', index === beatIndex);
        });
    }

    function startMetronome() {
        ensureAudioContext();

        isPlaying = true;
        beatInSchedule = 0;
        beatQueue = [];
        nextNoteTime = audioContext.currentTime + 0.05;

        scheduler();
        visualRaf = requestAnimationFrame(updateVisualBeat);

        startBtn.textContent = 'Parar';
    }

    function stopMetronome() {
        isPlaying = false;

        if (schedulerTimer) {
            clearTimeout(schedulerTimer);
            schedulerTimer = null;
        }
        if (visualRaf) {
            cancelAnimationFrame(visualRaf);
            visualRaf = null;
        }

        beatQueue = [];
        highlightBeat(0);

        startBtn.textContent = 'Iniciar';
    }

    startBtn.addEventListener('click', function () {
        if (isPlaying) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });
});