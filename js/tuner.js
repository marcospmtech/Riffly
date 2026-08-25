document.addEventListener('DOMContentLoaded', function () {
    var noteEl = document.getElementById('tunerNote');
    var needleEl = document.querySelector('.tuner-needle-line');
    var noteSpans = document.querySelectorAll('.note-select span');
    var statusEl = document.getElementById('tunerStatus');

    if (!noteEl || !needleEl || !noteSpans.length || !window.RifflyPitch) {
        return;
    }

    var IN_TUNE_THRESHOLD = 5;
    var MAX_CENTS = 50;
    var MAX_ANGLE = 40;

    var SMOOTHING = 0.2;
    var smoothedCents = 0;

    function updateUI(frequency) {
        if (frequency === -1) {
            smoothedCents += (0 - smoothedCents) * SMOOTHING;
            needleEl.style.transform = 'rotate(' + (smoothedCents / MAX_CENTS) * MAX_ANGLE + 'deg)';
            return;
        }

        var result = window.RifflyPitch.noteFromFrequency(frequency);
        var inTune = Math.abs(result.cents) <= IN_TUNE_THRESHOLD;
        var tuneClass = inTune ? 'in-tune' : 'out-of-tune';

        noteEl.textContent = result.noteName;
        noteEl.classList.remove('in-tune', 'out-of-tune');
        noteEl.classList.add(tuneClass);

        needleEl.classList.remove('in-tune', 'out-of-tune');
        needleEl.classList.add(tuneClass);

        noteSpans.forEach(function (span) {
            span.classList.remove('current', 'in-tune', 'out-of-tune');
            if (span.getAttribute('data-note') === result.noteName) {
                span.classList.add('current', tuneClass);
            }
        });

        var clampedCents = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, result.cents));
        smoothedCents += (clampedCents - smoothedCents) * SMOOTHING;
        var angle = (smoothedCents / MAX_CENTS) * MAX_ANGLE;
        needleEl.style.transform = 'rotate(' + angle + 'deg)';
    }

    if (statusEl) {
        statusEl.textContent = 'Aguardando permissão do microfone...';
    }

    window.RifflyPitch.listen(
        function (frequency) {
            if (statusEl) { statusEl.textContent = ''; }
            updateUI(frequency);
        },
        function (reason) {
            if (!statusEl) { return; }
            statusEl.textContent = reason === 'unsupported'
                ? 'Seu navegador não suporta captura de áudio.'
                : 'Não foi possível acessar o microfone. Permita o acesso nas configurações do navegador e recarregue a página.';
        }
    );
});