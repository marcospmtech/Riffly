document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('adminForm');
    var fileInput = document.getElementById('cifra-file');
    var preview = document.getElementById('uploadPreview');
    var icon = document.getElementById('uploadIcon');
    var text = document.getElementById('uploadText');
    var errorEl = document.getElementById('adminError');

    if (!form || !fileInput || !preview) {
        return;
    }

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

                window.location.href = 'cifra.html?id=' + resultado.corpo.id;
            })
            .catch(function () {
                errorEl.textContent = 'Não foi possível conectar ao servidor.';
            });
    });
});
