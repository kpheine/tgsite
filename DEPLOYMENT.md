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

### 2.3 Reservar um IP externo estático

Por padrão, o IP externo da VM é **efêmero** — ele muda se a VM for parada e
iniciada novamente, o que quebraria o DNS do domínio. Antes de apontar o domínio
(Parte 8), reserve um IP fixo:

1. No menu lateral, vá em **VPC Network** > **Endereços IP externos**.
2. Localize o IP da VM `tg-site` na lista, com tipo "Efêmero".
3. Clique em **Reservar** (ou no menu de três pontos > "Promover para estático").
4. Dê um nome, por exemplo `tg-site-ip`, e confirme.

A partir daqui, esse é o IP que você usará nos registros DNS na Parte 8.

### 2.4 Abrir as portas do site no firewall

O site roda em Docker Compose com Caddy na frente. O Caddy expõe as portas
`80` e `443` para o mundo e encaminha o tráfego internamente para a aplicação.
As portas `80` e `443` já foram liberadas ao marcar HTTP/HTTPS na criação da VM.
Nenhuma ação adicional é necessária.

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

### 3.5 Criar um arquivo de swap (recomendado em e2-small/e2-micro)

O build do Docker compila módulos nativos (`better-sqlite3`) e roda o build do
Astro dentro de 2 GB de RAM. Em máquinas pequenas isso pode esgotar a memória e
fazer o build ser encerrado ("Killed") no meio. Um arquivo de swap de 2 GB evita
esse problema:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Verificar:

```bash
free -h
```

A linha `Swap:` deve mostrar `2.0Gi`. O swap fica ativo automaticamente após
reinícios da VM.

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
SITE_DOMAINS=seudominio.com.br, www.seudominio.com.br
SESSION_COOKIE_SECURE=true
TRUST_PROXY_HEADERS=true
UPLOAD_MAX_IMAGE_BYTES=8388608
UPLOAD_MAX_HTML_BYTES=16777216

SMTP_USER=conta-que-vai-enviar@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
CONTACT_TO=onde-chegar-os-emails@seudominio.com.br
```

**Campos obrigatorios que voce precisa alterar:**

- `ADMIN_PASSWORD` — senha de acesso ao painel de administração. Use algo longo e difícil.
- `SESSION_SECRET` — sequência aleatória longa (ex: abra [passwordsgenerator.net](https://passwordsgenerator.net) e gere 64 caracteres sem símbolos).
- `SITE_DOMAINS` — coloque o domínio real atendido pelo Caddy, sem `https://`. Exemplo: `seudominio.com.br, www.seudominio.com.br`.
- `SMTP_USER`, `SMTP_PASS`, `CONTACT_TO` — veja a **Parte 7** (configuração do formulário de contato).

**Campos opcionais (deixe como estão, a menos que precise mudar):**

- `UPLOAD_MAX_IMAGE_BYTES` — tamanho máximo (em bytes) de cada imagem enviada no painel. Padrão: 8 MB.
- `UPLOAD_MAX_HTML_BYTES` — tamanho máximo (em bytes) de cada arquivo HTML enviado em "Páginas privadas" (veja a **Parte 9**). Como esses arquivos costumam ter imagens embutidas em base64, o padrão é generoso: 16 MB.

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

Devem aparecer dois containers com status `Up`: `app` e `caddy`.

Você também verá um terceiro container, `app-permissions`, com status
`Exited (0)`. **Isso é esperado e correto** — ele é um passo de inicialização que
ajusta as permissões das pastas de dados e encerra sozinho. Só precisa se
preocupar se o status dele for diferente de `Exited (0)`.

Para ver os logs em tempo real:

```bash
docker compose logs -f
```

O Caddy escuta nas portas `80` e `443`. Depois que o domínio apontar para a VM,
acesse:

```
https://seudominio.com.br
```

Para um teste local sem domínio real, use `SITE_DOMAINS=localhost` no `.env`, rode
`docker compose up --build -d` e acesse `http://localhost` na própria máquina.
Na VM de produção, não abra a porta `4321` no firewall: a aplicação deve ficar
acessível apenas pela rede interna do Docker.

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

## Parte 8 — Domínio e HTTPS (Caddy)

### 8.1 Apontar o domínio para a VM

No painel do seu provedor de domínio (Registro.br, GoDaddy, etc.):

- Crie um registro **A** apontando `@` (raiz) para o **IP externo estático** da sua VM (o que você reservou na **Parte 2.3**).
- Crie um registro **A** apontando `www` para o mesmo IP.

Aguarde a propagação (pode levar de alguns minutos até 24 horas).

