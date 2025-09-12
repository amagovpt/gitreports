# GitReports - Gerador de Relatórios de Auditoria

Relatórios de auditoria do Selo de Usabilidade e Acessibilidade gerados automaticamente a partir das issues do GitHub.

## Visão Geral

O GitReports é uma ferramenta que gera automaticamente relatórios de auditoria para o "Selo de Usabilidade e Acessibilidade" utilizando dados do sistema de rastreamento de issues do GitHub.

## Versões Disponíveis

### Versão 1 (v1)
- **Funcionalidade**: Relatório com ligação externa para consulta das issues
- **Visualização**: Botão "Consultar no GitHub" que redireciona o utilizador para ver as issues diretamente no repositório GitHub
- **Vantagem**: Acesso direto ao contexto completo das issues no GitHub
- **Uso**: Ideal para auditores que preferem consultar as issues na plataforma original

### Versão 2 (v2) - Actual
- **Funcionalidade**: Relatório com issues integradas diretamente no documento
- **Visualização**: As issues são apresentadas diretamente no relatório, incluindo todo o conteúdo markdown convertido para HTML
- **Vantagens**: 
  - Relatório auto-suficiente sem necessidade de acesso externo
  - Processamento completo de markdown (listas, citações, imagens, código, etc.)
  - Formatação consistente
- **Uso**: Ideal para relatórios finais e documentação formal

## Características Técnicas

- **Tecnologia**: HTML5, CSS3, JavaScript (vanilla)
- **Arquitectura**: Cliente-side, sem servidor
- **Compatibilidade**: Browsers modernos

## Utilização

### Pré-requisitos

**Importante**: Para executar o relatório é necessário ter um ficheiro `config-local.js` na raiz do projecto com as configurações do GitHub:

```javascript
window.APP_CONFIG = {
  GITHUB_TOKEN: 'seu_token_github_aqui',
  GITHUB_OWNER: 'nome_do_utilizador_ou_organizacao'
};
```

### Passos

1. Abrir `v1/reporte.html` ou `v2/reporte.html` num browser conforme a versão pretendida
2. Seleccionar o repositório da lista
3. Gerar o relatório pretendido:
   - **Relatório de Auditoria**: Exclui issues marcadas como "OK"
   - **Relatório para Declaração**: Inclui todas as issues (incluindo "OK")

## Processamento de Conteúdo

A versão 2 inclui processamento avançado de:
- Markdown para HTML (headers, listas, citações, código)
- Imagens (tanto markdown quanto HTML)
- Formatação de texto (negrito, itálico, riscado)
- Ligações e referências
- Tabelas e elementos estruturais

---

**Desenvolvido por**: ARTE. I.P. - Núcleo de Experiência e Usabilidade  
**Versão**: 1.0
