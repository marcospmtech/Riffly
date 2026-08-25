const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const RAIZ_DO_SITE = path.join(__dirname, '..');
const CAMINHO_BANCO = path.join(RAIZ_DO_SITE, 'db', 'login.db');
const CAMINHO_BANCO_CIFRAS = path.join(RAIZ_DO_SITE, 'db', 'cifras.db');
const PASTA_UPLOADS = path.join(RAIZ_DO_SITE, 'uploads');

if (!fs.existsSync(PASTA_UPLOADS)) {
    fs.mkdirSync(PASTA_UPLOADS);
}

const PASTA_DB = path.join(RAIZ_DO_SITE, 'db');

if (!fs.existsSync(PASTA_DB)) {
    fs.mkdirSync(PASTA_DB);
}

const db = new DatabaseSync(CAMINHO_BANCO);
const dbCifras = new DatabaseSync(CAMINHO_BANCO_CIFRAS);

db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

var colunas = db.prepare('PRAGMA table_info(usuarios)').all();
var jaTemCargo = colunas.some(function (coluna) { return coluna.name === 'cargo'; });
if (!jaTemCargo) {
    db.exec("ALTER TABLE usuarios ADD COLUMN cargo TEXT NOT NULL DEFAULT 'user'");
}

var SENHA_ADMINISTRADOR = process.env.SENHA_ADMINISTRADOR;

dbCifras.exec(`
    CREATE TABLE IF NOT EXISTS cifras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        autor TEXT,
        album TEXT,
        bpm INTEGER,
        afinacao TEXT,
        youtube_link TEXT,
        foto_arquivo TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    )
`);

var colunasCifras = dbCifras.prepare('PRAGMA table_info(cifras)').all();
var jaTemAfinacao = colunasCifras.some(function (coluna) { return coluna.name === 'afinacao'; });
if (!jaTemAfinacao) {
    dbCifras.exec('ALTER TABLE cifras ADD COLUMN afinacao TEXT');
}

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, PASTA_UPLOADS);
        },
        filename: function (req, file, callback) {
            var extensao = path.extname(file.originalname);
            var nomeUnico = crypto.randomBytes(16).toString('hex') + extensao;
            callback(null, nomeUnico);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, callback) {
        var ehImagem = file.mimetype.startsWith('image/');
        callback(null, ehImagem);
    }
});

app.use(express.json());
app.use(express.static(RAIZ_DO_SITE));

app.post('/api/registro', function (req, res) {
    var nome = (req.body.nome || '').trim();
    var email = (req.body.email || '').trim().toLowerCase();
    var senha = req.body.senha || '';

    if (!nome) {
        return res.status(400).json({ erro: 'Digite seu nome.', campo: 'nome' });
    }
    if (!email) {
        return res.status(400).json({ erro: 'Digite um e-mail.', campo: 'email' });
    }
    if (!senha) {
        return res.status(400).json({ erro: 'Digite uma senha.', campo: 'senha' });
    }

    var existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existente) {
        return res.status(409).json({ erro: 'E-mail já cadastrado.', campo: 'email' });
    }

    var senhaAdministrador = req.body.senhaAdmin || '';
    var cargo = senhaAdministrador === SENHA_ADMINISTRADOR ? 'admin' : 'user';

    var senhaHash = bcrypt.hashSync(senha, 10);

    db.prepare('INSERT INTO usuarios (nome, email, senha_hash, cargo) VALUES (?, ?, ?, ?)')
        .run(nome, email, senhaHash, cargo);

    res.status(201).json({ ok: true });
});

app.post('/api/login', function (req, res) {
    var email = (req.body.email || '').trim().toLowerCase();
    var senha = req.body.senha || '';

    if (!email) {
        return res.status(400).json({ erro: 'Digite um e-mail.', campo: 'email' });
    }
    if (!senha) {
        return res.status(400).json({ erro: 'Digite uma senha.', campo: 'senha' });
    }

    var usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!usuario) {
        return res.status(404).json({ erro: 'E-mail não encontrado.', campo: 'email' });
    }

    var senhaCorreta = bcrypt.compareSync(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        return res.status(401).json({ erro: 'Senha incorreta.', campo: 'senha' });
    }

    res.json({ ok: true, nome: usuario.nome, cargo: usuario.cargo });
});

app.post('/api/cifras', upload.single('foto'), function (req, res) {
    var titulo = (req.body.titulo || '').trim();

    if (!titulo) {
        return res.status(400).json({ erro: 'Digite o título da música.', campo: 'titulo' });
    }

    var autor = (req.body.autor || '').trim();
    var album = (req.body.album || '').trim();
    var bpm = parseInt(req.body.bpm, 10);
    if (isNaN(bpm)) {
        bpm = null;
    }
    var youtubeLink = (req.body.youtube || '').trim();
    var afinacao = (req.body.afinacao || '').trim() || null;
    var fotoArquivo = req.file ? req.file.filename : null;

    var resultado = dbCifras.prepare(
        'INSERT INTO cifras (titulo, autor, album, bpm, afinacao, youtube_link, foto_arquivo) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(titulo, autor, album, bpm, afinacao, youtubeLink, fotoArquivo);

    res.status(201).json({ ok: true, id: Number(resultado.lastInsertRowid) });
});

app.get('/api/cifras/busca', function (req, res) {
    var termo = (req.query.q || '').trim();

    if (termo.length < 2) {
        return res.json([]);
    }

    var termoBusca = '%' + termo + '%';
    var resultados = dbCifras.prepare(
        'SELECT id, titulo, autor FROM cifras WHERE titulo LIKE ? OR autor LIKE ? ORDER BY titulo LIMIT 8'
    ).all(termoBusca, termoBusca);

    res.json(resultados);
});

app.get('/api/cifras/:id', function (req, res) {
    var id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
        return res.status(400).json({ erro: 'Id inválido.' });
    }

    var cifra = dbCifras.prepare('SELECT * FROM cifras WHERE id = ?').get(id);

    if (!cifra) {
        return res.status(404).json({ erro: 'Cifra não encontrada.' });
    }

    res.json(cifra);
});

app.listen(PORT, function () {
    console.log('Riffly rodando em http://localhost:' + PORT);
});