### 8.2 Conferir o `.env`

No arquivo `.env`, confirme que `SITE_DOMAINS` contém todos os domínios que
apontam para a VM:

```bash
SITE_DOMAINS=seudominio.com.br, www.seudominio.com.br
```

Não inclua `https://` e não use caminhos. Use apenas nomes de domínio.

### 8.3 Subir ou reiniciar o Docker Compose

```bash
docker compose up --build -d
```

O Caddy lê o `Caddyfile`, atende os domínios em `SITE_DOMAINS`, emite o
certificado HTTPS automaticamente via Let's Encrypt e redireciona HTTP para HTTPS.
Os certificados ficam salvos no volume Docker `caddy_data`, então não são perdidos
ao reiniciar ou atualizar o site.

### 8.4 Verificar se o HTTPS funcionou

Abra no navegador:

```
https://seudominio.com.br
```

Se o certificado ainda não foi emitido, verifique:

- O DNS do domínio já aponta para o IP externo da VM.
- As portas `80` e `443` estão liberadas no firewall da VM.
- O valor de `SITE_DOMAINS` está correto no `.env`.
- Os logs do Caddy mostram detalhes do erro: `docker compose logs -f caddy`.

---

## Parte 9 — Painel de administração

O painel de administração está em:

```
https://seudominio.com.br/painel-tg-2026
```

Use o `ADMIN_USERNAME` e `ADMIN_PASSWORD` definidos no `.env`.

> Se quiser alterar o caminho do painel, mude o valor de `ADMIN_PATH` no `.env`
> e suba o container novamente com `docker compose up --build -d`.

### O que dá para gerenciar no painel

- **Casos / portfólio** — título, descrição e imagens de cada projeto exibido no site.
- **Recomendações** — depoimentos/testemunhos exibidos no site.
- **Páginas privadas** — envio de arquivos HTML independentes. Cada um recebe um
  endereço secreto e aleatório (`/p/<código>`) para enviar a um contato específico.
  As páginas não são vinculadas em lugar nenhum do site e são marcadas como
  `noindex` (não aparecem em buscadores).

> **Páginas privadas — observações:** o HTML enviado precisa ser **autossuficiente**
> (CSS, JS e imagens embutidos no próprio arquivo, como data URIs ou URLs absolutas;
> caminhos relativos não funcionam). Para alterar uma página, exclua e envie de novo
> — isso gera um **novo** endereço. Qualquer pessoa com o link consegue ver a página,
> então trate o link como segredo. O tamanho máximo é controlado por
> `UPLOAD_MAX_HTML_BYTES` (veja a **Parte 5**).

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

> **Atualizações do banco de dados são automáticas.** Quando uma nova versão do
> código muda a estrutura do banco, o app atualiza o arquivo `data/site.db` no
> lugar, na primeira vez que sobe — **sem perder** casos, recomendações ou páginas
> já cadastrados. Nenhum passo manual é necessário. Ainda assim, faça um backup
> (veja abaixo) antes de atualizar, por segurança.

### Ver logs

```bash
docker compose logs -f
```

### Reinício automático

O Compose está configurado com `restart: unless-stopped` — o container sobe automaticamente com a VM.

### Onde ficam os dados?

- **Banco de dados (casos/portfólio, recomendações e páginas privadas):** `~/tg-site/data/site.db`
- **Imagens e vídeos enviados:** `~/tg-site/uploads/`

**Faça backup desses dois diretórios regularmente.** Uma forma simples é compactá-los e baixar via SCP ou fazer upload para o Google Drive manualmente. Os dados do site não são apagados ao atualizar o código.

### Backup manual

```bash
cd ~/tg-site
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Backup automático diário (recomendado)

Para não depender de lembrar do backup, agende-o com o `cron`. Crie a pasta de
backups e adicione uma tarefa diária às 3h da manhã:

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo '0 3 * * * cd ~/tg-site && tar -czf ~/backups/backup-$(date +\%Y\%m\%d).tar.gz data/ uploads/ && find ~/backups -name "backup-*.tar.gz" -mtime +14 -delete') | crontab -
```

Isso gera um backup por dia em `~/backups/` e apaga automaticamente os que têm
mais de 14 dias. Para conferir se a tarefa foi registrada: `crontab -l`.
Periodicamente, baixe alguns desses arquivos para fora da VM (SCP, Google Drive),
caso a VM seja perdida.

---

## Atualização 1.2.0 — Canal de Denúncias (25/08/2026)

Esta seção descreve **apenas** o que muda nesta atualização. O procedimento geral
de atualização está na **Parte 10**.

### O que vem nesta versão

