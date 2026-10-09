# 🎨 RecipBot Design System — "Feira" v2.0

Identidade visual do RecipBot: cores de ingrediente, tipografia com personalidade e um mascote, o **Bit**, robozinho chef.

- **Canvas de design (fonte visual):** https://claude.ai/artifact/RNQDiPhKoaDedFG2uRD7RM — marca, cores, tipografia, componentes e telas (desktop, mobile e modo escuro).
- **Fonte de verdade no código:** `frontend/src/style.css` (tokens) + `frontend/src/components/ui/*` e `frontend/src/components/brand/*`.

---

## 1. Princípios

| # | Princípio | Na prática |
|---|-----------|------------|
| 01 | **A receita é a protagonista** | Sem gradientes, sem glassmorphism, sem translate/scale em hover. Título, ingredientes e passos em primeiro plano. |
| 02 | **Legível com a mão suja** | Corpo ≥ 16px, alvos de toque ≥ 44px, contraste WCAG AA em claro e escuro. |
| 03 | **Uma cor, um papel** | Verde age, páprica destaca, açafrão avisa, vermelho destrói. Cor nunca é decoração. |
| 04 | **Tokens antes de classes** | Componentes usam só tokens semânticos (`bg-primary`, `text-muted-foreground`). Hex solto em componente é bug. |

---

## 2. Marca

### Logo

A logo é a cabeça do Bit (chapéu de chef + visor com olhos de manjericão) num quadrado verde de cantos arredondados.

| Uso | Onde |
|-----|------|
| Componente Vue | `components/brand/BrandMark.vue` — `<BrandMark :size="36" />` |
| Favicon | `frontend/public/favicon.svg` |
| Lockup | Marca + "RecipBot" em Bricolage Grotesque 800, `tracking-tight` |

Regras:
- O fundo da marca segue o token `primary` (verde no claro, verde-claro no escuro). Rosto e visor têm cores fixas.
- **Abaixo de 24px** as orelhas saem automaticamente (`BrandMark` faz isso).
- Área de respiro mínima: ¼ do lado da marca.
- Não recolorir, não aplicar sombra, não distorcer.
- Decorativa por padrão (`aria-hidden`); passe `label` quando estiver sozinha, sem texto ao lado.

### Mascote: Bit

Robozinho chef com visor escuro, olhos de manjericão, chapéu branco, avental verde e lenço de páprica.
Componente: `components/brand/BitMascot.vue`.

| Pose (`pose`) | Quando usar | Onde já está |
|---------------|-------------|--------------|
| `hello` | Boas-vindas, login, cadastro, primeira receita | `LoginPage`, lista vazia |
| `cooking` | Carregando, importando link/PDF | — (disponível) |
| `thinking` | Busca sem resultado, filtro por tag vazio | `RecipesListPage` |
| `oops` | Erros, 404, receita não encontrada | `NotFoundPage`, `RecipeDetailPage` |

```vue
<BitMascot pose="thinking" :size="112" />
<!-- Se o mascote transmite informação sozinho, sem texto ao lado: -->
<BitMascot pose="oops" :decorative="false" />
```

Regras: no máximo **um Bit por tela**, sempre acompanhado de texto que explica a situação. Tamanhos usuais: 112–140px. As cores da ilustração são fixas, a única exceção à regra "só tokens".

---

## 3. Cores

### Escalas (matéria-prima — não usar direto em componentes)

| Passo | Manjericão (primary) | Páprica (highlight) | Açafrão (warning) | Farinha (neutral) |
|------:|------|------|------|------|
| 50  | `#F1F7F0` | `#FDF3EE` | `#FEF9EC` | `#FBFAF7` |
| 100 | `#E3EFE2` | `#FBE4D9` | `#FBF0D2` | `#F4F2EC` |
| 200 | `#C3DEC2` | `#F6C6AF` | `#F7DFA0` | `#E7E3D9` |
| 300 | `#9CC79E` | `#F2A27F` | `#F1CB6C` | `#D3CDBF` |
| 400 | `#7DBB84` | `#F08A5D` | `#E8B23A` | `#A9A291` |
| 500 | `#4E8F59` | `#DE6635` | `#C9931E` | `#7A7466` |
| 600 | `#2F6B3B` | `#C2461E` | `#9E7012` | `#5B5649` |
| 700 | `#234F2C` | `#8A3414` | `#6B4A0A` | `#423E35` |
| 800 | `#1A3B21` | `#64250E` | `#4A3307` | `#2A2823` |
| 900 | `#112717` | `#401709` | `#2E2004` | `#1C1B19` |

### Tokens semânticos (usar estes)

Definidos como triplas HSL em `style.css` (`:root` e `.dark`) e expostos ao Tailwind via `@theme` (`bg-*`, `text-*`, `border-*`).

