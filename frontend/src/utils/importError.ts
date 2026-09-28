/**
 * The import endpoints answer with short English messages (they double as
 * API contract). Map the ones a user can act on to pt-BR, so a failed import
 * says *why* - "site não suportado" - instead of a generic failure.
 */
const MESSAGES: Array<[RegExp, string]> = [
  [
    /^Domain not whitelisted/,
    'Este site ainda não é suportado. Use um link do TudoGostoso ou do Globo Receitas.',
  ],
  [/^Only http\/https URLs/, 'Informe um link que comece com http:// ou https://.'],
  [/^(Invalid URL|Could not resolve host)/, 'Não encontramos esse endereço. Confira o link.'],
  [/^URL extraction timeout/, 'O site demorou demais para responder. Tente novamente.'],
  [/^Could not fetch the page/, 'Não conseguimos abrir a página. Confira se o link está correto.'],
  [/^Too many redirects/, 'A página redireciona demais. Tente o link final da receita.'],
  [/^Response too large/, 'A página é grande demais para importar.'],
  [
    /^Could not extract a recipe/,
    'Não encontramos uma receita nessa página. Confira se o link é de uma receita.',
  ],
  [/^This PDF has too many pages \(max (\d+)\)/, 'O PDF tem páginas demais (máximo de $1).'],
  [
    /^This PDF has no readable text/,
    'Este PDF não tem texto selecionável (parece ser uma imagem escaneada). Tente enviar uma foto das páginas da receita.',
  ],
  [
    /^Could not read this PDF/,
    'Não conseguimos abrir este PDF. Ele pode estar protegido por senha ou corrompido.',
  ],
  [/^PDF import not found or expired/, 'A análise do PDF expirou. Envie o arquivo novamente.'],
  [/^The PDF is too large/, 'O PDF é grande demais (máximo de 20 MB).'],
  // PHP dropped an upload above its own limits before Laravel validated it.
  [/^The file failed to upload/, 'O arquivo é grande demais para enviar.'],
  [/^The file may be at most/, 'O arquivo é grande demais (máximo de 10 MB).'],
]

export function importErrorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { message?: unknown } } })
    ?.response

  if (response?.status === 413) {
    return 'O arquivo é grande demais para enviar.'
  }

  const message = response?.data?.message
  if (typeof message !== 'string') return fallback

  for (const [pattern, translated] of MESSAGES) {
    const match = message.match(pattern)
    if (match) return translated.replace('$1', match[1] ?? '')
  }

  return fallback
}
