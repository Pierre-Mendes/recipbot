export interface HelpItem {
  question: string
  answer: string
}

export const helpContent: HelpItem[] = [
  {
    question: 'Como criar uma receita manual?',
    answer: `<p>Para criar uma receita manual:</p>
    <ol>
      <li>Clique no botão "Nova Receita" na página inicial.</li>
      <li>Preencha o título da receita.</li>
      <li>Adicione os ingredientes um por um.</li>
      <li>Digite as instruções passo a passo.</li>
      <li>Adicione tags para organizar sua receita.</li>
      <li>Clique em "Salvar" para adicionar a receita ao seu livro.</li>
    </ol>`,
  },
  {
    question: 'Como importar uma receita por link?',
    answer: `<p>Para importar uma receita por link:</p>
    <ol>
      <li>Clique no botão "Importar" na página inicial.</li>
      <li>Cole o link da receita no campo fornecido.</li>
      <li>Selecione as tags que deseja associar à receita.</li>
      <li>Clique em "Importar" para revisar a receita extraída.</li>
      <li>Faça as edições necessárias e clique em "Salvar" para adicionar ao seu livro.</li>
    </ol>
    <p>Atualmente suportamos sites como Tudogostoso, Cybercook e Receitas Globo.</p>`,
  },
  {
    question: 'Como organizar receitas por tags?',
    answer: `<p>Para organizar suas receitas por tags:</p>
    <ol>
      <li>Ao criar ou editar uma receita, digite as tags no campo "Tags".</li>
      <li>Pressione Enter após cada tag para adicioná-la.</li>
      <li>Para remover uma tag, clique no ícone de X ao lado dela.</li>
      <li>Use tags como "Sobremesa", "Principal", "Rápido" para categorizar suas receitas.</li>
      <li>Para filtrar receitas por tag, clique na tag desejada na página inicial.</li>
    </ol>`,
  },
  {
    question: 'Como buscar receitas?',
    answer: `<p>Para buscar receitas:</p>
    <ol>
      <li>Digite sua busca no campo de busca na página inicial.</li>
      <li>Pressione Enter ou clique no ícone de busca.</li>
      <li>Os resultados serão filtrados por título e ingredientes.</li>
      <li>Use tags para refinar sua busca (ex: "Sobremesa" + "Chocolate").</li>
      <li>Para limpar a busca, clique no ícone de X no campo de busca.</li>
    </ol>`,
  },
  {
    question: 'Como editar meu perfil e senha?',
    answer: `<p>Para editar seu perfil e senha:</p>
    <ol>
      <li>Clique no ícone de perfil no canto superior direito.</li>
      <li>Selecione "Configurações de Perfil".</li>
      <li>Para editar seu nome ou e-mail, clique no ícone de lápis ao lado do campo.</li>
      <li>Para alterar sua senha, clique em "Alterar Senha" e siga as instruções.</li>
      <li>Clique em "Salvar" para confirmar as alterações.</li>
    </ol>`,
  },
]
