// const { GITHUB_TOKEN, GITHUB_OWNER } = require('../config-local.js');

const { GITHUB_TOKEN, GITHUB_OWNER } = window.APP_CONFIG;

document.getElementById('fetchReposBtn').addEventListener('click', fetchRepositories);
document.getElementById('generateReportBtn').addEventListener('click', generateReport);

// Auto-load repositories when page loads
document.addEventListener('DOMContentLoaded', function() {
  fetchRepositories();
  
  // Evitar layout shift quando mensagem desaparece durante interação com select
  const repoSelect = document.getElementById('repoSelect');
  const fetchStatusDiv = document.getElementById('fetch-status');
  
  repoSelect.addEventListener('focus', function() {
    if (fetchStatusDiv.classList.contains('fetch-status-visible')) {
      fetchStatusDiv.classList.add('fade-out');
      setTimeout(() => {
        fetchStatusDiv.classList.remove('fetch-status-visible');
        fetchStatusDiv.classList.add('fetch-status-hidden');
        fetchStatusDiv.classList.remove('fade-out');
      }, 300);
    }
  });

  repoSelect.addEventListener('click', function() {
    if (fetchStatusDiv.classList.contains('fetch-status-visible')) {
      fetchStatusDiv.classList.add('fade-out');
      setTimeout(() => {
        fetchStatusDiv.classList.remove('fetch-status-visible');
        fetchStatusDiv.classList.add('fetch-status-hidden');
        fetchStatusDiv.classList.remove('fade-out');
      }, 300);
    }
  });
});

async function fetchRepositories() {
  const statusDiv = document.getElementById('status');
  const fetchStatusDiv = document.getElementById('fetch-status');
  const repoSelect = document.getElementById('repoSelect');
  const generateBtn = document.getElementById('generateReportBtn');
  const fetchBtn = document.getElementById('fetchReposBtn');
  
  repoSelect.innerHTML = '<option value="">Escolha o repositório para gerar o relatório</option>';
  repoSelect.disabled = true;
  generateBtn.disabled = true;
  generateBtn.classList.add('disabled');
  
  // Add loading state
  fetchBtn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>A carregar repositórios...';
  fetchBtn.disabled = true;
  
  // Show fetch status below the button
  fetchStatusDiv.classList.remove('fetch-status-hidden');
  fetchStatusDiv.classList.add('fetch-status-visible');
  fetchStatusDiv.className = 'status-message status-info';
  fetchStatusDiv.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i> A procurar repositórios...';
  fetchStatusDiv.setAttribute('aria-live', 'polite');
  
  // Clear main status
  statusDiv.innerHTML = '';
  statusDiv.className = 'status-message';
    
  try {
    const url = `https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=100`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    if (!response.ok) throw new Error('Falha ao procurar repositórios.');
    const repos = await response.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      fetchStatusDiv.className = 'status-message status-error';
      fetchStatusDiv.innerHTML = '<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Nenhum repositório encontrado.';
      fetchStatusDiv.setAttribute('aria-live', 'assertive');
      return;
    }
    // Filter only repositories that start with "Report_" or "reports_" (case-insensitive)
    const reportRepos = repos.filter(repo => 
      repo.name.toLowerCase().startsWith('report_') || 
      repo.name.toLowerCase().startsWith('reports_')
    );
    
    if (reportRepos.length === 0) {
      fetchStatusDiv.className = 'status-message status-error';
      fetchStatusDiv.innerHTML = '<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Nenhum repositório de avaliação encontrado (Report_* ou reports_*).';
      fetchStatusDiv.setAttribute('aria-live', 'assertive');
      return;
    }
    
    reportRepos.forEach(repo => {
      const option = document.createElement('option');
      option.value = repo.name;
      option.text = repo.name;
      repoSelect.appendChild(option);
    });
    repoSelect.disabled = false;
    generateBtn.disabled = false;
    generateBtn.classList.remove('disabled');
    
    fetchStatusDiv.className = 'status-message status-success';
    fetchStatusDiv.innerHTML = `<i class="bi bi-check-circle" aria-hidden="true"></i> Repositórios atualizados!`;
    fetchStatusDiv.setAttribute('aria-live', 'polite');
    
    // Fade out após 5 segundos e ocultar após 6 segundos (mais tempo para interação)
    setTimeout(() => {
      fetchStatusDiv.classList.add('fade-out');
    }, 5000);
    
    setTimeout(() => {
      fetchStatusDiv.classList.remove('fetch-status-visible');
      fetchStatusDiv.classList.add('fetch-status-hidden');
      fetchStatusDiv.classList.remove('fade-out');
    }, 6000);
  } catch (e) {
    fetchStatusDiv.className = 'status-message status-error';
    fetchStatusDiv.innerHTML = `<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Erro: ${e.message}`;
    fetchStatusDiv.setAttribute('aria-live', 'assertive');
  } finally {
    fetchBtn.innerHTML = '<i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Atualizar repositórios<span class="sr-only">. Clique para atualizar a lista de repositórios disponíveis</span>';
    fetchBtn.disabled = false;
  }
}