| Token | Uso | Claro | Escuro |
|-------|-----|-------|--------|
| `background` | Fundo da página | `#FBFAF7` | `#161714` |
| `foreground` | Texto principal | `#1C1B19` | `#EDEBE4` |
| `card` / `popover` | Superfícies elevadas | `#FFFFFF` | `#1F211D` |
| `muted` | Fundos sutis, chips de tag | `#F4F2EC` | `#2A2823` |
| `muted-foreground` | Texto secundário | `#5B5649` | `#A9A291` |
| `border` | Divisórias | `#E7E3D9` | `#2A2823` |
| `input` | Borda de campos | `#D3CDBF` | `#33312B` |
| `primary` | Botão principal, links, foco | `#2F6B3B` | `#7DBB84` |
| `primary-foreground` | Texto sobre primary | `#FFFFFF` | `#161714` |
| `secondary` | Botão secundário, item ativo | `#E3EFE2` | `#1A3B21` |
| `secondary-foreground` | Texto sobre secondary | `#234F2C` | `#C3DEC2` |
| `accent` | Hover e item ativo sutil (convenção shadcn) | `#F4F2EC` | `#2A2823` |
| `highlight` | Destaque, favoritos | `#C2461E` | `#F08A5D` |
| `warning` | Avisos, rascunhos | `#E8B23A` | `#E8B23A` |
| `destructive` | Excluir, erros | `#B42318` | `#EF6B5E` |
| `ring` | Anel de foco | `#2F6B3B` | `#7DBB84` |

**Tons de receita** (bloco de cor dos cards, escolhido pelo título via `recipeTone()` em `utils/format.ts`):
`tone-basil`, `tone-paprika`, `tone-saffron`, `tone-flour` — cada um com seu `-foreground`. Todos os pares passam AA nos dois temas.

### Contraste verificado (WCAG 2.1)

| Par | Razão |
|-----|------:|
| branco sobre `primary` claro | 6.39 : 1 |
| branco sobre `highlight` claro | 5.01 : 1 |
| `foreground` sobre `warning` | 8.90 : 1 |
| branco sobre `destructive` claro | 6.57 : 1 |
| `muted-foreground` sobre `background` (claro) | 7.00 : 1 |
| `muted-foreground` sobre `background` (escuro) | 7.08 : 1 |
| `primary-foreground` sobre `primary` (escuro) | 7.98 : 1 |
| tons de receita (fg sobre bg) | 6.66 – 11.49 : 1 |

> `#7A7466` (farinha-500) dá 4.45:1 — só para placeholders e estados desabilitados, nunca para texto que precisa ser lido.

---

## 4. Tipografia

Carregada via Google Fonts em `frontend/index.html`.

| Família | Papel | Classe Tailwind |
|---------|-------|-----------------|
| **Bricolage Grotesque** (600–800) | Display e títulos | `font-display` (aplicada automaticamente em `h1`–`h3`) |
| **Instrument Sans** (400–700) | Interface e corpo | `font-sans` (padrão do `body`) |
| **JetBrains Mono** (400–500) | Quantidades, tempos, metadados técnicos | `font-mono` |

| Token | Tamanho / linha · peso | Exemplo |
|-------|------------------------|---------|
| display | 48 / 52 · 800 | Título da receita no detalhe |
| h1 | 36 / 40 · 700 | "Minhas receitas" |
| h2 | 24 / 32 · 700 | "Modo de preparo" |
| h3 | 18 / 26 · 600 | Subtítulos de seção |
| body-lg | 18 / 28 · 400 | Passos do preparo |
| body | 16 / 24 · 400 | Texto geral (mínimo para leitura) |
| small | 14 / 20 · 500 | Metadados, legendas |
| mono | 14 / 20 · 500 | `2 xíc. · 180 °C` |

Títulos: `letter-spacing` −0.02em (h1: −0.03em).

---

## 5. Espaço, forma e elevação

