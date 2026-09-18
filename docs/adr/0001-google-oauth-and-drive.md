# ADR 0001 — Autenticação com Google (OAuth) e integração com Google Drive

- **Status:** Proposto (aguardando aprovação — nenhum código de produção escrito)
- **Data:** 2026-09-18
- **Decisores:** Pierre Mendes
- **Contexto do MVP:** custo $0, stack Laravel 11 (API) + Vue 3 (SPA) + PostgreSQL 16
- **Escopo deste ADR:** desenho técnico de **login social com Google (Fase 1)** e da **integração com Google Drive (Fase 2)**. É um documento de decisão; a implementação é subsequente e depende da aprovação deste ADR.

---

## 1. Contexto

A autenticação atual do RecipBot é baseada em **JWT** (`php-open-source-saver/jwt-auth`), com o guard `auth:api`:

- `POST /api/auth/register` cria o usuário (não faz login).
- `POST /api/auth/login` valida credenciais e emite um `access_token` Bearer via `AuthController::respondWithToken()`.
- Todas as rotas protegidas usam o middleware `auth:api`; o front (SPA Vue, porta 5173) guarda o JWT e o envia como `Authorization: Bearer`.

Queremos: (1) permitir **login com conta Google**; (2) preparar terreno para **integrações com o Google Drive** (ex.: exportar/backup de receitas).

Princípio norteador: **o Google prova a identidade; o backend continua sendo a única fonte do token de sessão (o mesmo JWT já usado)**. Assim, nada muda para o resto da aplicação (middleware, `/auth/me`, receitas).

---

## 2. Decisão (resumo)

1. Usar **`laravel/socialite`** em modo **`stateless`** (API/SPA sem sessão de servidor).
2. Após o callback do Google, o backend **emite um JWT próprio** (guard `api`) — nunca repassa o token do Google ao front como token de sessão.
3. **Separar identidade de acesso a dados**:
   - **Fase 1 (login):** escopos mínimos `openid email profile`. Sem refresh token, sem armazenar tokens do Google.
   - **Fase 2 (Drive):** **autorização incremental** — só pedir o escopo `drive.file` quando o usuário acionar uma feature de Drive; aí sim armazenar `refresh_token` criptografado.
4. **Evitar o escopo `drive` completo** (é "restrito" e exige auditoria de segurança paga anual — incompatível com o objetivo $0). Usar **`drive.file`** (por-arquivo, sem auditoria).
5. `laravel/socialite` (e, na Fase 2, `google/apiclient`) são **novas dependências** e precisam de aprovação explícita — conforme `CLAUDE.md` ("Do not change the application's dependencies without approval").

---

## 3. Fase 1 — Login com Google

### 3.1 Fluxo end-to-end

```
Usuário            SPA (Vue :5173)         Backend (:8000)              Google
  │  clica "Entrar com Google"                    │                        │
  │──────────────►│ navega p/ GET /auth/google/redirect ─────────────────►│
  │               │                               │ monta URL + state      │
  │               │        302 p/ accounts.google.com ──────────────────────►│
  │◄──────────────────────── consentimento do Google ──────────────────────│
  │  autoriza                                       │                       │
  │◄──────── 302 p/ /api/auth/google/callback?code=&state= ─────────────────│
  │               │                                 │ troca code -> perfil  │
  │               │                                 │──────────────────────►│
  │               │                                 │◄── dados do usuário ──│
  │               │                                 │ acha/cria user + JWT  │
  │◄──── 302 p/ SPA /auth/callback#token=SEU_JWT ──│                        │
  │               │ store.login(token) -> /recipes                          │
```

### 3.2 Endpoints (novos, em `routes/api.php`, **sem** `auth:api`)

```
GET /api/auth/google/redirect   -> 302 para a tela de consentimento do Google
GET /api/auth/google/callback   -> troca o code, cria/vincula usuário, emite JWT,
                                   redireciona para FRONTEND_URL/auth/callback#token=...
```

- `redirect` e `callback` devem ter **throttle** (ex.: `throttle:10,1`) para evitar abuso.
- O `callback` devolve o JWT ao SPA no **fragment da URL** (`#token=...`), que **não** vai para logs de servidor nem para o header `Referer`.

### 3.3 Modelo de dados (migration nova em `users`)

| Coluna | Tipo | Observação |
|---|---|---|
| `provider` | string, nullable | ex.: `"google"` |
| `provider_id` | string, nullable, **indexado** | o `sub` do Google (id estável) |
| `avatar_url` | string, nullable | opcional |
| `password` | **passa a nullable** | conta criada só via Google não tem senha |

