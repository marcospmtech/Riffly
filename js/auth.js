// Cadastro e login: envia os formulários pro backend Node (server/server.js)
// via fetch, e mostra a mensagem de erro embaixo do campo certo.
document.addEventListener('DOMContentLoaded', function () {
    var loginForm = document.getElementById('loginForm');
    var registroForm = document.getElementById('registroForm');

    function limparErros(form) {
        form.querySelectorAll('.field-error').forEach(function (el) {
            el.textContent = '';
        });
    }

    function mostrarErro(form, campo, mensagem) {
        limparErros(form);

        // O servidor diz de qual campo é o erro (ex: "email"). Se por algum
        // motivo ele não disser, cai no primeiro campo de erro do formulário.
        var alvo = campo ? form.querySelector('[data-error-for="' + campo + '"]') : null;
        if (!alvo) {
            alvo = form.querySelector('.field-error');
        }
        if (alvo) {
            alvo.textContent = mensagem;
        }
    }

    function enviarFormulario(form, url, aoDarCerto) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            limparErros(form);

            var dados = {};
            new FormData(form).forEach(function (valor, chave) {
                dados[chave] = valor;
            });

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            })
                .then(function (resposta) {
                    return resposta.json().then(function (corpo) {
                        return { ok: resposta.ok, corpo: corpo };
                    });
                })
                .then(function (resultado) {
                    if (!resultado.ok) {
                        mostrarErro(form, resultado.corpo.campo, resultado.corpo.erro || 'Algo deu errado. Tente de novo.');
                        return;
                    }
                    aoDarCerto(resultado.corpo);
                })
                .catch(function () {
                    // Servidor Node não está rodando, ou não tem rede — não tem campo
                    // específico pra culpar, então a mensagem cai no primeiro campo.
                    mostrarErro(form, null, 'Não foi possível conectar ao servidor.');
                });
        });
    }

    if (loginForm) {
        enviarFormulario(loginForm, '/api/login', function (corpo) {
            // Guarda quem é a pessoa logada no navegador (localStorage sobrevive a
            // fechar a aba/o navegador). Não é uma sessão de servidor de verdade,
            // é só o que a gente precisa agora pra saber se mostra "Administrador"
            // na barra lateral — outras páginas leem isso no main.js.
            localStorage.setItem('rifflyUsuario', JSON.stringify({
                nome: corpo.nome,
                cargo: corpo.cargo
            }));
            window.location.href = '../index.html';
        });
    }

    if (registroForm) {
        enviarFormulario(registroForm, '/api/registro', function () {
            window.location.href = 'login.html';
        });
    }
});