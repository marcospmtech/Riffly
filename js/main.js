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

        // Se a URL vier com ?afinacao=drop-c (o botão "Ir para o afinador" da
        // página de cifra monta esse link), já seleciona essa afinação sozinho,
        // sem precisar a pessoa abrir a aba lateral e clicar de novo.
        var afinacaoNaUrl = new URLSearchParams(window.location.search).get('afinacao');
        if (afinacaoNaUrl) {
            var opcaoCorrespondente = document.querySelector('.tuning-option[data-tuning="' + afinacaoNaUrl + '"]');
            if (opcaoCorrespondente) {
                opcaoCorrespondente.click();
            }
        }
    }

    // Se a pessoa logada for administrador (salvo no localStorage pelo auth.js
    // depois do login), acrescenta o link "Administrador" na barra lateral.
    // Não mexe em nada se não tiver ninguém logado ou não for admin.
    function mostrarLinkDeAdministradorSeForOCaso() {
        var sidebarLista = document.querySelector('#sidebar ul');
        if (!sidebarLista) {
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
            return; // localStorage corrompido/adulterado — ignora em vez de quebrar a página
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