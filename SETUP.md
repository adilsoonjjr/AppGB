# 🍽️ SAS Restaurante — Cardápio Digital

Sistema completo de cardápio digital para restaurantes.
**Web** (Next.js) + **Mobile** (Expo React Native para Android e iOS) + **Backend** (Firebase).

---

## 📐 Arquitetura

```
sasrestaurante/
├── apps/
│   ├── web/          # Next.js 14 — Web + Painel Admin (PWA)
│   └── mobile/       # Expo — Android & iOS
├── scripts/
│   └── seed.mjs      # Populador de dados de exemplo
├── firestore.rules   # Regras de segurança Firestore
├── storage.rules     # Regras de segurança Storage
└── firebase.json     # Configuração Firebase
```

---

## 🔧 Pré-requisitos

- Node.js >= 18
- npm >= 9 (ou yarn/pnpm)
- Conta no [Firebase Console](https://console.firebase.google.com)
- Para mobile: Expo CLI (`npm install -g expo-cli`)
- Para build nativo: conta no [Expo EAS](https://expo.dev)

---

## 1️⃣ Configurar Firebase

### 1.1 Criar projeto

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: `sas-restaurante`) e clique em Criar
4. Na tela do projeto, clique em **"Web"** (ícone `</>`) para registrar o app
5. Copie o objeto `firebaseConfig`

### 1.2 Ativar serviços

No painel Firebase, ative:
- **Authentication** → E-mail/senha
- **Firestore Database** → Criar banco (modo produção)
- **Storage** → Ativar

### 1.3 Regras de segurança

No Firebase Console → Firestore → Regras, cole o conteúdo de `firestore.rules`.
No Firebase Console → Storage → Regras, cole o conteúdo de `storage.rules`.

### 1.4 Conta de serviço (Admin SDK)

Para o backend Next.js:
1. Firebase Console → Configurações do Projeto → Contas de Serviço
2. Clique em **"Gerar nova chave privada"** → baixa um JSON
3. Use os valores `project_id`, `client_email` e `private_key` no `.env.local`

---

## 2️⃣ Configurar Web (Next.js)

```bash
cd apps/web
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais Firebase:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK (conta de serviço)
FIREBASE_ADMIN_PROJECT_ID=seu-projeto
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Configurações do Restaurante
NEXT_PUBLIC_RESTAURANT_NAME="Meu Restaurante"
NEXT_PUBLIC_RESTAURANT_PHONE="5511999999999"   # Com código do país, sem +

# PIX (opcional)
NEXT_PUBLIC_PIX_KEY=sua.chave@pix.com        # ou CPF/CNPJ/telefone/chave aleatória
NEXT_PUBLIC_PIX_NAME="Meu Restaurante"
NEXT_PUBLIC_PIX_CITY="SAO PAULO"

# WhatsApp API (opcional — Twilio, 360Dialog, etc.)
WHATSAPP_API_URL=https://...
WHATSAPP_TOKEN=seu_token
```

### Instalar e rodar

```bash
cd apps/web
npm install
npm run dev
# Acesse http://localhost:3000
```

---

## 3️⃣ Popular banco com dados de exemplo

Na raiz do projeto:

```bash
npm install firebase   # se não tiver localmente
node scripts/seed.mjs
```

Isso cria:
- 5 categorias (Pizzas, Hambúrgueres, Massas, Sobremesas, Bebidas)
- 15 produtos com fotos (via Unsplash)
- Usuário admin: `admin@restaurante.com` / `admin123456`

> ⚠️ **Altere a senha do admin após o primeiro login!**

---

## 4️⃣ Configurar App Mobile (Expo)

```bash
cd apps/mobile
cp .env.example .env
```

Edite `.env` com as mesmas credenciais Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
EXPO_PUBLIC_RESTAURANT_NAME="Meu Restaurante"
```

### Rodar no Expo Go (desenvolvimento)

```bash
cd apps/mobile
npm install
npm start
# Escaneie o QR Code com o Expo Go (Android) ou câmera (iOS)
```

### Build para produção (APK / IPA)

```bash
# Instale o EAS CLI
npm install -g eas-cli
eas login

# Build Android (APK ou AAB)
cd apps/mobile
eas build --platform android

# Build iOS (requer conta Apple Developer)
eas build --platform ios
```

---

## 5️⃣ Deploy Web

### Vercel (recomendado — gratuito)

```bash
npm install -g vercel
cd apps/web
vercel
```

Adicione as variáveis de ambiente no painel da Vercel.

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

---

## 🗺️ Rotas do sistema

### Cliente (público)
| Rota | Descrição |
|------|-----------|
| `/menu` | Cardápio com categorias e busca |
| `/cart` | Carrinho de compras |
| `/checkout` | Finalizar pedido |
| `/order/[id]` | Rastreamento em tempo real |

### Admin (requer login)
| Rota | Descrição |
|------|-----------|
| `/admin/login` | Login do administrador |
| `/admin/dashboard` | Visão geral e estatísticas |
| `/admin/orders` | Gerenciamento de pedidos em tempo real |
| `/admin/products` | CRUD de produtos com upload de foto |
| `/admin/categories` | Gerenciamento de categorias |
| `/admin/reports` | Relatórios e gráficos de vendas |

---

## 📱 QR Code para mesa

Você pode gerar um QR Code apontando para:
```
https://seu-dominio.com/menu
```

Use qualquer gerador gratuito, como [qr-code-generator.com](https://qr-code-generator.com).

---

## 🔔 Integração WhatsApp

### Opção 1 — MVP (sem custo)
Quando um pedido é feito, o sistema gera um link do WhatsApp Web.
O admin abre e envia manualmente. **Já funciona sem configuração extra.**

### Opção 2 — API Oficial (paga)
Configure `WHATSAPP_API_URL` e `WHATSAPP_TOKEN` no `.env.local`:

| Serviço | Custo | Como obter |
|---------|-------|------------|
| [Twilio](https://twilio.com) | ~$0,005/msg | Trial gratuito disponível |
| [360Dialog](https://360dialog.com) | ~€49/mês | Parceiro oficial Meta |
| [WABA](https://business.whatsapp.com) | Direto Meta | Aprovação necessária |

---

## 💳 Integração PIX

O sistema gera o payload PIX automaticamente (padrão BR Code).
Configure `NEXT_PUBLIC_PIX_KEY` com sua chave PIX e o QR Code será exibido no checkout.

---

## 🎨 Personalização de cores

Para alterar a cor principal do sistema, edite `apps/web/src/app/globals.css`:

```css
:root {
  --primary-500: #ef4444;  /* Vermelho padrão → troque pela cor do seu restaurante */
  --primary-600: #dc2626;
  --primary-700: #b91c1c;
}
```

E `tailwind.config.ts` (linha `bg-red-*`) — faça um find & replace de `red` pelo nome da cor Tailwind desejada.

---

## 🛡️ Segurança em produção

1. **Altere a senha do admin** após o primeiro login
2. **Restrinja as regras do Firestore** — revise `firestore.rules`
3. **Configure domínios autorizados** no Firebase Auth → Settings → Authorized Domains
4. **Nunca exponha** a chave privada do Admin SDK no frontend
5. **Ative o App Check** do Firebase para proteção adicional

---

## 🐛 Problemas comuns

| Problema | Solução |
|----------|---------|
| `Firebase: Error (auth/invalid-api-key)` | Verifique `NEXT_PUBLIC_FIREBASE_API_KEY` no `.env.local` |
| Imagens não carregam | Adicione o domínio ao `next.config.js` → `images.domains` |
| Admin não redireciona | Confirme que o usuário foi criado no Firebase Auth |
| Regras Firestore bloqueando | Verifique se as regras em `firestore.rules` foram aplicadas |
| Build Expo falha | Verifique se o EAS está configurado com `eas build:configure` |

---

## 📞 Suporte

Dúvidas sobre Firebase: [firebase.google.com/docs](https://firebase.google.com/docs)
Dúvidas sobre Expo: [docs.expo.dev](https://docs.expo.dev)
