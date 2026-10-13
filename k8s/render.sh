#!/bin/sh
# Renderiza os manifests de k8s/ prontos pro `kubectl apply`, com:
#   - imagens do backend/frontend pinadas em sha-<commit> (em vez de :latest),
#     então o apply já faz o rollout certo e não "volta" a imagem pro :latest;
#   - anotação recipbot/config-hash nos pods que leem o ConfigMap, então
#     mudar 10-config.yaml reinicia app/queue/scheduler sozinho.
# 00-namespace.yaml fica de fora (é recurso de cluster; criado uma vez à mão).
#
# Uso: k8s/render.sh <commit-sha> <pasta-de-saida>
#   ex.: k8s/render.sh "$(git rev-parse HEAD)" /tmp/recipbot-k8s
#        kubectl apply -f /tmp/recipbot-k8s
set -eu

sha="${1:?uso: render.sh <commit-sha> <pasta-de-saida>}"
out="${2:?uso: render.sh <commit-sha> <pasta-de-saida>}"
src="$(cd "$(dirname "$0")" && pwd)"

config_hash="$(sha256sum "$src/10-config.yaml" | cut -c1-16)"

rm -rf "$out"
mkdir -p "$out"

for file in "$src"/[0-9]*.yaml; do
  name="$(basename "$file")"
  [ "$name" = "00-namespace.yaml" ] && continue
  sed \
    -e "s#\(ghcr.io/pierre-mendes/recipbot-backend\):latest#\1:sha-${sha}#" \
    -e "s#\(ghcr.io/pierre-mendes/recipbot-frontend\):latest#\1:sha-${sha}#" \
    -e "s#^      labels: { app: recipbot-\(app\|queue\|scheduler\) }\$#&\n      annotations: { recipbot/config-hash: \"${config_hash}\" }#" \
    "$file" > "$out/$name"
done

# Garante que a substituição aconteceu: sem isso um apply rolaria :latest.
if grep -q 'recipbot-\(backend\|frontend\):latest' "$out"/*.yaml; then
  echo "render.sh: ainda há imagem :latest nos manifests renderizados" >&2
  exit 1
fi