async function fetchReadmeInfo(repoName) {
  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repoName}/readme`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    
    if (!response.ok) {
      return null; // No README found
    }
    
    const data = await response.json();
    const content = decodeURIComponent(escape(atob(data.content))); // Decode base64 with proper UTF-8 handling
    
    // Extract info from README with flexible patterns
    const dateMatch = content.match(/\*\*Data:\*\*\s*(\d{1,2} de \w+ de \d{4})|Data:\s*(\d{1,2} de \w+ de \d{4})|(\d{1,2} de \w+ de \d{4})/);
    
    // Extract organization from header (# title)
    const organizationMatch = content.match(/^#\s*(.+)$/m);
    
    // Extract URL
    const urlMatch = content.match(/[-*]\s*URL:\s*([^\n\r]+)/i);
    
    // Extract owner/proprietário (handle different spacing and formats)
    const ownerMatch = content.match(/[-*]\s*Proprietário:\s*([^\n\r]+)/i) ||
                      content.match(/Proprietário:\s*([^\n\r]+)/i);
    
    // Extract seal type (candidatura a)
    const sealMatch = content.match(/[-*]\s*Candidatura a:\s*([^\n\r]+)/i) ||
                     content.match(/Candidatura a:\s*([^\n\r]+)/i);
    
    const extractedInfo = {
      date: dateMatch ? (dateMatch[1] || dateMatch[2] || dateMatch[3]) : null,
      organization: organizationMatch ? organizationMatch[1].trim() : null,
      url: urlMatch ? urlMatch[1].trim() : null,
      owner: ownerMatch ? ownerMatch[1].trim() : null,
      sealType: sealMatch ? sealMatch[1].trim() : null
    };
    return extractedInfo;
  } catch (e) {
    console.warn('Failed to fetch README:', e);
    return null;
  }
}

async function generateReport() {
  const repoSelect = document.getElementById('repoSelect');
  const repoName = repoSelect.value;
  const statusDiv = document.getElementById('status');
  const generateBtn = document.getElementById('generateReportBtn');
  
  if (!repoName || repoName === 'Escolha o repositório para gerar o relatório' || repoName === '') {
    statusDiv.className = 'status-message status-error';
    statusDiv.innerHTML = '<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Por favor selecione um repositório.';
    statusDiv.setAttribute('aria-live', 'assertive');
    return;
  }
  
  // Add loading state
  generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>A gerar relatório...';
  generateBtn.disabled = true;
  generateBtn.classList.add('disabled');
  
  statusDiv.className = 'status-message status-info';
  statusDiv.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i> A procurar dados do repositório...';
  statusDiv.setAttribute('aria-live', 'polite');
  
  try {
    // Fetch both issues and README in parallel
    const [issuesResponse, readmeInfo] = await Promise.all([
      fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${repoName}/issues?state=all&per_page=100`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
      }),
      fetchReadmeInfo(repoName)
    ]);
    
    if (!issuesResponse.ok) throw new Error('Falha ao procurar issues do repositório.');
    
    statusDiv.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i> A processar dados e gerar relatório...';
    
    const issues = await issuesResponse.json();
    const grouped = groupIssues(issues);
    const html = generateReportHTML(grouped, repoName, readmeInfo);
    
    // Extract number from repo name (e.g., "Report_001" -> "001", "reports_123" -> "123")
    const repoNumberMatch = repoName.match(/(?:reports?_)(\d+)/i);
    const repoNumber = repoNumberMatch ? repoNumberMatch[1].padStart(3, '0') : '001';
    const filename = `relatorio_report_${repoNumber}.html`;
    
    downloadFile(html, filename);
    
    statusDiv.className = 'status-message status-success';
    statusDiv.innerHTML = `<i class="bi bi-check-circle" aria-hidden="true"></i> Relatório gerado com sucesso! Consulte a sua pasta de transferências.`;
    statusDiv.setAttribute('aria-live', 'polite');
  } catch (e) {
    statusDiv.className = 'status-message status-error';
    statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Erro: ${e.message}`;
    statusDiv.setAttribute('aria-live', 'assertive');
  } finally {
    generateBtn.innerHTML = '<i class="bi bi-download" aria-hidden="true"></i> Gerar e descarregar o relatório';
    generateBtn.disabled = false;
    generateBtn.classList.remove('disabled');
  }
}

function groupIssues(issues) {
  
  const grouped = {
    'chk10': {},
    'conteudo': {},
    'transacao': {},
    'declaracao': {},
    'automatic': {},
    'outras': {}
  };

  issues.forEach(issue => {
    // Determine checklist type
    let checklistType = 'outras';
    if (issue.labels.some(l => l.name === 'chk 10 web' || l.name === 'chk10')) checklistType = 'chk10';
    else if (issue.labels.some(l => l.name === 'chk conteúdo' || l.name === 'chk conteudo' || l.name === 'conteudo')) checklistType = 'conteudo';
    else if (issue.labels.some(l => l.name === 'chk trans' || l.name === 'chk transacao' || l.name === 'transacao' || l.name === 'chk transação')) checklistType = 'transacao';
    else if (issue.labels.some(l => l.name === 'declaracao' || l.name === 'dec a11y')) checklistType = 'declaracao';
    else if (issue.labels.some(l => l.name === 'automatic' || l.name === 'auto' || l.name === 'av auto' || l.name.toLowerCase().trim() === 'av auto')) checklistType = 'automatic';
    else if (issue.labels.some(l => l.name === 'outras violações' || l.name === 'outras violacoes')) checklistType = 'outras';

    // Find requirement label (R X.X)
    const requirementLabel = issue.labels.find(l => l.name.match(/R \d+\.\d+/));
    const requirementName = requirementLabel ? requirementLabel.name : null;

    // Determine status - verificar N/A primeiro para evitar classificação incorreta
    let status = 'NOK';
    
    // Verificar várias variações do label N/A
    const naLabels = issue.labels.filter(l => 
      l.name.toLowerCase().match(/^n[\/\.]?a$/i) || 
      l.name.toLowerCase() === 'na' ||
      l.name.toLowerCase() === 'n/a' ||
      l.name.toLowerCase() === 'n.a'
    );
    
    if (naLabels.length > 0) status = 'NA';
    else if (issue.labels.some(l => l.name === 'OK' || l.name.toLowerCase() === 'ok')) status = 'OK';
    else if (issue.labels.some(l => 
      l.name === 'melhoria' || 
      l.name === 'Melhoria' || 
      l.name.toLowerCase() === 'melhoria'
    )) status = 'melhoria';

    // Para "outras violações", permitir issues sem requirement labels
    // Para outros tipos, exigir requirement labels
    if (requirementName === null && checklistType !== 'outras' && checklistType !== 'automatic' && checklistType !== 'declaracao') {
      return;
    }

    // Para "outras violações", usar o título da issue ou "Outras violações" como chave
    let groupKey;
    if (checklistType === 'declaracao') {
      // Para declaração, sempre usar o mesmo grupo
      groupKey = 'Declaração de Acessibilidade';
    } else {
      // Para outros tipos, usar o requirement ou o título padrão
      groupKey = requirementName || 
        (checklistType === 'outras' ? 'Outras violações' : 
         checklistType === 'automatic' ? 'Avaliação automática' : null);
    }
    
    if (groupKey && !grouped[checklistType][groupKey]) {
      grouped[checklistType][groupKey] = [];
    }
    if (groupKey) {
      grouped[checklistType][groupKey].push({...issue, status});
    }
  });

  return grouped;
}

function generateReportHTML(grouped, repoName, readmeInfo = null) {
  // Use README info if available, otherwise fallback to defaults  
  const currentDateRaw = new Date().toLocaleDateString('pt-PT', { 
    year: 'numeric', 
    month: 'long'
  });
  // Capitalize first letter of month
  const currentDate = currentDateRaw.charAt(0).toUpperCase() + currentDateRaw.slice(1);
  const reportDate = readmeInfo?.date || currentDate;
  const organization = readmeInfo?.organization || repoName;
  const owner = readmeInfo?.owner ? `Proprietário: ${readmeInfo.owner}` : `Proprietário do ${repoName}`;
  const websiteUrl = readmeInfo?.url || `https://${repoName.toLowerCase()}.gov.pt/`;
  const sealType = readmeInfo?.sealType ? `Candidatura a: ${readmeInfo.sealType}` : 'Candidatura a: Selo Bronze';
  const sealTypeShort = readmeInfo?.sealType || 'Selo Bronze';
  const ownerShort = readmeInfo?.owner || 'Programa PTCris';

  // Extrair (Mês Ano) de reportDate para exibição curta, ex.: "Agosto 2025"
  const reportMonthYear = (() => {
    const text = String(reportDate);
    // Formatos possíveis: "12 de Março de 2025" ou "Março de 2025" ou "Março 2025"
    const matchFull = text.match(/(?:\b\d{1,2}\s+de\s+)?([A-Za-zÀ-ÿ]+)\s+de\s+(\d{4})/i);
    const matchShort = text.match(/([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
    const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    if (matchFull) return `${capitalize(matchFull[1])} ${matchFull[2]}`;
    if (matchShort) return `${capitalize(matchShort[1])} ${matchShort[2]}`;
    return text;
  })();

  let html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório ${organization}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: white;
      padding: 8px;
      z-index: 100;
      transition: top 0.3s ease;
    }
    .skip-link:focus {
      top: 0;
    }
    .visually-hidden-focusable:not(:focus):not(:focus-within) {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0,0,0,0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
    .container {
      max-width: 900px;
    }
    h1 {
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
    }
    .status-ok { 
      color: #ffffff; 
      background-color: #0E8A16; 
      padding: 0.25rem 0.5rem; 
      border-radius: 50px;
      font-weight: 500;
      display: inline-block;
    }
    .status-nok { 
      color: #ffffff; 
      background-color: #B60205; 
      padding: 0.25rem 0.5rem; 
      border-radius: 50px;
      font-weight: 500;
      display: inline-block;
    }
    .status-melhoria { 
      color: #856404; 
      background-color: #fff3cd; 
      padding: 0.25rem 0.5rem; 
      border-radius: 50px;
      font-weight: 500;
      display: inline-block;
    }
        .status-na {
      color: #000;
      background-color: #C2E0C6; 
      padding: 0.25rem 0.5rem; 
      border-radius: 50px;
      font-weight: 500;
      display: inline-block;
    }
    .requirement-title { 
      margin-top: 2rem; 
    }
    .requirement-title h4,
    .requirement-title h3 {
      color: #000;
    }
    .mb-4 ul li a {
      color: #1e3a8a;
      text-decoration: none;
    }
    .mb-4 ul li a:hover {
      color: #1e40af;
      text-decoration: underline;
    }

    /* Índice (summary) com maior destaque visual e acessível */
    summary.index-summary {
      display: list-item; /* manter marcador nativo */
      font-weight: 700;
      font-size: 1.25rem !important; /* aumentar o texto */
      color: #000;
      padding-left: 0; /* sem recuo extra */
      border-left: none; /* sem borda lateral */
      border-radius: 0;
      cursor: pointer;
    }
    summary.index-summary:hover {
      background-color: transparent; /* sem fundo ao hover */
    }
    summary.index-summary:focus {
      outline: 3px solid #333399;
      outline-offset: 2px;
    }
    /* Aumentar o tamanho da seta nativa (compatibilidade ampla) */
    summary.index-summary::marker {
      font-size: 1em;
    }
    summary.index-summary::-webkit-details-marker {
      font-size: 1em;
    }

    .evidence-list { 
      list-style-type: disc; 
      padding-left: 1.5rem; 
      margin: 1rem 0; 
    }
    .evidence-item { 
      margin: 0.5rem 0; 
      padding: 0.5rem 0.5rem 0.5rem 1.5rem; 
      border-radius: 4px;
      background-color: #f6f6f6;
      color: #000;
      margin-left: -1.5rem;
      list-style-position: inside;
    }
    
    .evidence-item .github-link {
      margin: 1.5rem 0 1rem 0;
      border-color: #1e3a8a;
      color: #1e3a8a;
    }
    .evidence-item .github-link:hover {
      background-color: #1e3a8a;
      color: #ffffff;
      border-color: #1e3a8a;
    }
    .evidence-labels {
      font-size: 0.85em;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .label-tag {
      padding: 0.125rem 0.375rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: white;
      display: inline-block;
      margin-right: 0.25rem;
    }
    .label-checklist { background-color: #5319E7; }
    .label-auto { background-color: #5319E7; }
    .label-declaracao { background-color: #5319E7; }
    .label-outras { background-color: #5319E7; }
    .label-melhoria { background-color: #FBCA04; color: #000; }
    .label-na { background-color: #C2E0C6; color: #000; }
    .label-ok { background-color: #0E8A16; }
    .label-nok { background-color: #B60205; }
    .label-requisito { background-color: #0052CC; }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    .github-link {
      display: inline-block;
      margin-top: 0.75rem;
      padding: 0.375rem 0.75rem;
      border: 1px solid #1e3a8a;
      border-radius: 0.375rem;
      color: #1e3a8a;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease-in-out;
    }
    .github-link:hover {
      background-color: #1e3a8a;
      color: #ffffff;
      text-decoration: none;
    }
    #checklist-10-aspetos {
      margin-top: 3.5rem !important;
    }
    .report-section {
      border-bottom: 3px solid #000000;
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }
    .report-section:last-child {
      border-bottom: none;
    }
    .avaliacao-manual-section:last-child {
      border-bottom: none;
    }
    .checklist-section {
      border-bottom: 3px solid #000000;
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .avaliacao-manual-section {
      border-bottom: 1px solid #000000;
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .checklist-section:last-child {
      border-bottom: none;
    }

    #avaliacao-manual {
      border-bottom: 1px solid #000000 !important;
    }
    /* Tabelas: caption por cima */
    table.table caption {
      caption-side: top;
      text-align: left;
      padding-bottom: 0.5rem;
      font-weight: 600;
      color: #000;
    }
  </style>
</head>
<body>
  <a href="#conteudo-principal" class="skip-link visually-hidden-focusable">Saltar para o conteúdo principal</a>
  <div class="container mt-4" id="conteudo-principal" role="main">
    <header class="mb-4">
      <h1>Relatório Avaliação da Candidatura da ${organization}</h1>
    </header>

    <section class="mb-4">
      <ul>
        <li>Consulte aqui: Relatório de Auditoria candidatura a ${sealTypeShort} de ${ownerShort}.</li>
        <li>Avaliação feita por: AMA. I.P. - Núcleo de Experiência e Usabilidade</li>
        <li>Data: ${reportMonthYear}</li>
        <li>${owner}</li>
        <li>URL: <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${websiteUrl}</a></li>
        <li>${sealType}</li>
      </ul>
    </section>

    <nav class="mb-4 report-section" aria-label="Índice">
      <details open>
        <summary class="index-summary">Índice</summary>
        <ul>
          <li><a href="#introducao">Introdução</a></li>
          ${hasIssues(grouped.declaracao) ? '<li><a href="#declaracao">Declaração de Acessibilidade</a></li>' : ''}
          ${hasIssues(grouped.automatic) ? '<li><a href="#avaliacao-automatica">Avaliação automática</a></li>' : ''}
          ${hasIssues({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}) ? `
          <li><a href="#avaliacao-manual">Avaliação manual</a>
            <ul class="indent-list">
              ${hasIssues(grouped.chk10) ? `
              <li><a href="#checklist-10-aspetos">Checklist 10 aspetos</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.chk10).map(req => `<li><a href="#req-chk10-${req.replace(/\s+/g, '-').toLowerCase()}">${getRequirementTitle(req, 'chk10')}</a></li>`).join('')}
                </ul>
              </li>` : ''}
              ${hasIssues(grouped.conteudo) ? `
              <li><a href="#checklist-conteudo">Checklist Conteúdo</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.conteudo).map(req => `<li><a href="#req-conteudo-${req.replace(/\s+/g, '-').toLowerCase()}">${getRequirementTitle(req, 'conteudo')}</a></li>`).join('')}
                </ul>
              </li>` : ''}
              ${hasIssues(grouped.transacao) ? `
              <li><a href="#checklist-transacao">Checklist Transação</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.transacao).map(req => `<li><a href="#req-transacao-${req.replace(/\s+/g, '-').toLowerCase()}">${getRequirementTitle(req, 'transacao')}</a></li>`).join('')}
                </ul>
              </li>` : ''}
            </ul>
          </li>` : ''}
          ${hasIssues(grouped.outras) ? '<li><a href="#outras-violacoes">Outras violações</a></li>' : ''}
          <li><a href="#etiquetas">Significado das etiquetas utilizadas</a></li>
        </ul>
      </details>
    </nav>

    <section id="introducao" class="mb-5 report-section">
      <h2>Introdução</h2>
      <p>O website <a href="${websiteUrl}" target="_blank">${websiteUrl}</a> <strong><span class="status-${getOverallProjectStatus(grouped) === 'passa' ? 'ok' : 'nok'}">${getOverallProjectStatus(grouped)}</span></strong> nos requisitos mínimos do Selo de Usabilidade e Acessibilidade.</p>
      
      <table class="table table-bordered">
        <caption>Estado das avaliações efetuadas</caption>
        <thead>
          <tr>
            <th>Tipo de avaliação</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Avaliação Automática</td>
            <td><span class="status-${getOverallStatus(grouped.automatic)}">${formatStatusForDisplay(getOverallStatus(grouped.automatic))}</span></td>
          </tr>
          <tr>
            <td>Avaliação Manual</td>
            <td><span class="status-${getOverallStatus({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao})}">${formatStatusForDisplay(getOverallStatus({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}))}</span></td>
          </tr>
        </tbody>
      </table>

      ${hasIssues({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}) ? `
      <p>Das avaliações manuais efetuadas obtiveram-se os resultados que se sintetizam na tabela seguinte.</p>` : ''}
      <table class="table table-bordered">
        <caption>Níveis de conformidade das avaliações manuais</caption>
        <thead>
          <tr>
            <th>Checklist</th>
            <th>Conformidade alcançada</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>`
      const chk10Status = getPassStatus(grouped.chk10) === 'passa' ? 'ok' : 'nok';
      const conteudoStatus = getPassStatus(grouped.conteudo) === 'passa' ? 'ok' : 'nok';
      const transacaoStatus = getPassStatus(grouped.transacao) === 'passa' ? 'ok' : 'nok';

      html += `${hasIssues(grouped.chk10) ? `
          <tr>
            <td>10 aspetos</td>
            <td>${calculateConformance(grouped.chk10)}</td>
            <td><span class="status-${chk10Status}">${chk10Status === 'ok' ? 'Passa' : 'Não passa'}</span></td>
          </tr>` : ''}
          ${hasIssues(grouped.conteudo) ? `
          <tr>
            <td>Conteúdo</td>
            <td>${calculateConformance(grouped.conteudo)}</td>
            <td><span class="status-${conteudoStatus}">${conteudoStatus === 'ok' ? 'Passa' : 'Não passa'}</span></td>
          </tr>` : ''}
          ${hasIssues(grouped.transacao) ? `
          <tr>
            <td>Transação</td>
            <td>${calculateConformance(grouped.transacao)}</td>
            <td><span class="status-${transacaoStatus}">${transacaoStatus === 'ok' ? 'Passa' : 'Não passa'}</span></td>
          </tr>` : ''}
        </tbody>
      </table>
      
      ${hasIssues({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}) ? '<p><strong>Nota:</strong> Para que uma checklist passe tem de ter uma conformidade superior a 75%.</p>' : ''}
      
      ${getOverallStatus(grouped.declaracao) === 'nok' ? '<p><strong>Nota:</strong> Tome nota que a Declaração de Acessibilidade não se encontra corretamente afixada. Consulte o capítulo “Declaração de acessibilidade” para saber o que tem de corrigir.</p>' : ''}
    </section>

    ${hasIssues(grouped.declaracao) ? `
    <section id="declaracao" class="mb-5 report-section">
      <h3>Declaração de Acessibilidade</h3>
      <p><span class="status-${getOverallStatus(grouped.declaracao)}">${formatStatusForDisplay(getOverallStatus(grouped.declaracao))}</span></p>
      ${generateRequirementsSection(grouped.declaracao, 'declaracao')}
    </section>` : ''}

    ${hasIssues(grouped.automatic) ? `
    <section id="avaliacao-automatica" class="mb-5 report-section">
      <h3>Avaliação automática</h3>
      <p><span class="status-${getOverallStatus(grouped.automatic)}">${formatStatusForDisplay(getOverallStatus(grouped.automatic))}</span></p>
      ${calculateDetailedStats(grouped.automatic, 'Avaliação automática')}
      ${generateRequirementsSection(grouped.automatic, 'automatic')}
    </section>` : ''}

    ${hasIssues({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}) ? `
    <section id="avaliacao-manual" class="mb-5 mt-5 avaliacao-manual-section">
      <h2>Avaliação manual</h2>
      <p><span class="status-${getOverallStatus({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao})}">${formatStatusForDisplay(getOverallStatus({...grouped.chk10, ...grouped.conteudo, ...grouped.transacao}))}</span></p>
      <p>A avaliação manual é feita por inspeção perícial dos diversos requisitos constantes da:</p>
      <ul>
        ${hasIssues(grouped.chk10) ? '<li>checklist <strong>10 aspetos críticos de acessibilidade funcional</strong>;</li>' : ''}
        ${hasIssues(grouped.conteudo) ? '<li>checklist <strong>Conteúdo</strong> (se candidato a Selo Bronze);</li>' : ''}
        ${hasIssues(grouped.transacao) ? '<li>checklist <strong>Transação</strong> (se candidato a Selo Prata).</li>' : ''}
      </ul>

      ${hasIssues(grouped.chk10) ? `
      <div class="checklist-section">
        <h3 id="checklist-10-aspetos">Checklist 10 aspetos</h3>
        <p><span class="status-${getOverallStatus(grouped.chk10)}">${formatStatusForDisplay(getOverallStatus(grouped.chk10))}</span></p>
        ${calculateDetailedStats(grouped.chk10, 'Checklist 10 aspetos')}
        ${generateRequirementsSection(grouped.chk10, 'chk10')}
      </div>` : ''}

      ${hasIssues(grouped.conteudo) ? `
      <div class="checklist-section">
        <h3 id="checklist-conteudo">Checklist Conteúdo</h3>
        <p><span class="status-${getOverallStatus(grouped.conteudo)}">${formatStatusForDisplay(getOverallStatus(grouped.conteudo))}</span></p>
        ${calculateDetailedStats(grouped.conteudo, 'Checklist Conteúdo')}
        ${generateRequirementsSection(grouped.conteudo, 'conteudo')}
      </div>` : ''}

      ${hasIssues(grouped.transacao) ? `
      <div class="checklist-section">
        <h3 id="checklist-transacao">Checklist Transação</h3>
        <p><span class="status-${getOverallStatus(grouped.transacao)}">${formatStatusForDisplay(getOverallStatus(grouped.transacao))}</span></p>
        ${calculateDetailedStats(grouped.transacao, 'Checklist Transação')}
        ${generateRequirementsSection(grouped.transacao, 'transacao')}
      </div>` : ''}
    </section>` : ''}

    ${hasIssues(grouped.outras) ? `
    <section id="outras-violacoes" class="mb-5 report-section">
      <h2>Outras violações</h2>
      ${generateRequirementsSection(grouped.outras, 'outras')}
    </section>` : ''}

    <section id="etiquetas" class="mb-5 report-section">
      <h2>Significado das etiquetas utilizadas</h2>
      <ul>
                                   <li><span class="label-tag label-ok"><span class="sr-only">etiqueta: </span>OK</span> - status OK</li>
                                   <li><span class="label-tag label-melhoria"><span class="sr-only">etiqueta: </span>melhoria</span> - status OK, mas pode melhorar</li>
                                   <li><span class="label-tag label-nok"><span class="sr-only">etiqueta: </span>NOK</span> - status Not OK</li>
                                   <li><span class="label-tag label-na"><span class="sr-only">etiqueta: </span>N/A</span> - status Não Aplicável</li>
                                   <li><span class="label-tag label-requisito"><span class="sr-only">etiqueta: </span>R 1.1</span> - identificação de requisito específico</li>
                                   ${hasIssues(grouped.chk10) ? '<li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk 10 web</span> - checklist 10 Aspetos críticos de acessibilidade funcional</li>' : ''}
                                   ${hasIssues(grouped.conteudo) ? '<li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk conteúdo</span> - checklist Conteúdo</li>' : ''}
                                   ${hasIssues(grouped.transacao) ? '<li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk transação</span> - checklist Transação</li>' : ''}
                                   <li><span class="label-tag label-declaracao"><span class="sr-only">etiqueta: </span>dec a11y</span> - permite construir o capítulo "Declaração de acessibilidade e usabilidade"</li>
                                   <li><span class="label-tag label-auto"><span class="sr-only">etiqueta: </span>av auto</span> - permite construir o capítulo "Avaliação automática"</li>
                                   <li><span class="label-tag label-outras"><span class="sr-only">etiqueta: </span>outras violações</span> - permite construir o capítulo "Outras violações"</li>
      </ul>
    </section>

  </div>

  <footer class="mt-5 pt-4 border-top text-center text-muted" role="contentinfo">
    <div class="container">
      <p>© 2025 AMA - Agência para a Modernização Administrativa, I.P. Todos os Direitos Reservados.</p>
      <p><em lang="en">GitReports v1.0</em> - relatório gerado automaticamente a partir dos <em lang="en">issues</em> do GitHub</p>
    </div>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

  return html;
}

function sortRequirements(requirements) {
  return Object.keys(requirements).sort((a, b) => {
    // Extract numbers from requirement codes like "R 1.1", "R 2.3", etc.
    const getNumbers = (req) => {
      const match = req.match(/R (\d+)\.(\d+)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2])];
      }
      return [999, 999]; // Put non-matching requirements at the end
    };
    
    const [aMajor, aMinor] = getNumbers(a);
    const [bMajor, bMinor] = getNumbers(b);
    
    if (aMajor !== bMajor) {
      return aMajor - bMajor;
    }
    return aMinor - bMinor;
  });
}

function generateRequirementsSection(requirements, checklistType = 'outras') {
  let html = '';
  const sortedRequirements = sortRequirements(requirements);
  for (const requirement of sortedRequirements) {
    const issues = requirements[requirement];
    if (issues.length === 0) continue;
    
    const overallStatus = getRequirementStatus(issues);
    const displayTitle = getRequirementTitle(requirement, checklistType);
    // Use h3 for "outras" to maintain proper heading hierarchy, h4 for others  
    const headingTag = checklistType === 'outras' ? 'h3' : 'h4';
    html += `
      <${headingTag} class="requirement-title" id="req-${checklistType}-${requirement.replace(/\s+/g, '-').toLowerCase()}">${displayTitle}</${headingTag}>
      <div class="requirement-content">
                                   ${(requirement !== 'Declaração de Acessibilidade') ? `<p><span class="status-${overallStatus.toLowerCase()}"><span class="sr-only">etiqueta: </span>${formatStatusForDisplay(overallStatus)}</span></p>` : ''}
        <p>Lista de evidências recolhidas:</p>
    `;
    
    html += '<ul class="evidence-list">';
    issues.forEach(issue => {
      // Create individual label tags with colors
      const labelTags = issue.labels.map(label => {
        const labelName = label.name;
        let labelClass = 'label-tag';
        
        // Determine label color based on content
        if (labelName.includes('chk') || labelName.includes('web')) {
          labelClass += ' label-checklist';
        } else if (labelName.includes('auto')) {
          labelClass += ' label-auto';
        } else if (labelName.includes('dec') || labelName.includes('a11y')) {
          labelClass += ' label-declaracao';
        } else if (labelName.includes('outras') || labelName.includes('violacoes')) {
          labelClass += ' label-outras';
        } else if (labelName.toLowerCase().includes('melhoria')) {
          labelClass += ' label-melhoria';
        } else if (labelName.toLowerCase().match(/^n[\/\.]?a$/i) || labelName.toLowerCase() === 'na') {
          labelClass += ' label-na';
        } else if (labelName.toLowerCase() === 'ok') {
          labelClass += ' label-ok';
        } else if (labelName.toLowerCase() === 'nok') {
          labelClass += ' label-nok';
        } else if (labelName.match(/R \d+\.\d+/)) {
          labelClass += ' label-requisito';
        } else {
          labelClass += ' label-checklist'; // default to purple
        }
        
                                   return `<span class="${labelClass}"><span class="sr-only">etiqueta: </span>${labelName}</span>`;
      }).join('');
      
      html += `
        <li class="evidence-item">
          ${issue.title}<br>
          <div class="evidence-labels">${labelTags}</div><br>
          <a 
            class="github-link" 
            href="${issue.html_url}" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="${issue.title && issue.title.includes(' - ') ? issue.title.split(' - ').slice(1).join(' - ') : issue.title}">
            Consultar detalhe da evidência <span class="sr-only">(${issue.title})</span> (abre no GitHub)
          </a>
        </li>
      `;
    });
    html += '</ul>';
    
    html += '</div>';
  }
  return html;
}

function getRequirementStatus(issues) {
  const statuses = issues.map(issue => issue.status);
  
  // Se todas as issues são NA, o requisito é NA
  if (statuses.every(s => s === 'NA')) {
    return 'na';
  }
  
  // Para requisitos agrupados (múltiplas issues):
  // SÓ é OK se TODAS as issues forem OK (excluindo N/A)
  const applicableStatuses = statuses.filter(s => s !== 'NA');
  
  if (applicableStatuses.length === 0) {
    // Se só há N/A, já foi tratado acima
    return 'na';
  }
  // Requisito só é OK se TODAS as issues aplicáveis forem OK
  if (applicableStatuses.every(s => s === 'OK' || s === 'melhoria')) {
    return 'ok';
  }
  
  // Qualquer issue NOK ou melhoria torna o requisito NOK
  return 'nok';
}

function getOverallStatus(section) {


  const requirements = Object.keys(section);
  if (requirements.length === 0) return 'na';
  
  // Avaliar status por requisito agrupado, não por issue individual
  const requirementStatuses = requirements.map(req => getRequirementStatus(section[req]));
  
  // Se todos os requisitos são NA, retornar 'na'
  if (requirementStatuses.every(s => s === 'na')) return 'na';
  
  // Se todos os requisitos são OK ou NA (mas não só NA), e pelo menos um é OK
  if (requirementStatuses.every(s => s === 'ok' || s === 'na' || s === 'melhoria') && requirementStatuses.some(s => s === 'ok')) return 'ok';
  
  // Caso contrário é NOK
  return 'nok';
}

// Helper function to format status for display
function formatStatusForDisplay(status) {
  if (status === 'na') return 'N/A';
  return status.toUpperCase();
}

function getPassStatus(section) {
  const requirements = Object.keys(section);
  if (requirements.length === 0) return 'não passa';
  
  // Filtrar apenas requisitos aplicáveis (não N/A)
  const applicableRequirements = requirements.filter(req => {
    const status = getRequirementStatus(section[req]);
    return status !== 'na';
  });
  
  if (applicableRequirements.length === 0) return 'não passa';
  
  const passedRequirements = applicableRequirements.filter(req => {
    const status = getRequirementStatus(section[req]);
    return status === 'ok';
  }).length;
  
  const percentage = (passedRequirements / applicableRequirements.length) * 100;
  return percentage > 75 ? 'passa' : 'não passa';
}

function calculateConformance(section) {
  const requirements = Object.keys(section);
  if (requirements.length === 0) return '0% (0/0)';
  
  // Filtrar apenas requisitos aplicáveis (não N/A)
  const applicableRequirements = requirements.filter(req => {
    const status = getRequirementStatus(section[req]);
    return status !== 'na';
  });
  
  if (applicableRequirements.length === 0) return '0% (0/0)';
  
  const passedRequirements = applicableRequirements.filter(req => {
    const status = getRequirementStatus(section[req]);
    return status === 'ok';
  }).length;
  
  const percentage = ((passedRequirements / applicableRequirements.length) * 100).toFixed(1);
  return `${percentage}% (${passedRequirements}/${applicableRequirements.length})`;
}

function calculateDetailedStats(section, checklistName) {
  const requirements = Object.keys(section);
  if (requirements.length === 0) return '';
  
  let okCount = 0;
  let nokCount = 0;
  let naCount = 0;
  
  requirements.forEach(req => {
    const status = getRequirementStatus(section[req]);
    if (status === 'ok') okCount++;
    else if (status === 'nok') nokCount++;
    else if (status === 'na') naCount++;
  });
  
  const passedRequirements = okCount;
  const applicableRequirements = requirements.length - naCount; // Excluir N/A do total
  
  // Se não há requisitos aplicáveis, mostrar 0%
  const percentage = applicableRequirements > 0 ? ((passedRequirements / applicableRequirements) * 100).toFixed(1) : '0.0';
  
  // Para avaliações automáticas, mostrar apenas as ferramentas
  if (checklistName === 'Avaliação automática') {
    return `
    <p><strong>Ferramentas utilizadas:</strong></p>
    <ul>
      <li>AccessMonitor</li>
      <li>RocketValidator</li>
    </ul>
    `;
  }

  // Para outras checklists, mostrar o nível de conformidade
  return `
    <p><strong>Nível de conformidade:</strong></p>
    <ul>
      <li><strong>${checklistName}</strong>: ${percentage}% (${passedRequirements}/${applicableRequirements})
        <ul>
          <li>Requisitos avaliados: ${requirements.length} (${naCount > 0 ? `${naCount} N/A excluído${naCount > 1 ? 's' : ''}, ` : ''}${applicableRequirements} aplicáveis)</li>
          <li>Requisitos OK: ${passedRequirements}</li>
          <li>Requisitos NOK: ${nokCount}</li>
          ${naCount > 0 ? `<li>Requisitos N/A: ${naCount}</li>` : ''}
        </ul>
      </li>
    </ul>
  `;
}

function hasIssues(section) {
  return Object.keys(section).length > 0 && Object.values(section).some(issues => issues.length > 0);
}

function getOverallProjectStatus(grouped) {
  // Check if all manual checklists pass (>75%)
  const checklists = [grouped.chk10, grouped.conteudo, grouped.transacao];
  
  for (const checklist of checklists) {
    if (hasIssues(checklist)) {
      const requirements = Object.keys(checklist);
      
      // Filtrar apenas requisitos aplicáveis (não N/A)
      const applicableRequirements = requirements.filter(req => {
        const status = getRequirementStatus(checklist[req]);
        return status !== 'na';
      });
      
      if (applicableRequirements.length === 0) continue; // Pular se não há requisitos aplicáveis
      
      const passedRequirements = applicableRequirements.filter(req => {
        const status = getRequirementStatus(checklist[req]);
        return status === 'ok';
      }).length;
      
      const percentage = (passedRequirements / applicableRequirements.length) * 100;
      
      if (percentage <= 75) {
        return 'não passa';
      }
    }
  }
  
  // Also check automatic evaluation
  if (hasIssues(grouped.automatic) && getOverallStatus(grouped.automatic) === 'nok') {
    return 'não passa';
  }
  
  // Check declaration if exists
  if (hasIssues(grouped.declaracao) && getOverallStatus(grouped.declaracao) === 'nok') {
    return 'não passa';
  }
  
  return 'passa';
}

function getRequirementTitle(requirement, checklistType) {
  // Map requirement codes to full titles for checklist 10 aspetos
  const chk10Requirements = {
    'R 1.1': 'Requisito 1.1 - O menu de navegação deve estar estruturado como uma lista de opções',
    'R 1.2': 'Requisito 1.2 - É possível selecionar as opções e as subopções do menu quer com rato quer com teclado',
    'R 1.3': 'Requisito 1.3 - As imagens-link, caso existam no menu, devem ter o correspondente equivalente alternativo em texto',
    'R 2.1': 'Requisito 2.1 - Existe um título &lt;h1&gt; marcado na página',
    'R 2.2': 'Requisito 2.2 - Existe uma marcação hierarquizada de títulos e subtítulos na página (&lt;h1&gt;...&lt;h6&gt;)',
    'R 3.1': 'Requisito 3.1 - As células que constituem os cabeçalhos da tabela estão marcadas com o elemento &lt;th&gt;',
    'R 3.2': 'Requisito 3.2 - A legenda da tabela está marcada com o elemento &lt;caption&gt;',
    'R 4.1': 'Requisito 4.1 - Ao clicar com o rato na etiqueta, o cursor surge no respetivo campo de edição',
    'R 4.2': 'Requisito 4.2 - É possível identificar os campos de preenchimento obrigatório quando se usa apenas um leitor de ecrã',
    'R 4.3': 'Requisito 4.3 - É possível localizar e ler as mensagens de erro usando apenas um leitor de ecrã',
    'R 5.1': 'Requisito 5.1 - A imagem ou gráfico tem um equivalente alternativo em texto curto e correto',
    'R 5.2': 'Requisito 5.2 - O gráfico é acompanhado de uma descrição longa',
    'R 5.3': 'Requisito 5.3 - As imagens-link têm um equivalente alternativo correto',
    'R 6.1': 'Requisito 6.1 - No corpo de um documento, o rácio de contraste entre a cor do texto normal (menor que 18 pontos ou menor que 14 pontos negrito) e a cor do fundo é superior a 4,5:1',
    'R 6.2': 'Requisito 6.2 - O rácio de contraste entre a cor do texto de tamanho grande (maior ou igual que 18 pontos ou maior ou igual que 14 pontos negrito) e a cor do fundo é superior a 3:1',
    'R 7.1': 'Requisito 7.1 - Deve ser possível ativar os botões de controlo do leitor quer com o rato quer com o teclado',
    'R 7.2': 'Requisito 7.2 - O vídeo ou o áudio deve conter preferencialmente legendas fechadas sincronizadas. Caso não seja possível, no mínimo, deve disponibilizar-se uma transcrição textual',
    'R 8.1': 'Requisito 8.1 - Quando se retira a CSS, todos os elementos HTML devem alinhar à esquerda',
    'R 8.2': 'Requisito 8.2 - Quando se retira a CSS, a informação aparece numa ordem lógica',
    'R 8.3': 'Requisito 8.3 - Quando se retira a CSS, deve ser possível reconhecer a semântica dos diversos elementos',
    'R 8.4': 'Requisito 8.4 - Quando se retira a CSS, a informação relevante permanece visível',
    'R 8.5': 'Requisito 8.5 - A maquetização da página é feita sem recorrer ao elemento &lt;table&gt;',
    'R 9.1': 'Requisito 9.1 - Quando a caixa de diálogo é aberta, o foco (cursor do Browser) move-se para um elemento dentro da caixa de diálogo',
    'R 9.2': 'Requisito 9.2 - Quando uma caixa de diálogo está aberta, a navegação com teclado (Browser ou Tecnologia de apoio) tem de ficar circunscrita aos elementos que compõem a caixa de diálogo',
    'R 9.3': 'Requisito 9.3 - A caixa de diálogo tem de ter um mecanismo que permita sair ou fechar a caixa, quer através de teclado quer através de um dispositivo apontador',
    'R 9.4': 'Requisito 9.4 - Quando a caixa de diálogo fecha, o foco (cursor do Browser) deve voltar ao elemento interativo que a invocou',
    'R 10.1': 'Requisito 10.1 - Nos ficheiros PDF é possível, no mínimo, extrair o conteúdo textual para formato TXT'
  };

  // Map requirement codes to full titles for checklist conteudo
  const conteudoRequirements = {
    'R 1.1': 'Requisito 1.1 - O sítio Web apresenta um resumo breve do seu propósito, visível sem se fazer scroll',
    'R 1.2': 'Requisito 1.2 - Os termos mais complexos têm uma definição agregada',
    'R 1.3': 'Requisito 1.3 - Cada bloco de conteúdo contém a sua data de atualização',
    'R 1.4': 'Requisito 1.4 - A informação sobre a entidade responsável pelo conteúdo está em todas as páginas',
    'R 2.1': 'Requisito 2.1 - O tipo de letra do corpo do documento é adequado e o tamanho da letra é, no mínimo, de 12 pontos',
    'R 2.2': 'Requisito 2.2 - A informação secundária (datas, autores) utiliza, no mínimo, um tamanho de letra de 10 pontos',
    'R 2.3': 'Requisito 2.3 - Blocos e linhas de texto com largura não superior a 100 caracteres',
    'R 2.4': 'Requisito 2.4 - O espaçamento entre linhas não é inferior a 1.5x o tamanho da letra',
    'R 3.1': 'Requisito 3.1 - Nenhum nível de navegação tem mais de 9 opções',
    'R 3.2': 'Requisito 3.2 - A navegação principal está sempre visível e sempre no mesmo local',
    'R 3.3': 'Requisito 3.3 - As hiperligações de texto não devem ser diferenciadas apenas com base na cor',
    'R 4.1': 'Requisito 4.1 - Os documentos longos têm um índice no topo com hiperligações internas para o mesmo',
    'R 4.2': 'Requisito 4.2 - O layout do sítio Web é adaptável a plataformas móveis sem necessidade de efetuar varrimento horizontal',
    'R 5.1': 'Requisito 5.1 - Não existem elementos interativos acionados apenas com a passagem do rato (hover)',
    'R 5.2': 'Requisito 5.2 - Os elementos interativos têm uma dimensão mínima de 44px CSS (44 pontos) (vertical e horizontal)',
    'R 5.3': 'Requisito 5.3 - Há apenas um botão de ação principal por página e o mesmo encontra-se destacado',
    'R 5.4': 'Requisito 5.4 - Elementos gráficos interativos têm de aparentar ser clicáveis'
  };

  // Map requirement codes to full titles for checklist transacao
  const transacaoRequirements = {
    'R 1.1': 'Requisito 1.1 - A sequência de tabulação entre campos segue a sequência de preenchimento',
    'R 1.2': 'Requisito 1.2 - Os formulários com mais de 2 ecrãs de altura devem ser distribuídos por várias páginas',
    'R 1.3': 'Requisito 1.3 - Os formulários com mais de uma página têm a sequência de passos ilustrada',
    'R 2.1': 'Requisito 2.1 - O tamanho dos campos deve refletir o tamanho previsível dos dados',
    'R 2.2': 'Requisito 2.2 - É usada revelação progressiva em vez de campos inativos',
    'R 2.3': 'Requisito 2.3 - As legendas dos campos são breves e claras',
    'R 2.4': 'Requisito 2.4 - Campos obrigatórios devem ser claramente indicados como tal',
    'R 3.1': 'Requisito 3.1 - Em ações longas, o sistema deve indicar o que está a acontecer',
    'R 3.2': 'Requisito 3.2 - Deve ser confirmado o sucesso da transação/envio de informação',
    'R 4.1': 'Requisito 4.1 - A informação já introduzida deve poder ser corrigida a qualquer momento',
    'R 4.2': 'Requisito 4.2 - As ações destrutivas nunca devem ser permanentes; deve ser sempre possível desfazer a operação',
    'R 4.3': 'Requisito 4.3 - As mensagens de erro são claramente identificadas junto aos campos de origem',
    'R 4.4': 'Requisito 4.4 - As mensagens de erro devem mostrar os passos concretos para a resolução dos mesmos'
  };

  // Map requirement codes to full titles for checklist automatic
  const automaticRequirements = {
    'R 1.1': 'Requisito 1.1 - Pontuação média da amostra no AccessMonitor',
    'R 1.2': 'Requisito 1.2 - Contabilização das páginas com nota inferior a 9 no AccessMonitor',
    'R 1.3': 'Requisito 1.3 - Verificação da amostra num segundo validador (e.g. RocketValidator)'
  };

  // Return full title based on checklist type
  if (checklistType === 'chk10' && chk10Requirements[requirement]) {
    return chk10Requirements[requirement];
  }
  
  if (checklistType === 'conteudo' && conteudoRequirements[requirement]) {
    return conteudoRequirements[requirement];
  }
  
  if (checklistType === 'transacao' && transacaoRequirements[requirement]) {
    return transacaoRequirements[requirement];
  }
  
  if (checklistType === 'automatic' && automaticRequirements[requirement]) {
    return automaticRequirements[requirement];
  }
  
  return requirement;
}

function downloadFile(content, filename) {
  const blob = new Blob([content], {type: 'text/html'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 