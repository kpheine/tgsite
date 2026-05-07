# Guia de Deploy — Google Cloud

Siga cada passo na ordem. Tempo estimado de trabalho: 30 minutos.

---

## Parte 1 — Conta e projeto no Google Cloud

### 1.1 Criar um projeto

1. No painel do Google Cloud, clique no seletor de projetos no topo (ao lado do logo Google Cloud).
2. Clique em **Novo projeto**.
3. Nome sugerido: `tg-site-prod`
4. Clique em **Criar** e aguarde.
5. Certifique-se de que o projeto novo está selecionado no seletor.

---

## Parte 2 — Criar a máquina virtual (VM)

### 2.1 Navegar até Compute Engine

1. No menu lateral, clique em **Compute Engine** > **Instâncias de VM**.
2. Se for a primeira vez, clique em **Ativar** e aguarde alguns minutos.

### 2.2 Criar a instância

Clique em **Criar instância** e configure:

| Campo | Valor |
|---|---|
| Nome | `tg-site` |
| Região | `southamerica-east1` (São Paulo) |
| Zona | `southamerica-east1-a` |
| Tipo de máquina | `e2-small` (1 vCPU, 2 GB RAM) |
| Sistema operacional | Ubuntu 22.04 LTS (x86/64) |
| Disco de inicialização | SSD persistente, 20 GB |
| Firewall | Marcar **Permitir tráfego HTTP** e **Permitir tráfego HTTPS** |

> **Custo estimado:** e2-small em São Paulo custa aproximadamente US$ 14/mes.
> Você pode reduzir para e2-micro (~US$ 6/mes) após o site estar estável,
> mas e2-micro pode ser lento durante o build inicial do Docker.

Clique em **Criar** e aguarde a VM ficar com o status "Em execução" (bolinha verde).

### 2.3 Abrir a porta do site no firewall

O site roda na porta 4321 internamente, mas o Nginx (instalado mais adiante)
vai expor as portas 80 e 443 para o mundo. As portas 80 e 443 já foram liberadas
ao marcar HTTP/HTTPS na criação da VM. Nenhuma ação adicional é necessária.

---

## Parte 3 — Conectar à VM e instalar dependências

### 3.1 Abrir o terminal SSH

Na lista de instâncias, clique em **SSH** ao lado da VM `tg-site`.
Uma janela de terminal abre no navegador. Todos os comandos a seguir
são executados nesse terminal.

### 3.2 Atualizar o sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Instalar Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Verificar se funcionou:

```bash
docker --version
```

Deve aparecer algo como `Docker version 26.x.x`.

### 3.4 Instalar Git

```bash
sudo apt install -y git
```

---

## Parte 4 — Colocar o código na VM

Escolha **uma** das duas opções abaixo.

### Opção A — Via Git (recomendado se o código está em um repositório)

```bash
git clone https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git tg-site
cd tg-site
```

Substitua a URL pelo endereço real do repositório.
Se o repositório for privado, você precisará configurar um token de acesso
pessoal do GitHub (Settings > Developer settings > Personal access tokens).

### Opção B — Via arquivo .zip

Se você recebeu o projeto como arquivo .zip:

1. Instale o `unzip`:
   ```bash
   sudo apt install -y unzip
   ```
2. Faça upload do .zip usando o botão de upload do terminal SSH do Google Cloud
   (ícone de engrenagem no canto superior direito da janela SSH > "Upload file").
3. Descompacte:
   ```bash
   unzip tg-site.zip -d tg-site
   cd tg-site
   ```

---

## Parte 5 — Configurar as variáveis de ambiente

Dentro da pasta do projeto, copie o arquivo de exemplo:

```bash
cp .env.example .env
nano .env
```

O editor `nano` abre. Edite cada linha conforme abaixo:

```
ADMIN_PATH=/painel-tg-2026
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CRIE-UMA-SENHA-FORTE-AQUI
SESSION_SECRET=UMA-SEQUENCIA-LONGA-E-ALEATORIA-DE-LETRAS-E-NUMEROS
HOST=0.0.0.0
PORT=4321
ALLOWED_HOSTS=seudominio.com.br,www.seudominio.com.br
SESSION_COOKIE_SECURE=true
UPLOAD_MAX_IMAGE_BYTES=8388608

SMTP_USER=conta-que-vai-enviar@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
CONTACT_TO=onde-chegar-os-emails@seudominio.com.br
```

**Campos obrigatorios que voce precisa alterar:**

