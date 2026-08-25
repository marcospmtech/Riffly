document.addEventListener('DOMContentLoaded', function () {
    var stringButtons = document.querySelectorAll('.string-note');
    var needleEl = document.getElementById('manualNeedle');
    var statusEl = document.getElementById('manualTunerStatus');

    if (!stringButtons.length || !needleEl || !window.RifflyPitch) {
        return;
    }

    var IN_TUNE_THRESHOLD = 5;
    var MAX_CENTS = 50;
    var MAX_OFFSET = 90;
    var SMOOTHING = 0.25;

    var smoothedCents = 0;
    var selectedButton = null;
    var listening = false;

    function lineForButton(button) {
        var index = button.getAttribute('data-string');
        return document.querySelector('[data-string-line="' + index + '"]');
    }

    function resetNeedle() {
        smoothedCents = 0;
        needleEl.classList.remove('in-tune', 'out-of-tune');
        needleEl.style.transform = 'translateX(-50%)';
    }

    function selectString(button) {
        stringButtons.forEach(function (btn) {
            btn.classList.remove('active');
            var line = lineForButton(btn);
            if (line) {
                line.classList.remove('in-tune', 'out-of-tune');
            }
        });

        button.classList.add('active');
        selectedButton = button;
        resetNeedle();

        if (!listening) {
            startListening();
        }
    }

    function startListening() {
        listening = true;

        if (statusEl) {
            statusEl.textContent = 'Aguardando permissão do microfone...';
        }

        window.RifflyPitch.listen(
            function (frequency) {
                if (statusEl) { statusEl.textContent = ''; }
                handleFrequency(frequency);
            },
            function (reason) {
                if (!statusEl) { return; }
                statusEl.textContent = reason === 'unsupported'
                    ? 'Seu navegador não suporta captura de áudio.'
                    : 'Não foi possível acessar o microfone. Permita o acesso nas configurações do navegador e recarregue a página.';
            }
        );
    }

    function handleFrequency(frequency) {
        if (!selectedButton || frequency === -1) {
            return;
        }

        var targetNote = selectedButton.getAttribute('data-note');
        var result = window.RifflyPitch.noteFromFrequency(frequency);

        if (result.noteName !== targetNote) {
            return;
        }

        var inTune = Math.abs(result.cents) <= IN_TUNE_THRESHOLD;
        var tuneClass = inTune ? 'in-tune' : 'out-of-tune';

        var line = lineForButton(selectedButton);
        if (line) {
            line.classList.remove('in-tune', 'out-of-tune');
            line.classList.add(tuneClass);
        }

        var clampedCents = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, result.cents));
        smoothedCents += (clampedCents - smoothedCents) * SMOOTHING;

        needleEl.classList.remove('in-tune', 'out-of-tune');
        needleEl.classList.add(tuneClass);

        var offset = (smoothedCents / MAX_CENTS) * MAX_OFFSET;
        needleEl.style.transform = 'translateX(calc(-50% + ' + offset + 'px))';
    }

    stringButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            selectString(button);
        });
    });
});