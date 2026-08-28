if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
        });
    });
}

document.addEventListener('DOMContentLoaded', function () {

    function setupSidebar(toggleSelector, sidebarSelector) {
        var toggleBtn = document.querySelector(toggleSelector);
        var sidebar = document.querySelector(sidebarSelector);

        if (!toggleBtn || !sidebar) {
            return;
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }

        function openSidebar() {
            sidebar.classList.add('open');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }

        toggleBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            var isOpen = sidebar.classList.contains('open');
            if (isOpen) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        document.addEventListener('click', function (event) {
            var clickedInsideSidebar = sidebar.contains(event.target);
            if (sidebar.classList.contains('open') && !clickedInsideSidebar) {
                closeSidebar();
            }
        });
    }

    function setupTuningSelector() {
        var options = document.querySelectorAll('.tuning-option');
        var strings = document.querySelectorAll('[data-string]');

        if (!options.length || !strings.length) {
            return;
        }

        options.forEach(function (option) {
            option.addEventListener('click', function () {
                options.forEach(function (opt) {
                    opt.classList.remove('active');
                });
                option.classList.add('active');

                var notes = option.getAttribute('data-notes').split(',');

                strings.forEach(function (stringEl) {
                    var index = Number(stringEl.getAttribute('data-string'));
                    if (notes[index]) {
                        stringEl.textContent = notes[index];
                        stringEl.setAttribute('data-note', notes[index]);
                    }
                });
            });
        });

        var afinacaoNaUrl = new URLSearchParams(window.location.search).get('afinacao');
        if (afinacaoNaUrl) {
            var opcaoCorrespondente = document.querySelector('.tuning-option[data-tuning="' + afinacaoNaUrl + '"]');
            if (opcaoCorrespondente) {
                opcaoCorrespondente.click();
            }
        }
    }

    function mostrarLinkDeAdministradorSeForOCaso() {
        var sidebarAside = document.getElementById('sidebar');
        var sidebarLista = document.querySelector('#sidebar ul');
        if (!sidebarAside || !sidebarLista) {
            return;
        }

        var usuarioSalvo = localStorage.getItem('rifflyUsuario');
        if (!usuarioSalvo) {
            return;
        }

        var usuario;
        try {
            usuario = JSON.parse(usuarioSalvo);
        } catch (erro) {
            return;
        }

        if (usuario.cargo !== 'admin') {
            return;
        }

        var item = document.createElement('li');
        var link = document.createElement('a');
        link.href = 'administrador.html';
        link.textContent = 'Administrador';
        item.appendChild(link);
        sidebarLista.appendChild(item);

        var itemEditar = document.createElement('li');
        var linkEditar = document.createElement('a');
        linkEditar.href = 'editar.html';
        linkEditar.textContent = 'Editar música';
        itemEditar.appendChild(linkEditar);
        sidebarLista.appendChild(itemEditar);

        montarSecaoDeExclusao(sidebarAside);
    }

    // Seção "Excluir música", só aparece pra admin (chamada de dentro da função
    // acima, que já confirmou o cargo). Busca em /api/cifras (o mesmo endpoint
    // usado no resto do site), preenche um <select> pesquisável e exclui via DELETE.
    function montarSecaoDeExclusao(sidebarAside) {
        var secao = document.createElement('div');
        secao.className = 'sidebar-admin-section';
        secao.innerHTML =
            '<h3 class="sidebar-section-title">Excluir música</h3>' +
            '<input type="text" id="deleteFiltro" class="sidebar-search-input" placeholder="Pesquisar música...">' +
            '<select id="deleteSelect" class="sidebar-select" size="6"></select>' +
            '<button type="button" id="deleteBtn" class="sidebar-delete-btn">Excluir música selecionada</button>' +
            '<p class="field-error" id="deleteMsg"></p>';
        sidebarAside.appendChild(secao);

        var filtroInput = secao.querySelector('#deleteFiltro');
        var selectEl = secao.querySelector('#deleteSelect');
        var deleteBtn = secao.querySelector('#deleteBtn');
        var msgEl = secao.querySelector('#deleteMsg');

        function carregarMusicas() {
            fetch('/api/cifras')
                .then(function (resposta) { return resposta.json(); })
                .then(function (cifras) {
                    selectEl.innerHTML = '';
                    cifras.forEach(function (cifra) {
                        var opcao = document.createElement('option');
                        opcao.value = cifra.id;
                        opcao.textContent = cifra.autor ? (cifra.titulo + ' — ' + cifra.autor) : cifra.titulo;
                        selectEl.appendChild(opcao);
                    });
                })
                .catch(function () {
                    msgEl.textContent = 'Não foi possível carregar as músicas.';
                });
        }

        // Filtro simples: esconde (não remove) as opções que não batem com o texto
        // digitado. "hidden" em <option> é respeitado pelos navegadores modernos.
        filtroInput.addEventListener('input', function () {
            var termo = filtroInput.value.trim().toLowerCase();
            Array.prototype.forEach.call(selectEl.options, function (opcao) {
                opcao.hidden = termo.length > 0 && opcao.textContent.toLowerCase().indexOf(termo) === -1;
            });
        });

        deleteBtn.addEventListener('click', function () {
            msgEl.textContent = '';

            var idSelecionado = selectEl.value;
            if (!idSelecionado) {
                msgEl.textContent = 'Selecione uma música.';
                return;
            }

            var nomeSelecionado = selectEl.options[selectEl.selectedIndex].textContent;
            var confirmou = window.confirm('Excluir "' + nomeSelecionado + '"? Isso não pode ser desfeito.');
            if (!confirmou) {
                return;
            }

            fetch('/api/cifras/' + encodeURIComponent(idSelecionado), { method: 'DELETE' })
                .then(function (resposta) {
                    return resposta.json().then(function (corpo) {
                        return { ok: resposta.ok, corpo: corpo };
                    });
                })
                .then(function (resultado) {
                    if (!resultado.ok) {
                        msgEl.textContent = resultado.corpo.erro || 'Erro ao excluir.';
                        return;
                    }
                    selectEl.options[selectEl.selectedIndex].remove();
                    msgEl.textContent = 'Música excluída.';
                })
                .catch(function () {
                    msgEl.textContent = 'Não foi possível conectar ao servidor.';
                });
        });

        carregarMusicas();
    }

    setupSidebar('.app-select-btn', '#sidebar');
    setupSidebar('#tuningToggle', '#tuningSidebar');
    setupTuningSelector();
    mostrarLinkDeAdministradorSeForOCaso();

    document.addEventListener('keydown', function (event) {
        var hasCtrlOuCmd = event.ctrlKey || event.metaKey;
        var isShortcut = hasCtrlOuCmd && event.shiftKey && event.key.toLowerCase() === 'a';
        if (!isShortcut) {
            return;
        }

        event.preventDefault();

        var jaEstaEmPages = window.location.pathname.indexOf('/pages/') !== -1;
        window.location.href = jaEstaEmPages ? 'administrador.html' : 'pages/administrador.html';
    });
});