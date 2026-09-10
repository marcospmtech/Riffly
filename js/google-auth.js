// Login com Google via Supabase Auth. Roda em paralelo ao login por
// e-mail/senha (js/auth.js) — são dois sistemas independentes que só se
// encontram no final, gravando o mesmo formato em localStorage('rifflyUsuario'),
// que é o que o main.js lê pra decidir se mostra a área de admin na sidebar.
document.addEventListener('DOMContentLoaded', function () {
    var botaoGoogle = document.getElementById('googleLoginBtn');
    var statusEl = document.getElementById('googleLoginStatus');

    if (!botaoGoogle) {
        return; // essa página não tem o botão do Google
    }

    // Clique no botão: manda a pessoa pro fluxo de login do Google. O Supabase
    // cuida do redirecionamento de ida e volta sozinho — a gente só precisa
    // dizer pra onde voltar depois (a própria página de login).
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

    // Ao voltar do Google, o Supabase já processou o redirecionamento e criou
    // uma sessão sozinho. Aqui só verificamos se essa sessão existe.
    verificarSessaoDoGoogle();

    async function verificarSessaoDoGoogle() {
        var { data } = await supabaseClient.auth.getSession();
        var sessao = data.session;

        if (!sessao) {
            return; // pessoa ainda não logou com Google nessa aba
        }

        var usuario = sessao.user;

        // Garante que existe uma linha em "profiles" pra esse usuário. Como a
        // policy de insert só deixa criar a PRÓPRIA linha (auth.uid() = id),
        // isso é seguro de rodar direto do navegador.
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

        // Mesmo formato que js/auth.js já grava no login por e-mail/senha —
        // é assim que o main.js consegue tratar os dois tipos de login igual.
        localStorage.setItem('rifflyUsuario', JSON.stringify({
            nome: perfil.nome,
            cargo: perfil.cargo
        }));

        window.location.href = '../index.html';
    }
});