Ajustes decorrentes:
- Login por senha deve tratar usuário **sem senha** (retornar credenciais inválidas de forma genérica).
- `updatePassword` deve permitir que um usuário Google **defina** uma senha via o fluxo de recuperação de senha (integra com o módulo de reset — ver ADR/feature correspondente).

### 3.4 Resolução da conta no callback

Ordem de resolução:
1. Buscar por (`provider`, `provider_id`) → se achar, **é o usuário**.
2. Senão, buscar por `email`:
   - Se **existe** e o Google retornou `email_verified = true` → **vincular** (setar `provider`/`provider_id`).
   - Se existe mas `email_verified = false` → **recusar** (evita account takeover).
3. Senão, **criar** novo usuário (sem senha), já vinculado ao provider.

Emitir o token: `Auth::guard('api')->login($user)` → JWT no mesmo formato do login por senha.

### 3.5 Segurança (Fase 1)

- **`state` obrigatório** e validado no callback (anti-CSRF). PKCE se houver fluxo iniciado no cliente.
- **Whitelist de redirect URIs** no Google Cloud e via env; nunca redirecionar para URL vinda do request.
- **Vincular por e-mail só com `email_verified = true`.**
- **JWT com TTL curto** (o app já usa ~1h); token trafega no fragment, nunca em querystring persistida.
- Nunca logar `code`, tokens do Google ou `client_secret`.

### 3.6 Configuração / env

`config/services.php`:
```php
'google' => [
    'client_id'     => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect'      => env('GOOGLE_REDIRECT_URI'),
],
```
`.env.example` recebe `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `FRONTEND_URL` como **placeholders** (segredos reais só em `.env` local/produção). No Google Cloud Console: criar um **OAuth 2.0 Client ID** (tipo Web), configurar a tela de consentimento e cadastrar as redirect URIs de dev (`http://localhost:8000/api/auth/google/callback`) e de produção.

### 3.7 Frontend (Vue 3)

- Botão **"Entrar com Google"** no `LoginPage.vue` → navegação de página inteira para `/api/auth/google/redirect` (o browser precisa seguir os 302; não usar `fetch`).
- Rota nova `/auth/callback`: lê o JWT do fragment, chama `store.login(token)` (o mesmo já existente) e navega para `/recipes`.
- Nenhuma outra mudança: chamadas autenticadas continuam usando o Bearer do store.

---

## 4. Fase 2 — Integração com Google Drive

> **Login ≠ acesso a dados.** Os escopos de identidade da Fase 1 **não** dão acesso ao Drive. A Fase 2 adiciona escopo, refresh token e armazenamento de tokens.

### 4.1 Escopo: `drive.file` (e por que não `drive`)

| Escopo | Acesso | Verificação Google | Veredito |
|---|---|---|---|
| `drive.file` | Só arquivos que o app criou ou que o usuário abriu com ele | Básica (marca/branding) | ✅ **Escolhido** — cobre exportar/backup, mantém $0 |
| `drive` (completo) | Todo o Drive do usuário | **Restrito → auditoria de segurança paga anual** | ❌ Rejeitado (fere o $0) |

Enquanto o app não for verificado, opera em **modo de teste** (até 100 usuários de teste) — suficiente para desenvolvimento.

### 4.2 Autorização incremental

Não pedir Drive no login. Quando o usuário aciona, p.ex., **"Exportar para o Drive"**, dispara-se um **segundo fluxo OAuth** pedindo `drive.file` com:

- `access_type=offline` → obtém **refresh token**;
- `prompt=consent` → garante o refresh token mesmo em re-consentimento.

No Socialite:
```php
Socialite::driver('google')->stateless()
    ->scopes(['https://www.googleapis.com/auth/drive.file'])
    ->with(['access_type' => 'offline', 'prompt' => 'consent'])
    ->redirect();
```

Endpoints sugeridos (protegidos por `auth:api`, pois o usuário já está logado):
```
GET  /api/integrations/google/drive/connect   -> inicia consentimento do Drive
GET  /api/integrations/google/drive/callback  -> guarda tokens, volta ao SPA
POST /api/recipes/{recipe}/export/drive       -> exporta a receita (PDF/XLSX) ao Drive
DELETE /api/integrations/google/drive          -> desconecta (revoga + apaga tokens)
```

### 4.3 Armazenamento de tokens (tabela nova)

`google_credentials` (1:1 com user), com casts `encrypted`:

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | FK | único |
| `access_token` | text, **encrypted** | curta duração |
| `refresh_token` | text, **encrypted**, nullable | longa duração (só chega com `access_type=offline`) |
| `expires_at` | timestamp | quando renovar |
| `scopes` | jsonb | escopos concedidos |

Regras:
- **Renovar** o access token quando expirado usando o refresh token (um `GoogleDriveService` encapsula isso).
- Tratar **refresh token revogado** (usuário removeu o acesso na conta Google) → limpar credenciais e pedir reconsentimento.
- Ao desconectar, **revogar** o token no Google e apagar a linha.

