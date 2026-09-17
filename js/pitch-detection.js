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

    function detectarTom(buf, sampleRate) {
        var TAMANHO = buf.length;
        var JANELA = Math.floor(TAMANHO / 2);
        var LIMIAR = 0.15;

        var FREQ_MINIMA = 60;
        var FREQ_MAXIMA = 1400;
        var tauMinimo = Math.floor(sampleRate / FREQ_MAXIMA);
        var tauMaximo = Math.min(JANELA - 1, Math.ceil(sampleRate / FREQ_MINIMA));

        var rms = 0;
        for (var i = 0; i < TAMANHO; i++) {
            rms += buf[i] * buf[i];
        }
        rms = Math.sqrt(rms / TAMANHO);

        if (rms < 0.003) {
            return -1;
        }

        var diferenca = new Float64Array(tauMaximo + 1);
        for (var tau = 1; tau <= tauMaximo; tau++) {
            var soma = 0;
            for (var j = 0; j < JANELA; j++) {
                var delta = buf[j] - buf[j + tau];
                soma += delta * delta;
            }
            diferenca[tau] = soma;
        }

        var normalizada = new Float64Array(tauMaximo + 1);
        normalizada[0] = 1;
        var somaAcumulada = 0;
        for (var tau = 1; tau <= tauMaximo; tau++) {
            somaAcumulada += diferenca[tau];
            normalizada[tau] = diferenca[tau] * tau / somaAcumulada;
        }

        var tauEscolhido = -1;
        for (var tau = tauMinimo; tau <= tauMaximo; tau++) {
            if (normalizada[tau] < LIMIAR) {
                while (tau + 1 <= tauMaximo && normalizada[tau + 1] < normalizada[tau]) {
                    tau++;
                }
                tauEscolhido = tau;
                break;
            }
        }

        if (tauEscolhido === -1) {
            return -1;
        }

        var tauFinal = tauEscolhido;
        if (tauEscolhido > tauMinimo && tauEscolhido < tauMaximo) {
            var s0 = normalizada[tauEscolhido - 1];
            var s1 = normalizada[tauEscolhido];
            var s2 = normalizada[tauEscolhido + 1];
            var divisor = 2 * s1 - s2 - s0;
            if (divisor !== 0) {
                tauFinal = tauEscolhido + (s2 - s0) / (2 * divisor);
            }
        }

        return sampleRate / tauFinal;
    }

    function listen(onFrequency, onError) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (onError) { onError('unsupported'); }
            return;
        }

        navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            },
            video: false
        })
            .then(function (stream) {
                var audioContext = new (window.AudioContext || window.webkitAudioContext)();
                var source = audioContext.createMediaStreamSource(stream);
                var analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                var buffer = new Float32Array(analyser.fftSize);
                source.connect(analyser);

                function loop() {
                    analyser.getFloatTimeDomainData(buffer);
                    var frequency = detectarTom(buffer, audioContext.sampleRate);
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