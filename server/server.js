const express = require('express');
const path = require('path');
const supabase = require('./supabase');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const app = express();

const PORT = process.env.PORT || 3000;

const RAIZ_DO_SITE = path.join(__dirname, '..');

var SENHA_ADMINISTRADOR = process.env.SENHA_ADMINISTRADOR;

const upload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024
    },

    fileFilter: function (req, file, callback) {

        var ehImagem = file.mimetype.startsWith('image/');

        callback(null, ehImagem);

    }

});


app.use(express.json());

app.use(express.static(RAIZ_DO_SITE));


app.post('/api/registro', async function (req, res) {

    var nome = (req.body.nome || '').trim();

    var email = (req.body.email || '').trim().toLowerCase();

    var senha = req.body.senha || '';


    if (!nome) {

        return res.status(400).json({
            erro: 'Digite seu nome.',
            campo: 'nome'
        });

    }


    if (!email) {

        return res.status(400).json({
            erro: 'Digite um e-mail.',
            campo: 'email'
        });

    }


    if (!senha) {

        return res.status(400).json({
            erro: 'Digite uma senha.',
            campo: 'senha'
        });

    }


    var {
        data: existente,
        error: erroBusca
    } = await supabase

        .from('usuarios')

        .select('id')

        .eq('email', email)

        .maybeSingle();


    if (erroBusca) {

        console.error(
            'Erro ao verificar usuário:',
            erroBusca
        );

        return res.status(500).json({
            erro: 'Erro ao verificar cadastro.'
        });

    }


    if (existente) {

        return res.status(409).json({

            erro: 'E-mail já cadastrado.',

            campo: 'email'

        });

    }


    var senhaAdministrador =
        req.body.senhaAdmin || '';


    var cargo =
        senhaAdministrador === SENHA_ADMINISTRADOR
            ? 'admin'
            : 'user';


    var senhaHash =
        bcrypt.hashSync(senha, 10);


    var {
        error: erroCadastro
    } = await supabase

        .from('usuarios')

        .insert({

            nome: nome,

            email: email,

            senha_hash: senhaHash,

            cargo: cargo

        });


    if (erroCadastro) {

        console.error(
            'Erro ao cadastrar usuário:',
            erroCadastro
        );

        return res.status(500).json({
            erro: 'Erro ao criar cadastro.'
        });

    }


    res.status(201).json({
        ok: true
    });

});


app.post('/api/login', async function (req, res) {

    var email =
        (req.body.email || '').trim().toLowerCase();

    var senha =
        req.body.senha || '';


    if (!email) {

        return res.status(400).json({

            erro: 'Digite um e-mail.',

            campo: 'email'

        });

    }


    if (!senha) {

        return res.status(400).json({

            erro: 'Digite uma senha.',

            campo: 'senha'

        });

    }


    var {
        data: usuario,
        error
    } = await supabase

        .from('usuarios')

        .select('*')

        .eq('email', email)

        .maybeSingle();


    if (error) {

        console.error(
            'Erro ao buscar usuário:',
            error
        );

        return res.status(500).json({

            erro: 'Erro ao consultar usuário.'

        });

    }


    if (!usuario) {

        return res.status(404).json({

            erro: 'E-mail não encontrado.',

            campo: 'email'

        });

    }


    var senhaCorreta =
        bcrypt.compareSync(
            senha,
            usuario.senha_hash
        );


    if (!senhaCorreta) {

        return res.status(401).json({

            erro: 'Senha incorreta.',

            campo: 'senha'

        });

    }


    res.json({

        ok: true,

        nome: usuario.nome,

        cargo: usuario.cargo

    });

});


