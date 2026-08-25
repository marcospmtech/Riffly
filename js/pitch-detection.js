window.RifflyPitch = (function () {
    var NOTE_STRINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];


    function midiFromFrequency(frequency) {
        return 12 * (Math.log(frequency / 440) / Math.log(2)) + 69;
    }

    function frequencyFromMidi(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    function centsOffFromPitch(frequency, note) {
        return 1200 * Math.log(frequency / frequencyFromMidi(note)) / Math.log(2);
    }

    function noteFromFrequency(frequency) {
        var midiNote = Math.round(midiFromFrequency(frequency));
        var noteName = NOTE_STRINGS[((midiNote % 12) + 12) % 12];
        var cents = centsOffFromPitch(frequency, midiNote);
        return { midiNote: midiNote, noteName: noteName, cents: cents };
    }

    function autoCorrelate(buf, sampleRate) {
        var SIZE = buf.length;
        var rms = 0;

        for (var i = 0; i < SIZE; i++) {
            rms += buf[i] * buf[i];
        }
        rms = Math.sqrt(rms / SIZE);

        if (rms < 0.01) {
            return -1;
        }

        var r1 = 0;
        var r2 = SIZE - 1;
        var threshold = 0.2;

        for (var i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buf[i]) < threshold) {
                r1 = i;
                break;
            }
        }
        for (var i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buf[SIZE - i]) < threshold) {
                r2 = SIZE - i;
                break;
            }
        }

        var trimmed = buf.slice(r1, r2);
        var trimmedSize = trimmed.length;

        var c = new Array(trimmedSize).fill(0);
        for (var i = 0; i < trimmedSize; i++) {
            for (var j = 0; j < trimmedSize - i; j++) {
                c[i] += trimmed[j] * trimmed[j + i];
            }
        }

        var d = 0;
        while (c[d] > c[d + 1]) {
            d++;
        }

        var maxVal = -1;
        var maxPos = -1;
        for (var i = d; i < trimmedSize; i++) {
            if (c[i] > maxVal) {
                maxVal = c[i];
                maxPos = i;
            }
        }

        var T0 = maxPos;

        if (T0 > 0 && T0 < trimmedSize - 1) {
            var x1 = c[T0 - 1];
            var x2 = c[T0];
            var x3 = c[T0 + 1];
            var a = (x1 + x3 - 2 * x2) / 2;
            var b = (x3 - x1) / 2;
            if (a) {
                T0 = T0 - b / (2 * a);
            }
        }

        return sampleRate / T0;
    }

    function listen(onFrequency, onError) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (onError) { onError('unsupported'); }
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (stream) {
                var audioContext = new (window.AudioContext || window.webkitAudioContext)();
                var source = audioContext.createMediaStreamSource(stream);
                var analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                var buffer = new Float32Array(analyser.fftSize);
                source.connect(analyser);

                function loop() {
                    analyser.getFloatTimeDomainData(buffer);
                    var frequency = autoCorrelate(buffer, audioContext.sampleRate);
                    onFrequency(frequency);
                    requestAnimationFrame(loop);
                }
                loop();
            })
            .catch(function () {
                if (onError) { onError('denied'); }
            });
    }

    return {
        NOTE_STRINGS: NOTE_STRINGS,
        noteFromFrequency: noteFromFrequency,
        listen: listen
    };
})();