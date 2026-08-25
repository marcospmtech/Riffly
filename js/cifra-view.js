// Página de Cifra: lê "?id=" da URL, busca os dados no backend e preenche a tela.
document.addEventListener('DOMContentLoaded', function () {
    var statusEl = document.getElementById('cifraStatus');
    var mainEl = document.getElementById('cifraMain');
    var cardEl = document.getElementById('cifraCard');
    var tituloEl = document.getElementById('cifraTitulo');
    var autorEl = document.getElementById('cifraAutor');
    var fotoEl = document.getElementById('cifraFoto');
    var playerEl = document.getElementById('cifraPlayer');
    var bpmEl = document.getElementById('cifraBpm');
    var afinacaoEl = document.getElementById('cifraAfinacao');
    var linkAfinadorEl = document.getElementById('linkAfinador');
    var linkMetronomoEl = document.getElementById('linkMetronomo');

    if (!statusEl || !mainEl) {
        return; // não é a página de cifra
    }

    // Nomes legíveis pra cada chave de afinação salva no banco (a mesma lista
    // de chaves usada no <select> do Administrador e nos data-tuning do afinador manual).
    var NOMES_AFINACAO = {
        'padrao': 'Padrão (E A D G B E)',
        'meio-tom-abaixo': 'Meio tom abaixo (Eb Ab Db Gb Bb Eb)',
        'um-tom-abaixo': 'Um tom abaixo (D G C F A D)',
        'drop-d': 'Drop D (D A D G B E)',
        'drop-c': 'Drop C (C G C F A D)',
        'open-g': 'Open G (D G D G B D)',
        'open-d': 'Open D (D A D F# A D)',
        'dadgad': 'DADGAD (D A D G A D)'
    };

    var parametros = new URLSearchParams(window.location.search);
    var id = parametros.get('id');

    if (!id) {
        statusEl.textContent = 'Nenhuma cifra selecionada. Volte e pesquise por uma música.';
        return;
    }

    // Tenta pegar o video do YouTube a partir do link cadastrado, pra montar
    // o link de embed (o link "normal" do YouTube não funciona direto num <iframe>).
    function extrairIdDoYoutube(url) {
        if (!url) {
            return null;
        }
        try {
            var uri = new URL(url);
            if (uri.hostname.indexOf('youtu.be') !== -1) {
                return uri.pathname.replace('/', '');
            }
            return uri.searchParams.get('v');
        } catch (erro) {
            return null;
        }
    }

    fetch('/api/cifras/' + encodeURIComponent(id))
        .then(function (resposta) {
            return resposta.json().then(function (corpo) {
                return { ok: resposta.ok, corpo: corpo };
            });
        })
        .then(function (resultado) {
            if (!resultado.ok) {
                statusEl.textContent = resultado.corpo.erro || 'Cifra não encontrada.';
                return;
            }

            var cifra = resultado.corpo;

            tituloEl.textContent = cifra.titulo;
            autorEl.textContent = [cifra.autor, cifra.album].filter(Boolean).join(' — ');

            if (cifra.foto_arquivo) {
                fotoEl.src = '../uploads/' + cifra.foto_arquivo;
                fotoEl.style.display = 'block';
            } else {
                fotoEl.style.display = 'none';
            }

            var videoId = extrairIdDoYoutube(cifra.youtube_link);
            if (videoId) {
                playerEl.src = 'https://www.youtube.com/embed/' + videoId;
                playerEl.style.display = 'block';
            } else {
                playerEl.style.display = 'none';
            }

            bpmEl.textContent = cifra.bpm ? ('BPM: ' + cifra.bpm) : '';
            afinacaoEl.textContent = cifra.afinacao ? ('Afinação: ' + (NOMES_AFINACAO[cifra.afinacao] || cifra.afinacao)) : '';

            // Pré-configura os botões: o afinador manual já abre com a afinação
            // certa selecionada, e o metrônomo já abre com o BPM certo.
            linkAfinadorEl.href = cifra.afinacao
                ? 'tuner_manual.html?afinacao=' + encodeURIComponent(cifra.afinacao)
                : 'tuner_manual.html';

            linkMetronomoEl.href = cifra.bpm
                ? 'metronome.html?bpm=' + encodeURIComponent(cifra.bpm)
                : 'metronome.html';

            statusEl.style.display = 'none';
            mainEl.style.display = 'flex';
            cardEl.style.display = 'flex';
        })
        .catch(function () {
            statusEl.textContent = 'Não foi possível conectar ao servidor.';
        });
});
