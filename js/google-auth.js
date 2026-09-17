document.addEventListener('DOMContentLoaded', function () {
    var botaoGoogle = document.getElementById('googleLoginBtn');
    var statusEl = document.getElementById('googleLoginStatus');

    if (!botaoGoogle) {
        return;
    }

    botaoGoogle.addEventListener('click', async function () {
        var { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/pages/login.html'
            }
        });

        if (error && statusEl) {
            statusEl.textContent = 'Não foi possível iniciar o login com Google.';
        }
    });

    verificarSessaoDoGoogle();

    async function verificarSessaoDoGoogle() {
        var { data } = await supabaseClient.auth.getSession();
        var sessao = data.session;

        if (!sessao) {
            return;
        }

        var usuario = sessao.user;

        var { data: perfilExistente } = await supabaseClient
            .from('profiles')
            .select('cargo, nome')
            .eq('id', usuario.id)
            .maybeSingle();

        var perfil = perfilExistente;

        if (!perfil) {
            var nomeGoogle = usuario.user_metadata && usuario.user_metadata.full_name
                ? usuario.user_metadata.full_name
                : usuario.email;

            var { data: perfilCriado, error: erroCriacao } = await supabaseClient
                .from('profiles')
                .insert({ id: usuario.id, nome: nomeGoogle, email: usuario.email })
                .select('cargo, nome')
                .single();

            if (erroCriacao) {
                if (statusEl) { statusEl.textContent = 'Login feito, mas houve um erro ao criar o perfil.'; }
                return;
            }

            perfil = perfilCriado;
        }

        localStorage.setItem('rifflyUsuario', JSON.stringify({
            nome: perfil.nome,
            cargo: perfil.cargo
        }));

        window.location.href = '../index.html';
    }
});
