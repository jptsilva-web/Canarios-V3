# 🚀 Deploy OrniTuga no Railway

## Pré-requisitos
1. Conta no [Railway](https://railway.app) (podes usar GitHub para login)
2. Conta no [MongoDB Atlas](https://cloud.mongodb.com) (grátis)
3. Conta no [Vercel](https://vercel.com) (grátis) - para o frontend

---

## 📊 Passo 1: Criar Base de Dados no MongoDB Atlas

1. Vai a [MongoDB Atlas](https://cloud.mongodb.com) e cria uma conta grátis
2. Clica em **"Build a Database"** → escolhe **"FREE" (M0)**
3. Escolhe a região mais próxima (ex: `eu-west-1` para Europa)
4. Clica em **"Create"**

### Configurar Acesso:
1. Em **"Database Access"** → **"Add New Database User"**
   - Username: `ornituga`
   - Password: (gera uma password segura e guarda-a!)
   - Role: `Read and write to any database`
   
2. Em **"Network Access"** → **"Add IP Address"**
   - Clica em **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Isto é necessário para o Railway se conectar

### Obter Connection String:
1. Vai a **"Database"** → **"Connect"**
2. Escolhe **"Connect your application"**
3. Copia a connection string, será algo como:
   ```
   mongodb+srv://ornituga:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Substitui `<password>` pela password que criaste

---

## 🔧 Passo 2: Deploy do Backend no Railway

1. Vai a [Railway](https://railway.app) e faz login com GitHub

2. Clica em **"New Project"** → **"Deploy from GitHub repo"**

3. Seleciona o repositório do OrniTuga

4. Railway vai detectar automaticamente o projeto Python

5. **Configurar Variáveis de Ambiente:**
   - Vai a **Settings** → **Variables**
   - Adiciona as seguintes variáveis:

   | Variable | Value |
   |----------|-------|
   | `MONGO_URL` | `mongodb+srv://ornituga:TUA_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
   | `DB_NAME` | `ornituga` |
   | `SECRET_KEY` | (gera com: `openssl rand -hex 32`) |
   | `CORS_ORIGINS` | `*` (depois atualiza com o URL do Vercel) |
   | `SMTP_EMAIL` | `teu-email@gmail.com` |
   | `SMTP_PASSWORD` | `tua-app-password-gmail` |

6. Clica em **"Deploy"**

7. Após o deploy, vai a **Settings** → **Networking** → **Generate Domain**
   - Copia o URL (ex: `https://ornituga-production.up.railway.app`)

---

## 🎨 Passo 3: Deploy do Frontend no Vercel

1. Vai a [Vercel](https://vercel.com) e faz login com GitHub

2. Clica em **"Add New..."** → **"Project"**

3. Importa o mesmo repositório GitHub

4. **Configurações do Projeto:**
   - **Framework Preset:** `Create React App`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` ou `yarn build`
   - **Output Directory:** `build`

5. **Environment Variables:**
   - Clica em **"Environment Variables"**
   - Adiciona:
   
   | Name | Value |
   |------|-------|
   | `REACT_APP_BACKEND_URL` | `https://ornituga-production.up.railway.app` (o URL do Railway) |

6. Clica em **"Deploy"**

7. Após o deploy, copia o URL do Vercel (ex: `https://ornituga.vercel.app`)

---

## 🔄 Passo 4: Atualizar CORS no Railway

1. Volta ao Railway
2. Vai a **Variables**
3. Atualiza `CORS_ORIGINS` com o URL do Vercel:
   ```
   https://ornituga.vercel.app
   ```
4. O Railway vai fazer redeploy automaticamente

---

## ✅ Passo 5: Testar

1. Abre o URL do Vercel no browser
2. Cria uma conta nova
3. Testa as funcionalidades:
   - Criar temporada
   - Adicionar zonas
   - Adicionar pássaros
   - Criar pares

---

## 🔐 Configurar Gmail para Emails

Para enviar emails (recuperação de password, relatórios):

1. Vai a [Google Account Security](https://myaccount.google.com/security)
2. Ativa **"2-Step Verification"** se não tiver
3. Vai a **"App passwords"**
4. Cria uma nova app password para "Mail"
5. Usa essa password (16 caracteres) no `SMTP_PASSWORD`

---

## 🐛 Troubleshooting

### "Application error" no Railway
- Verifica os logs em Railway → **Deployments** → **View Logs**
- Confirma que todas as variáveis de ambiente estão corretas

### "Failed to connect to database"
- Verifica se a connection string do MongoDB está correta
- Confirma que adicionaste 0.0.0.0/0 no Network Access do Atlas

### CORS errors no frontend
- Confirma que `CORS_ORIGINS` no Railway tem o URL correto do Vercel

---

## 📱 URLs Finais

Após o deploy, terás:
- **Frontend:** `https://ornituga.vercel.app` (ou o URL que o Vercel te der)
- **Backend API:** `https://ornituga-production.up.railway.app/api`
- **Health Check:** `https://ornituga-production.up.railway.app/api/health`

---

## 💰 Custos Estimados

| Serviço | Custo |
|---------|-------|
| MongoDB Atlas (M0) | **Grátis** (512MB) |
| Railway (Hobby) | **~$5/mês** |
| Vercel (Hobby) | **Grátis** |

**Total: ~$5/mês**

---

Boa sorte com o deploy! 🐤
