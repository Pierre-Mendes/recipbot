export enum WizardStep {
  // Image/link flows only: OCR/scraping pre-fills these, user confirms or
  // edits each part before the normal linear steps continue.
  REVISAR_TITULO_INGREDIENTES = 'revisar_titulo_ingredientes',
  REVISAR_MODO_PREPARO = 'revisar_modo_preparo',

  // Linear steps, same order for every capture type.
  NOME = 'nome',
  INGREDIENTES = 'ingredientes',
  MODO_PREPARO = 'modo_preparo',
  OBSERVACOES = 'observacoes',
  RENDIMENTO = 'rendimento',
  TEMPO_PREPARO = 'tempo_preparo',
  LINK = 'link',
  TAGS = 'tags',

  CONFIRMACAO = 'confirmacao',
}
