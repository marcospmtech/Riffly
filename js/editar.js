// Página Editar música: busca uma música existente, preenche o formulário com
// os dados atuais, e salva as alterações via PUT (em vez de criar uma nova).
document.addEventListener('DOMContentLoaded', function () {
    var buscaInput = document.getElementById('editarBusca');
    var resultadosEl = document.getElementById('editarResultados');
    var statusEl = document.getElementById('editarStatus');
    var form = document.getElementById('editarForm');
    var idInput = document.getElementById('editarId');
    var tituloInput = document.getElementById('title');
    var autorInput = document.getElementById('author');
    var albumInput = document.getElementById('album');
    var bpmInput = document.getElementById('bpm');
    var ytInput = document.getElementById('yt');
    var afinacaoSelect = document.getElementById('afinacao');
    var fileInput = document.getElementById('cifra-file');
    var preview = document.getElementById('uploadPreview');
    var icon = document.getElementById('uploadIcon');
    var text = document.getElementById('uploadText');
    var erroEl = document.getElementById('editarErro');

    if (!buscaInput || !form) {
        return; // não é a página de editar
    }

    var DEBOUNCE_MS = 300;
    var debounceTimer = null;
    var requisicaoAtual = 0;

    // ---- Busca (igual em espírito ao js/search.js, mas clicar num resultado
    // carrega os dados no formulário em vez de navegar pra outra página) ----

    function limparResultados() {
        resultadosEl.innerHTML = '';
        resultadosEl.classList.remove('open');
    }

    function mostrarResultados(cifras) {
        resultadosEl.innerHTML = '';

        if (!cifras.length) {
            var vazio = document.createElement('li');
            vazio.className = 'search-result-vazio';
            vazio.textContent = 'Nenhuma música encontrada.';
            resultadosEl.appendChild(vazio);
            resultadosEl.classList.add('open');
            return;
        }

        cifras.forEach(function (cifra) {
            var item = document.createElement('li');
            var link = document.createElement('a');
            link.href = '#';

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

            link.addEventListener('click', function (event) {
                event.preventDefault();
                buscaInput.value = cifra.titulo;
                limparResultados();
                carregarMusica(cifra.id);
            });

            item.appendChild(link);
            resultadosEl.appendChild(item);
        });

        resultadosEl.classList.add('open');
    }

    function buscar(termo) {
        var idDaRequisicao = ++requisicaoAtual;

        fetch('/api/cifras/busca?q=' + encodeURIComponent(termo))
            .then(function (resposta) { return resposta.json(); })
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

    buscaInput.addEventListener('input', function () {
        var termo = buscaInput.value.trim();
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
        var cliqueDentro = buscaInput.contains(event.target) || resultadosEl.contains(event.target);
        if (!cliqueDentro) {
            limparResultados();
        }
    });

    // ---- Carrega os dados da música escolhida dentro do formulário ----

    function resetarPreview() {
        preview.style.display = 'none';
        icon.style.display = 'block';
        text.style.display = 'block';
    }

    function carregarMusica(id) {
        statusEl.textContent = 'Carregando...';
        statusEl.classList.remove('sucesso');
        form.style.display = 'none';
        erroEl.textContent = '';
        fileInput.value = ''; // limpa qualquer foto que tivesse sido escolhida antes de trocar de música

        fetch('/api/cifras/' + encodeURIComponent(id))
            .then(function (resposta) {
                return resposta.json().then(function (corpo) {
                    return { ok: resposta.ok, corpo: corpo };
                });
            })
            .then(function (resultado) {
                if (!resultado.ok) {
                    statusEl.textContent = resultado.corpo.erro || 'Música não encontrada.';
                    return;
                }

                var cifra = resultado.corpo;

                idInput.value = cifra.id;
                tituloInput.value = cifra.titulo || '';
                autorInput.value = cifra.autor || '';
                albumInput.value = cifra.album || '';
                bpmInput.value = cifra.bpm || '';
                ytInput.value = cifra.youtube_link || '';
                afinacaoSelect.value = cifra.afinacao || 'padrao';

                if (cifra.foto_arquivo) {
                    preview.src = cifra.foto_arquivo;
                    preview.style.display = 'block';
                    icon.style.display = 'none';
                    text.style.display = 'none';
                } else {
                    resetarPreview();
                }

                statusEl.textContent = '';
                form.style.display = 'flex';
            })
            .catch(function () {
                statusEl.textContent = 'Não foi possível conectar ao servidor.';
            });
    }

    // Pré-visualização instantânea se a pessoa escolher uma foto nova
    fileInput.addEventListener('change', function () {
        if (!fileInput.files || !fileInput.files[0]) {
            return;
        }
        var reader = new FileReader();
        reader.onload = function (event) {
            preview.src = event.target.result;
            preview.style.display = 'block';
            icon.style.display = 'none';
            text.style.display = 'none';
        };
        reader.readAsDataURL(fileInput.files[0]);
    });

    // ---- Salvar (PUT) ----

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        erroEl.textContent = '';
        erroEl.classList.remove('editar-status', 'sucesso');

        var id = idInput.value;
        if (!id) {
            erroEl.textContent = 'Selecione uma música antes de salvar.';
            return;
        }

        var dados = new FormData(form);

        fetch('/api/cifras/' + encodeURIComponent(id), {
            method: 'PUT',
            body: dados
        })
            .then(function (resposta) {
                return resposta.json().then(function (corpo) {
                    return { ok: resposta.ok, corpo: corpo };
                });
            })
            .then(function (resultado) {
                if (!resultado.ok) {
                    erroEl.textContent = resultado.corpo.erro || 'Erro ao salvar.';
                    return;
                }
                erroEl.classList.add('editar-status', 'sucesso');
                erroEl.textContent = 'Alterações salvas.';
            })
            .catch(function () {
                erroEl.textContent = 'Não foi possível conectar ao servidor.';
            });
    });
});