- **Espaçamento:** base 4px — `1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48, `16`=64.
- **Raios:** `rounded-sm` 6px · `rounded-md` 10px (botões, inputs) · `rounded-lg` 16px (cards) · `rounded-xl` 20px (diálogos, hero) · `rounded-full` (chips, busca).
- **Elevação:** padrão é *flat com borda*. `shadow-sm` para hover de card em lista, `shadow-md` para hover de card em grade, `shadow-lg` para toasts, menus e diálogos.
- **Container:** `max-w-6xl` (1152px) com `px-4 sm:px-6`.

## 6. Movimento e ícones

- 150ms para hover/foco, 200ms para entrada/saída, `ease-out`.
- Cards: no hover mudam **só borda e sombra**, sem `translate` ou `scale`.
- Ícones: **Lucide** (`lucide-vue-next`), tamanhos 16 / 20 / 24. Botão só com ícone exige `aria-label` ou `title`.

---

## 7. Componentes

| Componente | Arquivo | Notas |
|------------|---------|-------|
| Button | `ui/Button.vue` | Variantes `default` · `secondary` · `outline` · `ghost` · `destructive` · `link`. Tamanhos `sm` 36px · `default` 44px · `lg` 52px · `icon` 44×44. |
| Input / Label | `ui/Input.vue`, `ui/Label.vue` | Altura 44px, borda `input`, erro com borda e texto `destructive`. |
| SearchBar | `SearchBar.vue` | Pílula (`rounded-full`) sobre `muted`. |
| Card | `ui/Card.vue` | `rounded-lg`, borda, sem sombra em repouso. |
| RecipeCard | `RecipeCard.vue` | Bloco de cor sólida (`tone-*`) com a inicial em Bricolage; tags em chips `muted`. |
| Tag | (inline) | `rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold`. Tag ativa/filtro: `bg-primary text-primary-foreground`. |
| Toast | `ui/ToastContainer.vue` | `shadow-lg`, ação em `primary`. |
| ConfirmDialog | `ui/ConfirmDialog.vue` | `rounded-xl`, ação destrutiva à direita. |
| BrandMark / BitMascot | `brand/*.vue` | Ver §2. |

### Faça / Não faça

| ✅ Faça | ❌ Não faça |
|--------|-----------|
| `class="bg-primary text-primary-foreground"` | `style="background:#2F6B3B"` |
| `text-muted-foreground` para texto secundário | `text-gray-500`, `text-slate-*` |
| Um botão `default` (primário) por área | Vários botões verdes competindo |
| `highlight` para um destaque pontual | Páprica como cor de botão de ação |
| Mascote + texto explicativo | Mascote decorando telas cheias de conteúdo |

---

## 8. Modo escuro

Classe `.dark` no `<html>`, controlada por `composables/useDarkMode.ts` (preferência salva → senão segue o sistema). Todo token tem par escuro; testar sempre os dois temas. No escuro, `primary` vira verde claro com texto escuro por cima.

## 9. Como evoluir o sistema

1. Altere o token em `style.css` (`:root` **e** `.dark`) e a tabela deste documento.
2. Confira contraste AA (4.5:1 texto, 3:1 texto ≥ 24px ou elementos de UI).
3. Atualize o canvas de design se a mudança for visual.
4. Rode `npm run test`, `npm run type-check` e `npm run lint` em `frontend/`.

## 10. Migração v1 → v2 e pendências

| Área | v1 (antes) | v2 "Feira" |
|------|-----------|------------|
| Paleta | shadcn slate + laranja `#f97316` genérico | Manjericão / páprica / açafrão / farinha, AA verificado |
| Tipografia | Fonte do sistema | Bricolage Grotesque + Instrument Sans + JetBrains Mono |
| Logo | Ícone Lucide `ChefHat`; favicon padrão do Vite | Marca própria (Bit) + favicon |
| Card de receita | Gradiente aleatório por hue + ícone de talher | Bloco de tom sólido + inicial do título |
| NavBar | Glassmorphism (`backdrop-blur`) | Sólida com borda |
| Button | `variant`/`size` ignorados (todos saíam `default`) | Props declaradas; alvo de 44px |
| Toast sucesso | Emerald (fora da paleta) | `secondary` |
| Ajuda | `gray-*`/`blue-*` fixos (quebrava modo escuro) | Tokens |
| Estados vazios / 404 | Ícones genéricos | Bit nas poses `thinking` / `hello` / `oops` |

**Pendências conhecidas**

1. **Classes `animate-in …` sem efeito.** ~20 usos (`fade-in`, `zoom-in-95`, `slide-in-from-bottom-4`) dependem do plugin `tw-animate-css`, que não está instalado. Decidir: instalar o plugin ou remover as classes.
2. **Botões `size="sm"` (36px)** em 18 lugares ficam abaixo do alvo de 44px. Revisar os usados em mobile.
3. **`text-xs` (12px)** em metadados de `RecipeForm`, `ListEditor` e `PdfImportReview`: subir para `text-sm` onde houver leitura.
4. **Detalhe da receita:** o design prevê checklist de ingredientes ("3 de 9 separados") e passos numerados em círculo. Ainda não implementado.
5. **Pose `cooking` do Bit** ainda sem uso: aplicar no carregamento da importação por link/PDF.
6. **Fontes via Google Fonts:** considerar self-host (`@fontsource/*`) para privacidade e uso offline.

---

**Versão:** 2.0 · **Data:** 2026-10-09