- **Nova página `/canal-de-denuncias`** — canal público onde colaboradores,
  clientes, fornecedores e parceiros podem enviar um relato de forma anônima ou
  identificada. Já aparece no menu do topo do site como "Canal de denúncias".
- **Download do código de conduta** — o PDF já vem junto com o código, em
  `public/docs/codigo-de-conduta.pdf`. Não é preciso enviar nada pelo painel.
- **Página de erro personalizada** — endereços digitados errado agora mostram uma
  página do site, com o menu e um caminho de volta, em vez de uma tela em branco
  escrito "Não encontrado".
- **Correção nas páginas privadas (`/p/<link secreto>`)** — links que abrem em
  nova aba (`target="_blank"`) dentro dessas páginas estavam sendo bloqueados
  pelo navegador. Agora funcionam normalmente.

### Passo 1 — Backup (recomendado)

```bash
cd ~/tg-site
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/
```

### Passo 2 — Baixar o código novo

```bash
cd ~/tg-site
git pull
```

> Se você recebeu o projeto como **.zip** em vez de Git: descompacte a nova versão
> por cima da pasta do projeto, **sem apagar** as pastas `data/` e `uploads/` nem
> o arquivo `.env` — é onde ficam os seus dados e as suas senhas.

### Passo 3 — Adicionar a variável `DENUNCIA_TO` no `.env`

Este é o **único passo manual** desta atualização. O `git pull` nunca altera o seu
arquivo `.env`, então a nova linha precisa ser adicionada por você:

```bash
nano .env
```

Acrescente ao final do arquivo:

```
DENUNCIA_TO=denuncias@seudominio.com.br
```

Para salvar: `Ctrl+O`, Enter, depois `Ctrl+X`.

**Escolha bem esse endereço.** Ele é quem vai receber as denúncias, e os relatos
podem envolver funcionários da própria empresa — por isso o indicado é uma caixa
restrita (compliance, RH ou uma diretoria), e **não** o mesmo e-mail que recebe os
contatos comerciais do site.

- Não é preciso criar uma nova conta de e-mail nem uma nova Senha de App: o canal
  usa o mesmo `SMTP_USER` / `SMTP_PASS` que o formulário de contato já usa.
- Se você deixar essa linha de fora, o site continua funcionando, mas as denúncias
  vão para o endereço do `CONTACT_TO` (a caixa de contato geral).

### Passo 4 — Subir a nova versão

```bash
docker compose up --build -d
```

O comando pode demorar alguns minutos na primeira vez, porque o site é
reconstruído. O site fica fora do ar por poucos segundos no final.

### Passo 5 — Conferir se deu certo

1. Abra `https://seudominio.com.br/canal-de-denuncias` — a página deve carregar.
2. Confira se "Canal de denúncias" aparece no menu do topo.
3. Clique em **"Baixar o código de conduta"** — o PDF deve baixar.
4. Envie uma mensagem de teste pelo formulário e confirme que ela chegou no
   e-mail que você colocou em `DENUNCIA_TO`.
5. Se você usa **Páginas privadas**: abra uma delas e clique em um link que
   aponte para fora do site — deve abrir normalmente em uma nova aba.

Se algo não funcionar, veja os logs com `docker compose logs -f`.

### Perguntas frequentes

**Vou perder os cases, recomendações ou páginas privadas já cadastrados?**
Não. Esta atualização não altera a estrutura do banco de dados, e as pastas
`data/` e `uploads/` não são tocadas pelo `git pull`.

**Preciso mexer em DNS, domínio ou certificado?**
Não. Nada muda no Caddy nem no HTTPS.

**Preciso rodar algum comando de banco de dados?**
Não. Nenhuma migração é necessária nesta versão.

**Como troco o PDF do código de conduta depois?**
Substitua o arquivo `public/docs/codigo-de-conduta.pdf` (mantendo o mesmo nome) e
rode `docker compose up --build -d` de novo.

**As denúncias anônimas podem ser respondidas?**
Não. O sistema não guarda endereço de IP, dados do navegador nem e-mail de
resposta de quem envia — é isso que garante o anonimato. Se a pessoa não se
identificar no campo opcional, não há como responder nem rastrear.

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
3. `docker compose logs -f caddy` — há erro de domínio, DNS ou certificado?
4. O IP da VM mudou? Se você reservou um IP estático na **Parte 2.3**, isso não
   deve acontecer. Caso ainda esteja com IP efêmero, ele pode mudar quando a VM é
   parada e reiniciada — reserve um IP estático (VPC Network > Endereços IP
   externos > Reservar) e atualize os registros DNS do domínio.
