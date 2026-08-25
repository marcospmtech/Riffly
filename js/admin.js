// Página Administrador: pré-visualiza a foto escolhida dentro do próprio card,
// e envia o formulário inteiro (texto + arquivo) pro backend via fetch.
document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('adminForm');
    var fileInput = document.getElementById('cifra-file');
    var preview = document.getElementById('uploadPreview');
    var icon = document.getElementById('uploadIcon');
    var text = document.getElementById('uploadText');
    var errorEl = document.getElementById('adminError');

    if (!form || !fileInput || !preview) {
        return; // não é a página do administrador
    }

    // Assim que a pessoa escolhe uma foto, mostra ela dentro do card — antes
    // mesmo de clicar em "Salvar cifra". FileReader lê o arquivo local e
    // devolve como uma URL base64 que o próprio navegador consegue exibir.
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

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        errorEl.textContent = '';

        // FormData pega o form inteiro, incluindo o arquivo — o navegador monta
        // o multipart/form-data sozinho, não precisa converter nada manualmente.
        var dados = new FormData(form);

        fetch('/api/cifras', {
            method: 'POST',
            body: dados
        })
            .then(function (resposta) {
                return resposta.json().then(function (corpo) {
                    return { ok: resposta.ok, corpo: corpo };
                });
            })
            .then(function (resultado) {
                if (!resultado.ok) {
                    errorEl.textContent = resultado.corpo.erro || 'Algo deu errado. Tente de novo.';
                    return;
                }

                // Manda direto pra página da cifra recém-criada.
                window.location.href = 'cifra.html?id=' + resultado.corpo.id;
            })
            .catch(function () {
                errorEl.textContent = 'Não foi possível conectar ao servidor.';
            });
    });
});
