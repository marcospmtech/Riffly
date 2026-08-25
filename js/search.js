document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('search');
    var resultsEl = document.getElementById('searchResults');

    if (!input || !resultsEl) {
        return;
    }

    var DEBOUNCE_MS = 300;
    var debounceTimer = null;
    var requisicaoAtual = 0;

    function limparResultados() {
        resultsEl.innerHTML = '';
        resultsEl.classList.remove('open');
    }

    function mostrarResultados(cifras) {
        resultsEl.innerHTML = '';

        if (!cifras.length) {
            var vazio = document.createElement('li');
            vazio.className = 'search-result-vazio';
            vazio.textContent = 'Nenhuma música encontrada.';
            resultsEl.appendChild(vazio);
            resultsEl.classList.add('open');
            return;
        }

        cifras.forEach(function (cifra) {
            var item = document.createElement('li');
            var link = document.createElement('a');
            link.href = 'cifra.html?id=' + cifra.id;

            var titulo = document.createElement('span');
            titulo.className = 'search-result-titulo';
            titulo.textContent = cifra.titulo;
            link.appendChild(titulo);

            if (cifra.autor) {
                var autor = document.createElement('span');
                autor.className = 'search-result-autor';
                autor.textContent = cifra.autor;
                link.appendChild(autor);
            }

            item.appendChild(link);
            resultsEl.appendChild(item);
        });

        resultsEl.classList.add('open');
    }

    function buscar(termo) {
        var idDaRequisicao = ++requisicaoAtual;

        fetch('/api/cifras/busca?q=' + encodeURIComponent(termo))
            .then(function (resposta) {
                return resposta.json();
            })
            .then(function (cifras) {
                if (idDaRequisicao !== requisicaoAtual) {
                    return;
                }
                mostrarResultados(cifras);
            })
            .catch(function () {
                limparResultados();
            });
    }

    input.addEventListener('input', function () {
        var termo = input.value.trim();

        clearTimeout(debounceTimer);

        if (termo.length < 2) {
            limparResultados();
            return;
        }

        debounceTimer = setTimeout(function () {
            buscar(termo);
        }, DEBOUNCE_MS);
    });

    document.addEventListener('click', function (event) {
        var cliqueDentro = input.contains(event.target) || resultsEl.contains(event.target);
        if (!cliqueDentro) {
            limparResultados();
        }
    });

    input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            limparResultados();
        }
    });
});
