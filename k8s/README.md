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
| `40-app.yaml` | app Laravel (migra no boot) + Service |
| `50-workers.yaml` | queue + scheduler |
| `60-frontend.yaml` | SPA (nginx) + Service |
| `70-ingress.yaml` | Ingress Traefik same-origin (`/api`→app, `/`→frontend) |
| `80-backup-cronjob.yaml` | `pg_dump` diário → `/mnt/storage/backups/recipbot-k3s` |

## Pré-requisitos (uma vez, **não versionados**)

1. **Secret `recipbot-secrets`** — segredos da app. Nunca vai pro git; crie no cluster:
   ```sh
   kubectl -n recipbot-stg create secret generic recipbot-secrets \
     --from-literal=APP_KEY="base64:<php artisan key:generate --show>" \
     --from-literal=JWT_SECRET="<string forte>" \
     --from-literal=DB_PASSWORD="<senha do postgres>"
   ```
   (`app`/`queue`/`scheduler` carregam esse Secret via `envFrom`; o Postgres usa a
   chave `DB_PASSWORD`.)

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