- `ADMIN_PASSWORD` — senha de acesso ao painel de administração. Use algo longo e difícil.
- `SESSION_SECRET` — sequência aleatória longa (ex: abra [passwordsgenerator.net](https://passwordsgenerator.net) e gere 64 caracteres sem símbolos).
- `ALLOWED_HOSTS` — coloque seu domínio real (sem `https://`). Se ainda não tiver domínio, coloque o IP externo da VM (visível na lista de instâncias do Google Cloud).
- `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO` — veja a **Parte 7** (configuração do formulário de contato).

Para salvar no `nano`: `Ctrl+O`, Enter, depois `Ctrl+X`.

---

## Parte 6 — Subir o site com Docker

Dentro da pasta do projeto:

```bash
docker compose up --build -d
```

O build leva 3–5 minutos na primeira vez. Para verificar se está rodando:

```bash
docker compose ps
```

Deve aparecer o container com status `Up`.

Para ver os logs em tempo real:

```bash
docker compose logs -f
```

O site já está rodando na porta 4321. Para acessar temporariamente antes de configurar o domínio:

```
http://IP-EXTERNO-DA-VM:4321
```

> O IP externo da VM está visível na lista de instâncias do Google Cloud.
> Para acessar essa URL temporária, você precisará abrir a porta 4321 no firewall
> do Google Cloud (VPC Network > Firewall > Criar regra: tcp:4321, todas as origens).
> Remova essa regra após configurar o Nginx.

---

## Parte 7 — Configurar o formulário de contato (Gmail)

O formulário de contato do site envia emails via Gmail. Você precisa de uma
conta Gmail dedicada para isso (pode ser uma conta existente da empresa).

### 7.1 Ativar a verificação em duas etapas

1. Acesse [myaccount.google.com](https://myaccount.google.com).
2. Segurança > Verificação em duas etapas > Ativar.

### 7.2 Criar uma Senha de App

1. Ainda em Segurança, procure por **Senhas de app** (aparece após ativar 2FA).
2. Clique em **Senhas de app**.
3. Em "Selecionar app", escolha **Outro (nome personalizado)** e digite "Site TG".
4. Clique em **Gerar**.
5. Uma senha de 16 caracteres aparece. **Copie agora — ela não será mostrada novamente.**

### 7.3 Preencher o .env

Abra o `.env` novamente (`nano .env`) e preencha:

```
SMTP_USER=conta-que-envia@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
CONTACT_TO=email-onde-quer-receber@seudominio.com.br
```

Após editar, suba o container novamente para aplicar:

```bash
docker compose up --build -d
```

### Limitações conhecidas do formulário

- Limite de 500 emails/dia via Gmail SMTP.
- Os primeiros emails podem cair na pasta de spam — adicione o endereço remetente aos contatos e verifique nas primeiras semanas.

---

## Parte 8 — Domínio e HTTPS (Nginx + Certbot)

### 8.1 Apontar o domínio para a VM

No painel do seu provedor de domínio (Registro.br, GoDaddy, etc.):

- Crie um registro **A** apontando `@` (raiz) para o **IP externo** da sua VM.
- Crie um registro **A** apontando `www` para o mesmo IP.

Aguarde a propagação (pode levar de alguns minutos até 24 horas).

### 8.2 Instalar Nginx

Na VM:

```bash
sudo apt install -y nginx
```

### 8.3 Criar a configuração do Nginx

```bash
sudo nano /etc/nginx/sites-available/tg-site
```

Cole o conteúdo abaixo, substituindo `seudominio.com.br`:

```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    client_max_body_size 2100m;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Salve: `Ctrl+O`, Enter, `Ctrl+X`.

Ative a configuração:

```bash
sudo ln -s /etc/nginx/sites-available/tg-site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` deve retornar `syntax is ok` e `test is successful`.

### 8.4 Instalar o certificado SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

Siga as instruções:
- Informe um email para receber alertas de renovação.
- Aceite os termos.
- Escolha redirecionar HTTP para HTTPS (opção 2).

O Certbot configura o HTTPS e renova o certificado automaticamente. O site
agora está acessível em `https://seudominio.com.br`.

---

## Parte 9 — Painel de administração

O painel de administração está em:

```
https://seudominio.com.br/painel-tg-2026
```

Use o `ADMIN_USERNAME` e `ADMIN_PASSWORD` definidos no `.env`.

> Se quiser alterar o caminho do painel, mude o valor de `ADMIN_PATH` no `.env`
> e suba o container novamente com `docker compose up --build -d`.

---

## Parte 10 — Operacao e manutencao

### Reiniciar o site

```bash
cd ~/tg-site
docker compose restart
```

### Parar o site

```bash
docker compose down
```

### Atualizar o site (novo codigo)

```bash
cd ~/tg-site
git pull          # (se usar Git)
docker compose up --build -d
```

### Ver logs

```bash
docker compose logs -f
```

### Reinício automático

O Compose está configurado com `restart: unless-stopped` — o container sobe automaticamente com a VM.

### Onde ficam os dados?

- **Banco de dados (casos/portfólio):** `~/tg-site/data/site.db`
- **Imagens e vídeos enviados:** `~/tg-site/uploads/`

**Faça backup desses dois diretórios regularmente.** Uma forma simples é compactá-los e baixar via SCP ou fazer upload para o Google Drive manualmente. Os dados do site não são apagados ao atualizar o código.

### Backup manual

```bash
cd ~/tg-site
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

---

## Resumo dos comandos mais usados

| Acao | Comando |
|---|---|
| Subir o site | `docker compose up --build -d` |
| Reiniciar | `docker compose restart` |
| Parar | `docker compose down` |
| Ver logs | `docker compose logs -f` |
| Ver status | `docker compose ps` |
| Atualizar codigo | `git pull && docker compose up --build -d` |
| Backup local | `tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/` |

---

## Contato em caso de problemas

Se o site parar de funcionar, verifique nesta ordem:

1. `docker compose ps` — o container está `Up`?
2. `docker compose logs -f` — há algum erro visível?
3. `sudo systemctl status nginx` — o Nginx está ativo?
4. O IP da VM mudou? VMs no Google Cloud podem ter IP externo dinâmico —
   considere reservar um IP estático (VPC Network > Endereços IP externos > Reservar).