### 4.4 Casos de uso no RecipBot (todos com `drive.file`)

- **Exportar receita** (PDF/XLSX já existentes) para o Drive do usuário.
- **Backup** das receitas em um arquivo/pasta que o app cria.
- **Importar** de um documento escolhido pelo usuário via **Google Picker** (o Picker autoriza o arquivo específico, compatível com `drive.file`).

Custo de API: o Drive API é gratuito dentro de quotas — mantém o $0.

### 4.5 Segurança (Fase 2)

- Tokens **sempre criptografados** em repouso (cast `encrypted`; depende do `APP_KEY`).
- Escopo **mínimo** (`drive.file`), nunca `drive`.
- Endpoints de Drive **exigem `auth:api`** + throttle.
- Isolar chamadas ao Google num `GoogleDriveService` (facilita mock em testes e troca de client).

---

## 5. Estratégia de testes (Pest — sem bater no Google real)

**Fase 1:**
- Mock do Socialite (`Socialite::shouldReceive('driver->stateless->user')->andReturn($fakeUser)`).
- Cobrir: cria usuário novo; encontra por `provider_id`; vincula por e-mail verificado; **recusa** e-mail não verificado; emite JWT válido; login por senha falha para conta sem senha.

**Fase 2:**
- Mock do `GoogleDriveService`/client HTTP; cobrir: guarda tokens após consentimento; renova access token expirado; trata refresh revogado; exporta receita chama o client com o arquivo certo; desconectar revoga e apaga credenciais.

Manter **PHPStan level 8**, **Pint** e cobertura **≥ 80%**. Atualizar `docs/openapi.yaml` com os novos endpoints.

---

## 6. Consequências

**Positivas**
- Login mais rápido e conversão maior; base OAuth reaproveitada para o Drive.
- Integração de Drive dentro do $0 usando `drive.file` + modo de teste.
- Nenhuma mudança no restante do app (o JWT continua sendo a sessão).

**Negativas / custos**
- Novas dependências (`laravel/socialite`; Fase 2: `google/apiclient` ou chamadas HTTP diretas) — exigem aprovação.
- `password` nullable e a lógica de account linking aumentam a superfície de segurança do auth.
- Fase 2 adiciona gestão de tokens (criptografia, renovação, revogação) e a burocracia da tela de consentimento/verificação de marca do Google.

---

## 7. Alternativas consideradas

- **Validar o `id_token` do Google direto (sem Socialite):** menos dependências, mais código manual de verificação de assinatura/claims. Rejeitado por ergonomia e risco de erro.
- **Pedir `drive` completo no login:** simplifica o produto mas cai em escopo restrito com auditoria paga. Rejeitado (fere o $0).
- **Pedir Drive já no login (não incremental):** pior UX e desconfiança do usuário. Rejeitado.

---

## 8. Perguntas em aberto (decidir antes de implementar)

1. Account linking automático por e-mail verificado, ou exigir login por senha antes de vincular?
2. Entrega do JWT ao SPA: fragment (`#token=`) — confirmado — ou endpoint de troca de código de uso único (mais seguro, mais complexo)?
3. Fase 2 entra agora ou fica para depois do login estar em produção?
4. Import via Google Picker precisa de client-side extra (API key + biblioteca do Picker) — vale para o MVP?

---

## 9. Checklist de implementação (quando aprovado)

**Fase 1 — Login**
- [ ] Aprovar dependência `laravel/socialite`.
- [ ] Migration: `provider`, `provider_id` (indexado), `avatar_url`, `password` nullable.
- [ ] `config/services.php` + `.env.example` (placeholders) + `FRONTEND_URL`.
- [ ] `GoogleAuthController` (`redirect`, `callback`) + rotas com throttle.
- [ ] Resolução de conta (buscar/vincular/criar) + emissão de JWT.
- [ ] Front: botão + rota `/auth/callback`.
- [ ] Testes Pest (mock Socialite) + Vitest; atualizar `openapi.yaml`.
- [ ] Pint + PHPStan level 8 + cobertura ≥ 80%.

**Fase 2 — Drive**
- [ ] Aprovar dependência do client Google.
- [ ] Tabela `google_credentials` com casts `encrypted`.
- [ ] `GoogleDriveService` (consentimento incremental, refresh, revogação).
- [ ] Endpoints connect/callback/export/disconnect com `auth:api` + throttle.
- [ ] Export de receita (PDF/XLSX) para o Drive.
- [ ] Testes Pest (client mockado) + Vitest; atualizar `openapi.yaml`.
- [ ] Pint + PHPStan level 8 + cobertura ≥ 80%.