app.post('/api/cifras', upload.single('foto'), async function (req, res) {

    var titulo =
        (req.body.titulo || '').trim();


    if (!titulo) {

        return res.status(400).json({

            erro: 'Digite o título da música.',

            campo: 'titulo'

        });

    }


    var autor =
        (req.body.autor || '').trim();


    var album =
        (req.body.album || '').trim();


    var bpm =
        parseInt(req.body.bpm, 10);


    if (isNaN(bpm)) {

        bpm = null;

    }


    var youtubeLink =
        (req.body.youtube || '').trim();


    var afinacao =
        (req.body.afinacao || '').trim() || null;


    var fotoArquivo = null;


    if (req.file) {

        var extensao =
            path.extname(req.file.originalname);


        var nomeUnico =
            crypto.randomBytes(16).toString('hex') +
            extensao;


        var {
            error: erroUpload
        } = await supabase

            .storage

            .from('uploads')

            .upload(
                nomeUnico,
                req.file.buffer,
                {

                    contentType:
                        req.file.mimetype,

                    upsert: false

                }
            );


        if (erroUpload) {

            console.error(
                'Erro ao enviar imagem:',
                erroUpload
            );

            return res.status(500).json({

                erro: 'Erro ao enviar imagem.'

            });

        }


        var {
            data: urlPublica
        } = supabase

            .storage

            .from('uploads')

            .getPublicUrl(nomeUnico);


        fotoArquivo =
            urlPublica.publicUrl;

    }


    var {
        data: cifra,
        error
    } = await supabase

        .from('cifras')

        .insert({

            titulo: titulo,

            autor: autor,

            album: album,

            bpm: bpm,

            afinacao: afinacao,

            youtube_link: youtubeLink,

            foto_arquivo: fotoArquivo

        })

        .select('id')

        .single();


    if (error) {

        console.error(
            'Erro ao cadastrar cifra:',
            error
        );


        if (req.file && fotoArquivo) {

            var nomeArquivo =
                fotoArquivo.split('/').pop();


            await supabase

                .storage

                .from('uploads')

                .remove([nomeArquivo]);

        }


        return res.status(500).json({

            erro: 'Erro ao cadastrar cifra.'

        });

    }


    res.status(201).json({

        ok: true,

        id: Number(cifra.id)

    });

});


app.get('/api/cifras', async function (req, res) {

    var {
        data: resultados,
        error
    } = await supabase

        .from('cifras')

        .select('id, titulo, autor')

        .order('titulo');


    if (error) {

        console.error(
            'Erro ao listar cifras:',
            error
        );

        return res.status(500).json({

            erro: 'Erro ao listar cifras.'

        });

    }


    res.json(resultados || []);

});


app.get('/api/cifras/busca', async function (req, res) {

    var termo =
        (req.query.q || '').trim();


    if (termo.length < 2) {

        return res.json([]);

    }


    var {
        data: resultados,
        error
    } = await supabase

        .from('cifras')

        .select('id, titulo, autor')

        .or(
            `titulo.ilike.%${termo}%,autor.ilike.%${termo}%`
        )

        .order('titulo')

        .limit(8);


    if (error) {

        console.error(
            'Erro ao buscar cifras:',
            error
        );

        return res.status(500).json({

            erro: 'Erro ao buscar cifras.'

        });

    }


    res.json(resultados || []);

});


app.get('/api/cifras/:id', async function (req, res) {

    var id =
        parseInt(req.params.id, 10);


    if (isNaN(id)) {

        return res.status(400).json({

            erro: 'Id inválido.'

        });

    }


    var {
        data: cifra,
        error
    } = await supabase

        .from('cifras')

        .select('*')

        .eq('id', id)

        .maybeSingle();


    if (error) {

        console.error(
            'Erro ao buscar cifra:',
            error
        );

        return res.status(500).json({

            erro: 'Erro ao buscar cifra.'

        });

    }


    if (!cifra) {

        return res.status(404).json({

            erro: 'Cifra não encontrada.'

        });

    }


    res.json(cifra);

});


app.delete('/api/cifras/:id', async function (req, res) {

    var id =
        parseInt(req.params.id, 10);


    if (isNaN(id)) {

        return res.status(400).json({

            erro: 'Id inválido.'

        });

    }


    var {
        data: cifra,
        error: erroBusca
    } = await supabase

        .from('cifras')

        .select('foto_arquivo')

        .eq('id', id)

        .maybeSingle();


    if (erroBusca) {

        console.error(
            'Erro ao buscar cifra pra excluir:',
            erroBusca
        );

        return res.status(500).json({

            erro: 'Erro ao excluir cifra.'

        });

    }


    if (!cifra) {

        return res.status(404).json({

            erro: 'Cifra não encontrada.'

        });

    }


    var {
        error: erroExclusao
    } = await supabase

        .from('cifras')

        .delete()

        .eq('id', id);


    if (erroExclusao) {

        console.error(
            'Erro ao excluir cifra:',
            erroExclusao
        );

        return res.status(500).json({

            erro: 'Erro ao excluir cifra.'

        });

    }


    // A foto é guardada no bucket do Supabase como uma URL pública completa;
    // só o nome do arquivo (último pedaço da URL) é o que o storage precisa
    // pra saber o que apagar.
    if (cifra.foto_arquivo) {

        var nomeArquivo =
            cifra.foto_arquivo.split('/').pop();


        await supabase

            .storage

            .from('uploads')

            .remove([nomeArquivo]);

    }


    res.json({

        ok: true

    });

});


app.listen(PORT, function () {

    console.log(
        'Riffly rodando em http://localhost:' + PORT
    );

});