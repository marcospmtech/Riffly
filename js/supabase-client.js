// Cliente Supabase do NAVEGADOR — só pra autenticação (Google). Usa a chave
// "publishable" (equivalente à antiga "anon public"), que é segura de expor
// no front-end — ao contrário da chave secreta do servidor, ela só tem o
// poder que as regras de RLS permitirem.
const SUPABASE_URL = 'https://ykgmskcnzyejgfveeytu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_R_K4fjFfJ7UqtML7lCQwSg_-g1-tZR6';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
