# Guia de Instalação no IIS (Windows)

Este guia explica como configurar a aplicação Canary Breeding Control para funcionar num servidor Windows com IIS usando Reverse Proxy.

## Requisitos

- Windows Server 2016+ ou Windows 10/11
- IIS 10+
- Python 3.10+
- Node.js 18+
- MongoDB 6+

## Passo 1: Instalar Dependências

### 1.1 Instalar IIS com módulos necessários

Abra o PowerShell como Administrador e execute:

```powershell
# Instalar IIS
Install-WindowsFeature -Name Web-Server -IncludeManagementTools

# Instalar módulos necessários
Install-WindowsFeature -Name Web-WebSockets
Install-WindowsFeature -Name Web-Asp-Net45
```

### 1.2 Instalar URL Rewrite e Application Request Routing (ARR)

1. Descarregue e instale o **URL Rewrite Module**:
   - https://www.iis.net/downloads/microsoft/url-rewrite

2. Descarregue e instale o **Application Request Routing (ARR)**:
   - https://www.iis.net/downloads/microsoft/application-request-routing

### 1.3 Instalar Python

1. Descarregue Python 3.10+ de https://www.python.org/downloads/
2. Durante a instalação, marque "Add Python to PATH"
3. Verifique a instalação:
   ```cmd
   python --version
   pip --version
   ```

### 1.4 Instalar Node.js

1. Descarregue Node.js LTS de https://nodejs.org/
2. Verifique a instalação:
   ```cmd
   node --version
   npm --version
   ```

### 1.5 Instalar MongoDB

1. Descarregue MongoDB Community Server de https://www.mongodb.com/try/download/community
2. Instale como serviço do Windows
3. Verifique se está a funcionar:
   ```cmd
   mongosh
   ```

## Passo 2: Configurar a Aplicação

### 2.1 Clonar ou copiar os ficheiros

Copie a pasta da aplicação para:
```
C:\inetpub\canary-control\
```

### 2.2 Configurar o Backend

```cmd
cd C:\inetpub\canary-control\backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

Crie o ficheiro `C:\inetpub\canary-control\backend\.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=canary_control
```

### 2.3 Configurar o Frontend

```cmd
cd C:\inetpub\canary-control\frontend

# Instalar dependências
npm install

# Criar build de produção
npm run build
```

Crie o ficheiro `C:\inetpub\canary-control\frontend\.env`:

```env
REACT_APP_BACKEND_URL=http://localhost
```

## Passo 3: Configurar Serviços Windows

### 3.1 Criar serviço para o Backend (usando NSSM)

1. Descarregue NSSM de https://nssm.cc/download
2. Extraia para `C:\nssm\`
3. Execute no CMD como Administrador:

```cmd
C:\nssm\nssm.exe install CanaryBackend

# Configure:
# Path: C:\inetpub\canary-control\backend\venv\Scripts\python.exe
# Startup directory: C:\inetpub\canary-control\backend
# Arguments: -m uvicorn server:app --host 127.0.0.1 --port 8001
```

4. Inicie o serviço:
```cmd
net start CanaryBackend
```

### 3.2 Verificar que o backend funciona

```cmd
curl http://127.0.0.1:8001/api/health
```

## Passo 4: Configurar IIS

### 4.1 Ativar ARR Proxy

1. Abra o **IIS Manager**
2. Clique no nome do servidor (nó raiz)
3. Duplo clique em **Application Request Routing Cache**
4. Clique em **Server Proxy Settings...**
5. Marque **Enable proxy**
6. Clique **Apply**

### 4.2 Criar Website

1. No IIS Manager, clique direito em **Sites** > **Add Website**
2. Configure:
   - **Site name**: CanaryControl
   - **Physical path**: `C:\inetpub\canary-control\frontend\build`
   - **Binding**: 
     - Type: http
     - Port: 80
     - Host name: (deixe vazio ou coloque o seu domínio)

### 4.3 Configurar URL Rewrite (web.config)

Crie o ficheiro `C:\inetpub\canary-control\frontend\build\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Redirecionar API para backend -->
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8001/api/{R:1}" />
        </rule>
        
        <!-- React Router - SPA fallback -->
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    
    <!-- Configurar tipos MIME -->
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".woff" />
      <mimeMap fileExtension=".woff" mimeType="font/woff" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
    </staticContent>
    
    <!-- Headers de segurança -->
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### 4.4 Configurar Permissões

```cmd
# Dar permissões ao IIS
icacls "C:\inetpub\canary-control" /grant "IIS_IUSRS:(OI)(CI)RX"
icacls "C:\inetpub\canary-control" /grant "IUSR:(OI)(CI)RX"
```

## Passo 5: Testar a Instalação

1. Abra o browser e aceda a: `http://localhost`
2. Verifique se a aplicação carrega
3. Teste uma chamada API: `http://localhost/api/health`

## Resolução de Problemas

### Erro 500 - Internal Server Error

1. Verifique os logs do IIS:
   - `C:\inetpub\logs\LogFiles\`

2. Verifique se o backend está a funcionar:
   ```cmd
   curl http://127.0.0.1:8001/api/health
   ```

3. Verifique os logs do serviço:
   ```cmd
   eventvwr.msc
   ```

### Erro 502 - Bad Gateway

1. O backend não está a responder
2. Verifique se o serviço CanaryBackend está a correr:
   ```cmd
   sc query CanaryBackend
   ```

3. Reinicie o serviço:
   ```cmd
   net stop CanaryBackend
   net start CanaryBackend
   ```

### WebSocket não funciona

1. Verifique se o módulo WebSocket está instalado:
   ```powershell
   Get-WindowsFeature Web-WebSockets
   ```

2. Instale se necessário:
   ```powershell
   Install-WindowsFeature Web-WebSockets
   ```

### MongoDB não conecta

1. Verifique se o serviço está a correr:
   ```cmd
   sc query MongoDB
   ```

2. Verifique a string de conexão no `.env` do backend

## Atualizar a Aplicação

Para atualizar a aplicação:

1. Pare o serviço backend:
   ```cmd
   net stop CanaryBackend
   ```

2. Copie os novos ficheiros

3. Atualize as dependências:
   ```cmd
   cd C:\inetpub\canary-control\backend
   venv\Scripts\activate
   pip install -r requirements.txt

   cd C:\inetpub\canary-control\frontend
   npm install
   npm run build
   ```

4. Reinicie:
   ```cmd
   net start CanaryBackend
   iisreset
   ```

## Configuração HTTPS (Opcional)

Para configurar HTTPS:

1. Obtenha um certificado SSL (Let's Encrypt ou comercial)
2. No IIS Manager:
   - Clique em **Server Certificates**
   - Importe o certificado
3. No Website:
   - Adicione um binding HTTPS na porta 443
   - Selecione o certificado

4. Atualize o `REACT_APP_BACKEND_URL` no frontend para usar HTTPS:
   ```env
   REACT_APP_BACKEND_URL=https://seu-dominio.com
   ```

## Suporte

Para questões ou problemas, consulte a documentação do projeto ou abra uma issue no repositório.
