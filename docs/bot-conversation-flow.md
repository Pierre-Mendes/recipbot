# Bot Conversation Flow & Session Management - RecipBot

## Language Rule (applies to every interaction)
- The bot MUST reply only in **pt-BR**, regardless of the user's Telegram client language, device locale, or the language of the input text/image.
- All button labels, prompts, error messages, and confirmations are pt-BR.
- OCR/scraping output may come back in any language — the bot still confirms it back to the user in pt-BR.

## US05: Onboarding
- On `/start`:
  - **First-ever conversation for this `telegram_chat_id`** (no rows in `recipes` or `recipe_drafts`, and no `users`/`chat_state` row): send a short welcome message explaining what the bot does (save recipes from text, photo, or link; search them later by tag or free text) and how to begin.
  - **Returning user**: send a short greeting only ("Oi de novo! O que vamos fazer hoje?"), skip the full explanation.
- After the greeting, always show the entry menu (see US06) unless the user typed a different command.

## US06: Recipe Capture Type Selection
- Command `/nova` (and the post-onboarding message) shows a Telegram inline keyboard with 3 options:
  - 📝 Texto
  - 📷 Imagem / Print
  - 🔗 Link do site
- Selecting an option starts the corresponding wizard (below). The user can change their mind and go back to this menu at any step (see "Navigation" below).

### 6a. Text flow
Ask sequentially, one message at a time, waiting for the user's reply before advancing. All steps offer a "Pular" button — including the core ones (see US07 for why nothing hard-blocks):
1. Nome da receita (core)
2. Ingredientes (core)
3. Modo de preparo (core)
4. Observações (optional)
5. Rendimento / porções (optional)
6. Tempo de preparo (optional)

### 6b. Image / Link flow
1. Bot runs OCR (image) or scraping (link) and extracts a draft (title, ingredients, instructions).
2. Bot presents the extracted content **in parts**, not all at once — e.g. first the title + ingredients, ask "Está correto?" with inline buttons [✅ Confirmar] [✏️ Editar], then instructions with the same confirm/edit pattern.
3. If the user picks "Editar" for a part, the bot asks them to resend just that part as text and re-confirms.
4. If extraction fails or comes back empty, fall back to the text flow for the missing fields (never lose the raw extracted text — store it in `recipe_drafts.raw_extracted_text` regardless of parse success, as already noted in CLAUDE.md).
5. Core fields (nome, ingredientes, modo de preparo) follow the same non-blocking rule as the text flow: if OCR/scraping couldn't extract one, the user can skip it via "Pular" and the soft-warning-at-confirmation rule in US07 applies — it never blocks the draft from being saved.

### 6c. Common final steps (all flows converge here)
1. Ask for an optional note/reference link ("Quer adicionar uma observação, ou o link de um Reels/vídeo relacionado?") — "Pular" button available.
2. Ask for tags (free text, comma-separated) — explain briefly that tags make the recipe searchable later (e.g. "esfirra" tag helps find it by search).
3. Show a final summary of the whole draft and ask for confirmation: [✅ Salvar] [✏️ Editar algo] [❌ Cancelar]. If nome/ingredientes/modo de preparo are empty at this point, prepend the soft warning + [💾 Salvar assim mesmo] / [✏️ Completar agora] choice described in US07 before showing this final confirmation.
4. On confirm: compute embedding, move draft → `recipes`, delete the draft, send success message.

## US07: Navigation, Cancel, Back, Forward

Commands work as slash commands at any point in any wizard (in addition to inline buttons where relevant):

- **`/cancelar`** — abandons the current draft immediately, deletes it from `recipe_drafts`, confirms cancellation in pt-BR.

- **`/retroceder`** — the bot lists the steps already completed for the current draft (e.g. "1. Nome ✅  2. Ingredientes ✅  3. Modo de preparo ✅  4. Observações ✅") as an inline keyboard, and asks "Para qual etapa você quer voltar?". Selecting a step jumps back to it, keeps everything collected for steps *before* it, and discards/re-asks everything from the selected step onward (the user re-answers from there forward, same as if they were progressing normally).

- **`/avancar`** — same UX pattern: the bot lists the *remaining* steps as an inline keyboard and asks which one to jump to.
  - **Nothing is hard-blocking.** Nome, ingredientes, and modo de preparo are the *core* fields of a recipe, but the user can freely skip any of them via `/avancar` or "Pular" — the real use case is someone who just wants to register a recipe name + a note ("link do Reels pra assistir depois e completar a receita") and finish there, with everything else filled in later.
  - When the user reaches the final summary/confirmation with core fields (nome/ingredientes/modo de preparo) still empty, the bot shows a **soft warning**, not a block: "⚠️ Essa receita ainda está incompleta (faltam: ingredientes, modo de preparo). Quer salvar assim mesmo ou completar agora?" with buttons [💾 Salvar assim mesmo] [✏️ Completar agora]. Either choice is valid; "Salvar assim mesmo" saves the recipe with the missing fields empty.
  - The saved recipe carries an implicit "incompleta" status (derivable from empty nome/ingredientes/modo de preparo) so it can later be surfaced back to the user — e.g. a `/pendentes` or "receitas incompletas" listing — as a reminder to finish it (see Future Work below).
  - Jumping forward marks the skipped fields as "not answered" (not "pending") so the final summary correctly shows them as empty rather than mid-progress.

## US08: Session Cache & Expiration Warnings
**Problem:** if a user starts a draft and goes silent, the in-progress wizard state (current step + collected answers) must survive a while, but not forever.

**Rules:**
- Wizard state per `telegram_chat_id` (current step, collected fields, draft id) lives in a TTL cache with a **30-minute inactivity window**, reset on every user reply.
- At **20, 15, and 10 minutes** of remaining inactivity time, the bot proactively sends a warning: "⏳ Você tem receita em andamento! Em X minutos o progresso será perdido se não continuarmos." Only one warning per threshold (don't repeat if the user is inactive across multiple checks at the same threshold).
- On expiration: clear the cached wizard state, but **do not** delete the underlying `recipe_drafts` row — keep the partial draft in the DB so nothing already confirmed is lost; only the "which step am I on" progress is lost. Notify the user once, next time they interact: "Seu progresso anterior expirou, mas o rascunho da receita continua salvo. Quer continuar de onde parou ou começar do zero?" — offer both.
- If the user resumes within the 30-minute window, continue exactly from the last step with previously collected answers intact.

**Implementation note:** since this is a single-instance NestJS app (no horizontal scaling planned), an in-memory TTL cache (e.g. a small `Map` + `setTimeout`/`node-cache`) is enough and avoids adding a Redis dependency to a zero-cost project. If the bot ever needs multiple instances, this state must move to Redis or Postgres (`chat_wizard_state` table) since in-memory state won't be shared across processes.

## Data model addition
Add a lightweight state row (can live in `recipe_drafts` itself as new columns, or a separate table):
```sql
ALTER TABLE recipe_drafts
  ADD COLUMN IF NOT EXISTS wizard_step VARCHAR(50),
  ADD COLUMN IF NOT EXISTS collected_fields JSONB DEFAULT '{}';
```
`wizard_step` and `collected_fields` are the durable side; the in-memory TTL cache is just a fast/ephemeral mirror used for the timeout-warning timers, always re-derivable from this row.
