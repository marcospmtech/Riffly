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

    // Detecção de tom pelo algoritmo YIN (De Cheveigné & Kawahara, 2002).
    //
    // Por que não autocorrelação simples? Porque um instrumento real tem
    // harmônicos fortes (2ª, 3ª frequência da nota) que às vezes "enganam"
    // a autocorrelação, fazendo ela travar no dobro ou na metade da
    // frequência certa — o chamado "erro de oitava". O YIN resolve isso
    // com uma etapa de normalização cumulativa que penaliza exatamente
    // esses picos espúrios, o que o torna muito mais confiável pra
    // instrumentos musicais (é o algoritmo usado por afinadores digitais
    // de verdade, não só um exemplo didático).
    function detectarTom(buf, sampleRate) {
        var TAMANHO = buf.length;
        var JANELA = Math.floor(TAMANHO / 2); // metade do buffer vira a janela de integração
        var LIMIAR = 0.15; // quanto menor, mais exigente (mais rejeição de ruído)

        // Frequências fora do alcance de um violão não interessam — limitar a
        // busca aqui também acelera bastante o cálculo (de ~O(n²) irrestrito
        // pra uma faixa bem menor).
        var FREQ_MINIMA = 60;
        var FREQ_MAXIMA = 1400;
        var tauMinimo = Math.floor(sampleRate / FREQ_MAXIMA);
        var tauMaximo = Math.min(JANELA - 1, Math.ceil(sampleRate / FREQ_MINIMA));

        var rms = 0;
        for (var i = 0; i < TAMANHO; i++) {
            rms += buf[i] * buf[i];
        }
        rms = Math.sqrt(rms / TAMANHO);

        // Sinal fraco demais (silêncio, ruído de fundo): nem tenta detectar.
        if (rms < 0.01) {
            return -1;
        }

        // Passo 1: função de diferença — o quanto o sinal "se parece menos"
        // consigo mesmo a cada deslocamento (tau) testado.
        var diferenca = new Float64Array(tauMaximo + 1);
        for (var tau = 1; tau <= tauMaximo; tau++) {
            var soma = 0;
            for (var j = 0; j < JANELA; j++) {
                var delta = buf[j] - buf[j + tau];
                soma += delta * delta;
            }
            diferenca[tau] = soma;
        }

        // Passo 2: normalização cumulativa da média. É essa divisão pela
        // média acumulada que penaliza os falsos positivos de harmônicos e
        // evita o erro de oitava.
        var normalizada = new Float64Array(tauMaximo + 1);
        normalizada[0] = 1;
        var somaAcumulada = 0;
        for (var tau = 1; tau <= tauMaximo; tau++) {
            somaAcumulada += diferenca[tau];
            normalizada[tau] = diferenca[tau] * tau / somaAcumulada;
        }

        // Passo 3: acha o primeiro vale que fica abaixo do limiar (dentro da
        // faixa de frequência de um violão) — não necessariamente o menor
        // valor absoluto, e sim o primeiro "bom o suficiente", que é o que
        // realmente identifica o período fundamental certo.
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
            return -1; // nenhum tom claro o suficiente dentro da faixa esperada
        }

        // Passo 4: interpolação parabólica, pra não ficar preso a um valor
        // inteiro de amostra (senão a frequência "pula" em degraus).
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