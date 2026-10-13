# Manifests K3s — recipbot (staging)

Ambiente de **staging** do recipbot no K3s (namespace `recipbot-stg`), paralelo e
isolado da produção em Docker Compose. As imagens vêm do GHCR
(`ghcr.io/pierre-mendes/recipbot-{backend,frontend,postgres}`) e são **atualizadas
automaticamente pelo CD** (job `deploy` em `.github/workflows/docker-publish.yml`,
que roda a cada push na `main`).

## Ordem dos arquivos

| Arquivo | O quê |
|---|---|
| `00-namespace.yaml` | namespace `recipbot-stg` |
| `10-config.yaml` | `ConfigMap` recipbot-config (env **não**-secreta) |
| `20-postgres.yaml` | Postgres (pgvector) StatefulSet + Service headless + PVC |
| `30-redis.yaml` | Redis (cache/fila, efêmero) + Service |
| `35-minio.yaml` | MinIO (fotos das receitas) StatefulSet + PVC + Service, e Job que cria o bucket |
| `40-app.yaml` | app Laravel (migra no boot) + Service |
| `50-workers.yaml` | queue + scheduler |
| `60-frontend.yaml` | SPA (nginx) + Service |
| `70-ingress.yaml` | Ingress Traefik same-origin (`/api`→app, `/recipbot/recipes`→MinIO, `/`→frontend) |
| `80-backup-cronjob.yaml` | `pg_dump` diário + espelho das fotos → `/mnt/storage/backups/recipbot-k3s` |

## Pré-requisitos (uma vez, **não versionados**)

1. **Secret `recipbot-secrets`** — segredos da app. Nunca vai pro git; crie no cluster:
   ```sh
   kubectl -n recipbot-stg create secret generic recipbot-secrets \
     --from-literal=APP_KEY="base64:<php artisan key:generate --show>" \
     --from-literal=JWT_SECRET="<string forte>" \
     --from-literal=DB_PASSWORD="<senha do postgres>" \
     --from-literal=AWS_ACCESS_KEY_ID="recipbot" \
     --from-literal=AWS_SECRET_ACCESS_KEY="<senha forte, 8+ caracteres>"
   ```
   (`app`/`queue`/`scheduler` carregam esse Secret via `envFrom`; o Postgres usa a
   chave `DB_PASSWORD` e o MinIO usa `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
   como usuário/senha root.)

   **Cluster que já tem o Secret** (antes das fotos): só acrescente as chaves do
   MinIO e reinicie a app para ela ler o env novo:
   ```sh
   kubectl -n recipbot-stg patch secret recipbot-secrets --type merge -p \
     '{"stringData":{"AWS_ACCESS_KEY_ID":"recipbot","AWS_SECRET_ACCESS_KEY":"<senha forte>"}}'
   kubectl apply -f k8s/
   kubectl -n recipbot-stg rollout restart deploy/recipbot-app deploy/recipbot-queue
   ```

2. **Pasta de backup no node** (hostPath do CronJob):
   ```sh
   sudo mkdir -p /mnt/storage/backups/recipbot-k3s
   ```

3. **RBAC do CD** — o CD (GitHub Actions) entra pela tailnet e faz `kubectl set image`
   com o ServiceAccount `ci-deployer` (Role: `patch`/`get` em deployments de
   `recipbot-stg`). Esse SA/Role/RoleBinding vive no cluster; se precisar recriar,
   adicione o manifesto aqui.

## Aplicar

Pré-requisitos feitos, aplique tudo na ordem (os prefixos numéricos garantem a
sequência no `apply` de pasta):

```sh
kubectl apply -f k8s/
```

Acesso (tailnet): **http://recipbot-stg.100.92.187.65.nip.io**
(e publicamente via Tailscale operator em `https://recipbot.tail3bbabf.ts.net`).

> Staging usa `imagePullPolicy: Always` com a tag `:latest` nas imagens de app/
> frontend; o CD, porém, faz `set image` pinando a tag `sha-<commit>` a cada deploy,
> o que torna cada rollout determinístico.

## Fotos das receitas (MinIO)

- O bucket `recipbot` é criado pelo Job `recipbot-minio-init` com leitura anônima
  só de objetos; upload/remoção exigem as credenciais (só a app tem).
- O browser carrega as fotos pelo próprio host do app (`/recipbot/recipes/...`,
  rota do Ingress) — por isso `AWS_URL` no ConfigMap é relativo (`/recipbot`) e
  funciona tanto pelo nip.io quanto pelo Tailscale.
- Console do MinIO (não exposto no Ingress):
  ```sh
  kubectl -n recipbot-stg port-forward svc/recipbot-minio 9001:9001
  # http://localhost:9001 — login com AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  ```
