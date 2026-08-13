// Every user-facing string in the bot module lives here or in
// wizard-presenter.ts — pt-BR only, regardless of code/comment language.

export const WELCOME_FIRST_TIME =
  'Oi! Eu sou o RecipBot 🍲 Eu guardo suas receitas a partir de texto, foto de print ou link, e depois você pode buscar tudo de novo por tag ou por texto livre.';

export const WELCOME_RETURNING = 'Oi de novo! O que vamos fazer hoje?';

export const HELP_TEXT =
  'Use /nova para começar uma receita nova. Durante o processo você pode usar /cancelar, /retroceder ou /avancar a qualquer momento.';

export const AWAITING_LINK_PROMPT =
  'Beleza, me manda o link do site, Reels ou vídeo.';
export const AWAITING_IMAGE_PROMPT = 'Beleza, me manda a foto da receita 📸';

export const IMAGE_INVALID_MESSAGE =
  'Essa imagem não é válida ou não é compatível. Tente enviar outra foto.';
export const IMAGE_SERVER_ERROR_MESSAGE =
  'Não consegui ler essa imagem agora — parece um problema temporário aqui do meu lado, não com a sua foto. Tente de novo em instantes.';
export const LINK_BLOCKED_MESSAGE =
  'Esse link não é permitido por segurança. Tente outro.';
export const LINK_FAILED_MESSAGE =
  'Não consegui acessar esse link agora. Tente outro link, ou tente de novo em instantes.';
export const GENERIC_ERROR_MESSAGE =
  'Algo deu errado. Tente de novo, ou use /cancelar para recomeçar.';
export const DRAFT_GONE_MESSAGE = 'Esse rascunho não está mais disponível.';
export const REVIEW_EXPECTS_BUTTON_MESSAGE =
  'Use os botões acima para confirmar ou editar essa parte.';

export function wizardWarningMessage(minutesRemaining: number): string {
  return `⏳ Você tem receita em andamento! Em ${minutesRemaining} minutos o progresso será perdido se não continuarmos.`;
}
