// const { GITHUB_TOKEN, GITHUB_OWNER } = require('../config-local.js');

const { GITHUB_TOKEN, GITHUB_OWNER } = window.APP_CONFIG;

document.getElementById('generateReportBtn').addEventListener('click', generateReport);
document.getElementById('generateDeclarationBtn').addEventListener('click', generateDeclarationReport);

// Auto-load repositories when page loads
document.addEventListener('DOMContentLoaded', function () {
  fetchRepositories();

  // Enable buttons when a repository is selected
  const repoSelect = document.getElementById('repoSelect');
  const generateBtn = document.getElementById('generateReportBtn');
  const generateDeclarationBtn = document.getElementById('generateDeclarationBtn');

  repoSelect.addEventListener('change', function () {
    const isRepoSelected = this.value && this.value !== 'Escolha o repositório para gerar o relatório';

    generateBtn.disabled = !isRepoSelected;
    generateDeclarationBtn.disabled = !isRepoSelected;

    if (isRepoSelected) {
      generateBtn.classList.remove('disabled');
      generateDeclarationBtn.classList.remove('disabled');
    } else {
      generateBtn.classList.add('disabled');
      generateDeclarationBtn.classList.add('disabled');
    }
  });
});

async function fetchAll(url) {
  let allItems = [];
  let nextUrl = url;
  let pageCount = 0;
  const maxPages = 50; // Safety limit

  while (nextUrl && pageCount < maxPages) {
    console.log(`Fetching page ${pageCount + 1}: ${nextUrl}`);
    const response = await fetch(nextUrl, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });

    if (!response.ok) {
      throw new Error(`Erro na API GitHub (${response.status}): ${response.statusText}`);
    }

    const items = await response.json();
    if (Array.isArray(items)) {
      allItems = allItems.concat(items);
    } else {
      console.warn('Items returned from GitHub is not an array:', items);
      if (items.message) throw new Error(`Erro da API GitHub: ${items.message}`);
      break;
    }

    // Parse Link header
    const linkHeader = response.headers.get('Link');
    const currentUrl = nextUrl;
    nextUrl = null;

    if (linkHeader) {
      const links = linkHeader.split(',');
      const nextLink = links.find(link => link.includes('rel="next"'));
      if (nextLink) {
        const match = nextLink.match(/<(.*)>/);
        if (match && match[1] !== currentUrl) {
          nextUrl = match[1];
        }
      }
    }
    pageCount++;
  }

  if (pageCount >= maxPages) {
    console.warn('Atingido o limite máximo de páginas de resultados.');
  }

  return allItems;
}


async function fetchRepositories() {
  const repoSelect = document.getElementById('repoSelect');
  const generateBtn = document.getElementById('generateReportBtn');
  const generateDeclarationBtn = document.getElementById('generateDeclarationBtn');

  try {
    // Show loading state
    repoSelect.innerHTML = '<option value="">A carregar repositórios...</option>';
    repoSelect.disabled = true;
    generateBtn.disabled = true;
    generateBtn.classList.add('disabled');
    generateDeclarationBtn.disabled = true;
    generateDeclarationBtn.classList.add('disabled');

    const url = `https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=100&sort=name`;
    const repos = await fetchAll(url);

    // Filter repositories that start with "Report_" or "reports_" (case insensitive)
    const reportRepos = repos.filter(repo =>
      repo.name.toLowerCase().startsWith('report_') ||
      repo.name.toLowerCase().startsWith('reports_')
    );

    // Populate select with filtered repositories
    let options = '<option value="">Escolha o repositório para gerar o relatório</option>';
    reportRepos.forEach(repo => {
      options += `<option value="${repo.name}">${repo.name}</option>`;
    });

    repoSelect.innerHTML = options;
    repoSelect.disabled = false;
    // Keep buttons disabled until a repository is selected
    generateBtn.disabled = true;
    generateBtn.classList.add('disabled');
    generateDeclarationBtn.disabled = true;
    generateDeclarationBtn.classList.add('disabled');

  } catch (error) {
    console.error('Erro ao carregar repositórios:', error);
    repoSelect.innerHTML = '<option value="">Erro ao carregar repositórios</option>';
    repoSelect.disabled = false;
  }
}




function sanitizeValue(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes('{{')) return null;
  return trimmed;
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
    const ownerMatch = content.match(/[-*]\s*Propriedade:\s*([^\n\r]+)/i) ||
      content.match(/Propriedade:\s*([^\n\r]+)/i) ||
      content.match(/[-*]\s*Proprietário:\s*([^\n\r]+)/i) ||
      content.match(/Proprietário:\s*([^\n\r]+)/i);

    // Extract seal type (candidatura a)
    const sealMatch = content.match(/[-*]\s*Candidatura:\s*([^\n\r]+)/i) ||
      content.match(/Candidatura:\s*([^\n\r]+)/i) ||
      content.match(/[-*]\s*Candidatura a:\s*([^\n\r]+)/i) ||
      content.match(/Candidatura a:\s*([^\n\r]+)/i);

    // Extract creation date
    const creationDateMatch = content.match(/[-*]\s*Data de criação:\s*([^\n\r]+)/i) ||
      content.match(/Data de criação:\s*([^\n\r]+)/i);

    // Extract last update date
    const lastUpdateMatch = content.match(/[-*]\s*Última atualização:\s*([^\n\r]+)/i) ||
      content.match(/Última atualização:\s*([^\n\r]+)/i);

    const extractedInfo = {
      date: dateMatch ? sanitizeValue(dateMatch[1] || dateMatch[2] || dateMatch[3]) : null,
      organization: sanitizeValue(organizationMatch ? organizationMatch[1] : null),
      url: sanitizeValue(urlMatch ? urlMatch[1] : null),
      owner: sanitizeValue(ownerMatch ? ownerMatch[1] : null),
      sealType: sanitizeValue(sealMatch ? sealMatch[1] : null),
      creationDate: sanitizeValue(creationDateMatch ? creationDateMatch[1] : null),
      lastUpdate: sanitizeValue(lastUpdateMatch ? lastUpdateMatch[1] : null)
    };
    return extractedInfo;
  } catch (e) {
    console.warn('Failed to fetch README:', e);
    return null;
  }
}

async function fetchIssues(repoName, includeClosedIssues = false) {
  const state = includeClosedIssues ? 'all' : 'open';
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repoName}/issues?state=${state}&per_page=100`;
  return await fetchAll(url);
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
    // Fetch both issues (including closed) and README in parallel
    const [issues, readmeInfo] = await Promise.all([
      fetchIssues(repoName, true), // Include closed issues for calculation
      fetchReadmeInfo(repoName)
    ]);

    statusDiv.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i> A processar dados e gerar relatório...';

    // Criar uma cópia das issues para cálculo de percentagens (incluindo OK)
    const issuesForCalculation = [...issues];
    // Agrupar issues para cálculo (sem filtrar OK)
    const groupedForCalculation = groupIssues(issuesForCalculation, false);

    // Filtrar issues OK para exibição no relatório
    const groupedForDisplay = groupIssues(issues, true); // Filter out OK issues
    const html = generateReportHTML(groupedForDisplay, repoName, readmeInfo, groupedForCalculation);

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

async function generateDeclarationReport() {
  const repoSelect = document.getElementById('repoSelect');
  const repoName = repoSelect.value;
  const statusDiv = document.getElementById('status');
  const generateBtn = document.getElementById('generateDeclarationBtn');

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
    // Fetch both issues (including closed) and README in parallel
    const [issues, readmeInfo] = await Promise.all([
      fetchIssues(repoName, true), // Include closed issues for declaration report
      fetchReadmeInfo(repoName)
    ]);

    statusDiv.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i> A processar dados e gerar relatório...';

    // Criar uma cópia das issues para cálculo de percentagens (incluindo OK)
    const issuesForCalculation = [...issues];
    // Agrupar issues para cálculo (sem filtrar OK)
    const groupedForCalculation = groupIssues(issuesForCalculation, false);

    const grouped = groupIssues(issues, false); // Don't filter out OK issues
    const html = generateReportHTML(grouped, repoName, readmeInfo, groupedForCalculation);

    // Extract number from repo name (e.g., "Report_001" -> "001", "reports_123" -> "123")
    const repoNumberMatch = repoName.match(/(?:reports?)_(\d+)/i);
    const repoNumber = repoNumberMatch ? repoNumberMatch[1].padStart(3, '0') : '001';
    const filename = `declaracao_acessibilidade_${repoNumber}.html`;

    downloadFile(html, filename);

    statusDiv.className = 'status-message status-success';
    statusDiv.innerHTML = `<i class="bi bi-check-circle" aria-hidden="true"></i> Relatório para Declaração de Acessibilidade gerado com sucesso! Consulte a sua pasta de transferências.`;
    statusDiv.setAttribute('aria-live', 'polite');
  } catch (e) {
    statusDiv.className = 'status-message status-error';
    statusDiv.innerHTML = `<i class="bi bi-exclamation-triangle" aria-hidden="true"></i> Erro: ${e.message}`;
    statusDiv.setAttribute('aria-live', 'assertive');
  } finally {
    generateBtn.innerHTML = '<i class="bi bi-download" aria-hidden="true"></i> Relatório para anexar à Declaração (contém OKs)';
    generateBtn.disabled = false;
    generateBtn.classList.remove('disabled');
  }
}

function groupIssues(issues, filterOkIssues = true) {

  const grouped = {
    'chk10': {},
    'conteudo': {},
    'transacao': {},
    'declaracao': {},
    'automatic': {},
    'testesUsabilidade': {},
    'outras': {}
  };

  issues.forEach(issue => {
    // Verificar se issue e labels existem
    if (!issue || !issue.labels || !Array.isArray(issue.labels)) {
      console.warn('Issue malformada ignorada:', issue);
      return;
    }

    // Skip issues with no labels or with "Ok" label (if filterOkIssues is true)
    // Não filtrar issues com label 'ok' para a declaração
    const labels = issue.labels;
    const hasOkLabel = labels.some(l => l.name && l.name.toLowerCase().trim() === 'ok');
    const isDeclaration = labels.some(l => l.name === 'declaracao' || l.name === 'dec a11y');

    if (labels.length === 0 || (filterOkIssues && hasOkLabel && !isDeclaration)) {
      return;
    }

    // Determine checklist type
    let checklistType = 'outras';
    if (labels.some(l => l.name === 'chk 10 web' || l.name === 'chk10')) checklistType = 'chk10';
    else if (labels.some(l => l.name === 'chk conteúdo' || l.name === 'chk conteudo' || l.name === 'conteudo')) checklistType = 'conteudo';
    else if (labels.some(l => l.name === 'chk trans' || l.name === 'chk transacao' || l.name === 'transacao' || l.name === 'chk transação')) checklistType = 'transacao';
    else if (labels.some(l => l.name === 'declaracao' || l.name === 'dec a11y')) checklistType = 'declaracao';
    else if (labels.some(l => l.name === 'automatic' || l.name === 'auto' || l.name === 'av auto' || l.name && l.name.toLowerCase().trim() === 'av auto')) checklistType = 'automatic';
    else if (labels.some(l => l.name === 'testes usabilidade' || l.name === 'testes de usabilidade')) checklistType = 'testesUsabilidade';
    else if (labels.some(l => l.name === 'outras violações' || l.name === 'outras violacoes')) checklistType = 'outras';

    // Find requirement label (R X.X)
    const requirementLabel = labels.find(l => l.name && l.name.match(/R \d+\.\d+/));
    const requirementName = requirementLabel ? requirementLabel.name : null;

    // Determine status - verificar N/A primeiro para evitar classificação incorreta
    let status = 'NOK';

    // Verificar várias variações do label N/A
    const naLabels = labels.filter(l =>
      l.name && (
        l.name.toLowerCase().match(/^n[\/\.]?a$/i) ||
        l.name.toLowerCase() === 'na' ||
        l.name.toLowerCase() === 'n/a' ||
        l.name.toLowerCase() === 'n.a'
      )
    );

    if (naLabels.length > 0) status = 'NA';
    else if (labels.some(l => l.name === 'OK' || (l.name && l.name.toLowerCase() === 'ok'))) status = 'OK';
    else if (labels.some(l =>
      l.name === 'melhoria' ||
      l.name === 'Melhoria' ||
      (l.name && l.name.toLowerCase() === 'melhoria')
    )) status = 'melhoria';

    // Determine group key
    let groupKey;
    if (checklistType === 'declaracao') {
      groupKey = 'declaracao';
    } else if (requirementName) {
      groupKey = requirementName;
    } else {
      // Casos onde não há label de requisito (R X.X)
      if (checklistType === 'outras') groupKey = 'Outras violações';
      else if (checklistType === 'automatic') groupKey = 'Avaliação automática';
      else if (checklistType === 'testesUsabilidade') groupKey = 'Testes de usabilidade';
      else groupKey = 'Outras violações (sem requisito especificado)';
    }

    if (groupKey && !grouped[checklistType][groupKey]) {
      grouped[checklistType][groupKey] = [];
    }
    if (groupKey) {
      grouped[checklistType][groupKey].push({ ...issue, status });
    }
  });

  return grouped;
}

function generateReportHTML(grouped, repoName, readmeInfo = null, groupedForCalculation = null) {
  console.log('Starting generateReportHTML for', repoName);
  const startTime = performance.now();

  try {
    const dataForCalculation = groupedForCalculation || grouped;
    const safeData = {
      chk10: dataForCalculation.chk10 || {},
      conteudo: dataForCalculation.conteudo || {},
      transacao: dataForCalculation.transacao || {},
      declaracao: dataForCalculation.declaracao || {},
      automatic: dataForCalculation.automatic || {},
      testesUsabilidade: dataForCalculation.testesUsabilidade || {},
      outras: dataForCalculation.outras || {}
    };

    const currentDateRaw = new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long' });
    const currentDate = currentDateRaw.charAt(0).toUpperCase() + currentDateRaw.slice(1);
    const reportDate = readmeInfo?.date || currentDate;
    const organization = readmeInfo?.organization || repoName;
    const owner = readmeInfo?.owner ? `Propriedade: ${readmeInfo.owner}` : `Propriedade: Proprietário do ${repoName}`;
    const websiteUrl = readmeInfo?.url || `https://${repoName.toLowerCase()}.gov.pt/`;
    const sealType = readmeInfo?.sealType ? `Candidatura: ${readmeInfo.sealType}` : 'Candidatura: candidatura a selo bronze';

    const lastUpdateDate = new Date();
    const formattedDate = lastUpdateDate.toLocaleDateString('pt-PT', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const lastUpdate = `Última atualização: ${formattedDate}`;

    let progressInfo = { percentage: 0 };
    try {
      progressInfo = calculateProgress(safeData);
      console.log('Progress calculated:', progressInfo);
    } catch (e) {
      console.warn('Error calculating progress:', e);
    }

    const htmlParts = [];

    // Head and CSS
    htmlParts.push(`<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório ${organization}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    .skip-link { position: absolute; top: -40px; left: 0; background: #000; color: white; padding: 8px; z-index: 100; transition: top 0.3s ease; }
    .skip-link:focus { top: 0; }
    .visually-hidden-focusable:not(:focus):not(:focus-within) { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }
    body { 
      background-color: #ffffff; 
      padding-top: 2rem; 
      padding-bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .container { 
      max-width: 900px;
      width: 100%;
      background-color: transparent; 
      padding-top: 1rem;
      padding-bottom: 2rem;
      padding-left: 1rem;
      padding-right: 1rem;
    }
    .report-footer {
      width: 100%;
      align-self: stretch;
      background-color: #ffffff;
      color: #4a5568;
      text-align: center;
      padding: 1.25rem 1rem;
      font-size: 0.8rem;
      border-top: 1px solid #e0e0e0;
      margin-top: auto;
    }
    .report-footer p { margin: 0.2rem 0; }
    h1 { font-size: 1.8rem; margin-bottom: 1.5rem; }
    .status-ok { color: #ffffff; background-color: #0E8A16; padding: 0.25rem 0.5rem; border-radius: 50px; font-weight: 500; display: inline-block; }
    .status-nok { color: #ffffff; background-color: #B60205; padding: 0.25rem 0.5rem; border-radius: 50px; font-weight: 500; display: inline-block; }
    .status-melhoria { color: #856404; background-color: #fff3cd; padding: 0.25rem 0.5rem; border-radius: 50px; font-weight: 500; display: inline-block; }
    .status-na { color: #000; background-color: #C2E0C6; padding: 0.25rem 0.5rem; border-radius: 50px; font-weight: 500; display: inline-block; }
    .requirement-title { margin-top: 2rem; }
    .requirement-title h4, .requirement-title h3 { color: #000; }
    .mb-4 ul li a { color: #1e3a8a; text-decoration: none; }
    .mb-4 ul li a:hover { color: #1e40af; text-decoration: underline; }
    summary.index-summary { display: list-item; font-weight: 700; font-size: 1.25rem !important; color: #000; cursor: pointer; }
    summary.index-summary:focus { outline: 3px solid #333399; outline-offset: 2px; }
    .evidence-list { list-style-type: disc; padding-left: 1.5rem; margin: 1rem 0; }
    .evidence-item { margin: 0.5rem 0; padding: 0.5rem 0.5rem 0.5rem 1.5rem; border-radius: 4px; background-color: #f6f6f6; color: #000; list-style: none; margin-left: -1.5rem; }
    .evidence-item p { margin: 1.5rem 0 1rem 0; }
    .evidence-labels { font-size: 0.85em; display: inline-flex; flex-wrap: wrap; gap: 0.25rem; }
    .label-tag { padding: 0.125rem 0.375rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 500; color: white; display: inline-block; margin-right: 0.25rem; }
    .label-checklist { background-color: #5319E7; }
    .label-auto { background-color: #5319E7; }
    .label-declaracao { background-color: #5319E7; }
    .label-outras { background-color: #5319E7; }
    .label-melhoria { background-color: #FBCA04; color: #000; }
    .label-na { background-color: #C2E0C6; color: #000; }
    .label-ok { background-color: #0E8A16; }
    .label-nok { background-color: #B60205; }
    .label-requisito { background-color: #0052CC; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .report-section { border-bottom: 3px solid #000000; padding-bottom: 2rem; margin-bottom: 2rem; }
    .report-section:last-of-type { border-bottom: none; }
    .checklist-section { border-bottom: 3px solid #000000; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
    .avaliacao-manual-section { padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
    .checklist-section:last-of-type { border-bottom: none; }
    .issue-link { color: #1e3a8a; text-decoration: none; }
    .issue-link:hover { text-decoration: underline; color: #1e40af; }
    table.table caption { caption-side: top; text-align: left; padding-bottom: 0.5rem; font-weight: 600; color: #000; }
  </style>
</head>
<body>
  <a href="#conteudo-principal" class="skip-link visually-hidden-focusable">Saltar para o conteúdo principal</a>
  <div class="container mt-4" id="conteudo-principal">
    <header class="mb-4">
      <h1>Relatório Avaliação da Candidatura da ${organization}</h1>
    </header>

    <section class="mb-4">
      <ul>
        <li>Avaliação feita por: ARTE. I.P. - Núcleo de Experiência e Usabilidade</li>
        ${readmeInfo?.creationDate ? `<li>Data de criação: ${readmeInfo.creationDate}</li>` : ''}
        <li>${lastUpdate}</li>
        <li>URL: <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${websiteUrl}</a></li>
        <li>${owner}</li>
        <li>${sealType}</li>
        <li>Progresso (% de requisitos auditados): ${progressInfo.percentage}%</li>
      </ul>
    </section>`);

    // INDEX
    console.log('Generating index...');
    try {
      let indexHtml = `
    <nav class="mb-4 report-section" aria-label="Índice">
      <details open>
        <summary class="index-summary">Índice</summary>
        <ul>
          <li><a href="#introducao">Introdução</a></li>
          ${hasIssues(grouped.declaracao) ? '<li><a href="#declaracao">Declaração de Acessibilidade</a></li>' : ''}
          ${hasIssues(grouped.automatic) ? '<li><a href="#avaliacao-automatica">Avaliação automática</a></li>' : ''}
          ${hasIssues({ ...grouped.chk10, ...grouped.conteudo, ...grouped.transacao }) ? `
          <li><a href="#avaliacao-manual">Avaliação manual</a>
            <ul class="indent-list">
              ${hasIssues(grouped.chk10) ? `
              <li><a href="#checklist-10-aspetos">Checklist 10 aspetos</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.chk10).filter(req => grouped.chk10[req].length > 0).map(req => `<li><a href="#req-chk10-${req.replace(/\s+/g, '-').toLowerCase()}">${plainTitle(getRequirementTitle(req, 'chk10'))}</a></li>`).join('')}
                </ul>
              </li>` : ''}
              ${hasIssues(grouped.conteudo) ? `
              <li><a href="#checklist-conteudo">Checklist Conteúdo</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.conteudo).filter(req => grouped.conteudo[req].length > 0).map(req => `<li><a href="#req-conteudo-${req.replace(/\s+/g, '-').toLowerCase()}">${plainTitle(getRequirementTitle(req, 'conteudo'))}</a></li>`).join('')}
                </ul>
              </li>` : ''}
              ${hasIssues(grouped.transacao) ? `
              <li><a href="#checklist-transacao">Checklist Transação</a>
                <ul class="indent-list">
                  ${sortRequirements(grouped.transacao).filter(req => grouped.transacao[req].length > 0).map(req => `<li><a href="#req-transacao-${req.replace(/\s+/g, '-').toLowerCase()}">${plainTitle(getRequirementTitle(req, 'transacao'))}</a></li>`).join('')}
                </ul>
              </li>` : ''}
              ${hasIssues(grouped.outras) ? '<li><a href="#outras-violacoes">Outras violações</a></li>' : ''}
            </ul>
          </li>` : ''}
          ${hasIssues(grouped.testesUsabilidade) ? '<li><a href="#testes-usabilidade">Testes de usabilidade</a></li>' : ''}
          <li><a href="#etiquetas">Significado das etiquetas utilizadas</a></li>
        </ul>
      </details>
    </nav>`;
      htmlParts.push(indexHtml);
    } catch (e) {
      console.error('Error generating index:', e);
      htmlParts.push('<p class="alert alert-danger">Erro ao gerar índice do relatório.</p>');
    }

    // INTRODUCAO
    console.log('Generating introduction...');
    try {
      const overallStatus = getOverallProjectStatus(safeData);
      const autoStatus = getOverallStatus(safeData.automatic);

      let introHtml = `
    <section id="introducao" class="mb-5 report-section">
      <h2>Introdução</h2>
      <p>O website <a href="${websiteUrl}" target="_blank">${websiteUrl}</a> <strong><span class="status-${overallStatus === 'passa' ? 'ok' : 'nok'}"><span class="sr-only">etiqueta: </span>${overallStatus}</span></strong> nos requisitos mínimos do Selo de Usabilidade e Acessibilidade.</p>

      <table class="table table-bordered">
        <caption>Estado das avaliações efetuadas</caption>
        <thead><tr><th>Tipo de avaliação</th><th>Estado</th></tr></thead>
        <tbody>
          <tr><td>Avaliação Automática</td><td><span class="status-${autoStatus}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(autoStatus)}</span></td></tr>
          <tr><td>Avaliação Manual</td><td><span class="status-${getManualOverallStatus(safeData)}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(getManualOverallStatus(safeData))}</span>${getManualOverallStatus(safeData) === 'ok' ? getImprovementText({ ...safeData.chk10, ...safeData.conteudo, ...safeData.transacao }) : ''}</td></tr>
        </tbody>
      </table>`;

      if (hasIssues({ ...safeData.chk10, ...safeData.conteudo, ...safeData.transacao })) {
        introHtml += `
      <p>Das avaliações manuais efetuadas obtiveram-se os resultados que se sintetizam na tabela seguinte.</p>
      <table class="table table-bordered">
        <caption>Níveis de conformidade das avaliações manuais</caption>
        <thead><tr><th>Checklist</th><th>Conformidade alcançada</th><th>Resultado</th></tr></thead>
        <tbody>
          ${hasIssues(safeData.chk10) ? `<tr><td>10 aspetos</td><td>${calculateConformance(safeData.chk10)}</td><td><span class="status-${getPassStatus(safeData.chk10) === 'passa' ? 'ok' : 'nok'}"><span class="sr-only">etiqueta: </span>${getPassStatus(safeData.chk10) === 'passa' ? 'Passa' : 'Não passa'}</span></td></tr>` : ''}
          ${hasIssues(safeData.conteudo) ? `<tr><td>Conteúdo</td><td>${calculateConformance(safeData.conteudo)}</td><td><span class="status-${getPassStatus(safeData.conteudo) === 'passa' ? 'ok' : 'nok'}"><span class="sr-only">etiqueta: </span>${getPassStatus(safeData.conteudo) === 'passa' ? 'Passa' : 'Não passa'}</span></td></tr>` : ''}
          ${hasIssues(safeData.transacao) ? `<tr><td>Transação</td><td>${calculateConformance(safeData.transacao)}</td><td><span class="status-${getPassStatus(safeData.transacao) === 'passa' ? 'ok' : 'nok'}"><span class="sr-only">etiqueta: </span>${getPassStatus(safeData.transacao) === 'passa' ? 'Passa' : 'Não passa'}</span></td></tr>` : ''}
        </tbody>
      </table>
      <p><strong>Nota:</strong> para passar os requisitos do Selo é necessário alcançar um nível de conformidade superior ou igual a 75% em cada uma das 3 checklists.</p>`;
      }

      if (getOverallStatus(safeData.declaracao) === 'nok') {
        introHtml += '<p>Verificámos também que a Declaração de Acessibilidade não se encontra corretamente afixada. Consulte o capítulo "Declaração de acessibilidade" para saber o que tem de corrigir.</p>';
      }

      introHtml += `</section>`;
      htmlParts.push(introHtml);
    } catch (e) {
      console.error('Error generating introduction:', e);
      htmlParts.push('<p class="alert alert-danger">Erro ao gerar introdução do relatório.</p>');
    }

    // DECLARACAO
    if (hasIssues(grouped.declaracao)) {
      console.log('Generating declaration section...');
      try {
        const declStatus = getOverallStatus(safeData.declaracao);
        let declHtml = `
    <section id="declaracao" class="mb-5 report-section">
      <h2>Declaração de Acessibilidade</h2>
      <p><span class="status-${declStatus}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(declStatus)}</span></p>
      <p>De acordo com o <a href="https://www.acessibilidade.gov.pt/blogue/categoria-acessibilidade/dl-n-o-83-2018-acessibilidade-dos-sitios-web-e-das-aplicacoes-moveis/#n8" target="_blank" rel="noopener noreferrer">artigo 8º do DL n.º 83/2018</a>, todos os sítios web e todas as aplicações móveis têm de ostentar uma Declaração de Acessibilidade. A Declaração é o documento na qual a organização evidencia o trabalho levado a efeito para tornar os seus conteúdos e serviços digitais mais acessíveis, disponibilizando ainda contactos para ajuda adicional.</p>
      <p>Lista de evidências recolhidas:</p>
      <ul class="evidence-list">`;

        Object.values(grouped.declaracao).flat().forEach(issue => {
          const labelTags = issue.labels.map(label => {
            const labelName = label.name;
            let labelClass = 'label-tag';
            if (labelName.includes('dec') || labelName.includes('a11y')) labelClass += ' label-declaracao';
            else if (labelName.toLowerCase().includes('melhoria')) labelClass += ' label-melhoria';
            else if (labelName.toLowerCase().match(/^n[\/\.]?a$/i) || labelName.toLowerCase() === 'na') labelClass += ' label-na';
            else if (labelName.toLowerCase() === 'ok') labelClass += ' label-ok';
            else if (labelName.toLowerCase() === 'nok') labelClass += ' label-nok';
            else labelClass += ' label-checklist';
            return `<span class="${labelClass}"><span class="sr-only">etiqueta: </span>${labelName}</span>`;
          }).join('');

          declHtml += `
            <li class="evidence-item">
              <p><span class="visually-hidden">evidência: </span><a href="${issue.html_url}" class="issue-link" target="_blank" rel="noopener noreferrer">issue #${issue.number}</a> <strong>${getCleanIssueTitle(issue)}</strong></p>
              <div class="evidence-labels">${labelTags}</div>
              ${processIssueContent(issue)}
            </li>`;
        });

        declHtml += `</ul></section>`;
        htmlParts.push(declHtml);
      } catch (e) {
        console.error('Error generating declaration section:', e);
        htmlParts.push('<p class="alert alert-danger">Erro ao gerar seção de Declaração de Acessibilidade.</p>');
      }
    }

    // AVALIACAO AUTOMATICA
    if (hasIssues(grouped.automatic)) {
      console.log('Generating automatic evaluation section...');
      try {
        const autoStatus = getOverallStatus(safeData.automatic);
        let autoHtml = `
    <section id="avaliacao-automatica" class="mb-5 report-section">
      <h2>Avaliação automática</h2>
      <p><span class="status-${autoStatus}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(autoStatus)}</span></p>
      <p>Para a produção das evidências do presente capítulo, foram utilizadas ferramentas automatizadas de avaliação de requisitos de acessibilidade de acordo com a norma WCAG 2.1 'AA'. A amostra em análise pelas ferramentas é composta pela Homepage mais todas as páginas diretamente hiperligadas por ela, pertencentes ao domínio.</p>
      ${calculateDetailedStats(safeData.automatic, 'Avaliação automática')}
      <p>Lista de evidências recolhidas:</p>
      <ul class="evidence-list">`;

        Object.values(grouped.automatic).flat().forEach(issue => {
          const labelTags = issue.labels.map(label => {
            const labelName = label.name;
            let labelClass = 'label-tag';
            if (labelName.includes('auto')) labelClass += ' label-auto';
            else if (labelName.toLowerCase().includes('melhoria')) labelClass += ' label-melhoria';
            else if (labelName.toLowerCase().match(/^n[\/\.]?a$/i) || labelName.toLowerCase() === 'na') labelClass += ' label-na';
            else if (labelName.toLowerCase() === 'ok') labelClass += ' label-ok';
            else if (labelName.toLowerCase() === 'nok') labelClass += ' label-nok';
            else if (labelName.match(/R \d+\.\d+/)) labelClass += ' label-requisito';
            else labelClass += ' label-checklist';
            return `<span class="${labelClass}"><span class="sr-only">etiqueta: </span>${labelName}</span>`;
          }).join('');

          autoHtml += `
            <li class="evidence-item">
              <p><span class="visually-hidden">evidência: </span><a href="${issue.html_url}" class="issue-link" target="_blank" rel="noopener noreferrer">issue #${issue.number}</a> <strong>${getCleanIssueTitle(issue)}</strong></p>
              <div class="evidence-labels">${labelTags}</div>
              ${processIssueContent(issue)}
            </li>`;
        });

        autoHtml += `</ul></section>`;
        htmlParts.push(autoHtml);
      } catch (e) {
        console.error('Error generating automatic evaluation section:', e);
        htmlParts.push('<p class="alert alert-danger">Erro ao gerar seção de Avaliação Automática.</p>');
      }
    }

    // AVALIACAO MANUAL
    if (hasIssues({ ...safeData.chk10, ...safeData.conteudo, ...safeData.transacao })) {
      console.log('Generating manual evaluation section...');
      try {
        const manualStatus = getManualOverallStatus(safeData);
        let manualHtml = `
    <section id="avaliacao-manual" class="mb-5 mt-5 avaliacao-manual-section">
      <h2>Avaliação manual</h2>
      <p><span class="status-${manualStatus}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(manualStatus)}</span>${manualStatus === 'ok' ? getImprovementText({ ...safeData.chk10, ...safeData.conteudo, ...safeData.transacao }) : ''}</p>
      <p>A avaliação manual é feita por inspeção perícial dos diversos requisitos constantes da:</p>
      <ul>
        ${hasIssues(safeData.chk10) ? '<li>checklist <strong>10 aspetos críticos de acessibilidade funcional</strong>;</li>' : ''}
        ${hasIssues(safeData.conteudo) ? '<li>checklist <strong>Conteúdo</strong> (se candidato a Selo Bronze);</li>' : ''}
        ${hasIssues(safeData.transacao) ? '<li>checklist <strong>Transação</strong> (se candidato a Selo Prata).</li>' : ''}
      </ul>
      <p>Sempre que os auditores localizam uma falha grave de um requisito de acessibilidade que, embora não faça parte do esquema de requisitos do Selo, se enquadre no âmbito das violações das WCAG 2.1 'AA' do W3C, tal referência é anotada em "Outras violações" do presente capítulo. Apesar destas violações não se apresentarem com carácter vinculativo no esquema de requisitos do Selo, recomenda-se que as mesmas sejam corrigidas.</p>`;

        // CHK10
        if (hasIssues(safeData.chk10)) {
          manualHtml += `
      <div class="checklist-section">
        <h3 id="checklist-10-aspetos">Checklist 10 aspetos</h3>
        <p><span class="status-${getOverallStatus(safeData.chk10)}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(getOverallStatus(safeData.chk10))}</span>${getOverallStatus(safeData.chk10) === 'ok' ? getImprovementText(safeData.chk10) : ''}</p>
        ${calculateDetailedStats(safeData.chk10, 'Checklist 10 aspetos')}
        ${generateRequirementsSection(grouped.chk10, 'chk10')}
      </div>`;
        }

        // CONTEUDO
        if (hasIssues(safeData.conteudo)) {
          manualHtml += `
      <div class="checklist-section">
        <h3 id="checklist-conteudo">Checklist Conteúdo</h3>
        <p><span class="status-${getOverallStatus(safeData.conteudo)}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(getOverallStatus(safeData.conteudo))}</span>${getOverallStatus(safeData.conteudo) === 'ok' ? getImprovementText(safeData.conteudo) : ''}</p>
        ${calculateDetailedStats(safeData.conteudo, 'Checklist Conteúdo')}
        ${generateRequirementsSection(grouped.conteudo, 'conteudo')}
      </div>`;
        }

        // TRANSACAO
        if (hasIssues(safeData.transacao)) {
          manualHtml += `
      <div class="checklist-section">
        <h3 id="checklist-transacao">Checklist Transação</h3>
        <p><span class="status-${getOverallStatus(safeData.transacao)}"><span class="sr-only">etiqueta: </span>${formatStatusForChecklistDisplay(getOverallStatus(safeData.transacao))}</span>${getOverallStatus(safeData.transacao) === 'ok' ? getImprovementText(safeData.transacao) : ''}</p>
        ${calculateDetailedStats(safeData.transacao, 'Checklist Transação')}
        ${generateRequirementsSection(grouped.transacao, 'transacao')}
      </div>`;
        }

        // OUTRAS
        if (hasIssues(grouped.outras)) {
          manualHtml += `
      <div class="checklist-section">
        <h3 id="outras-violacoes">Outras violações</h3>
        ${generateRequirementsSection(grouped.outras, 'outras')}
      </div>`;
        }

        manualHtml += `</section>`;
        htmlParts.push(manualHtml);
      } catch (e) {
        console.error('Error generating manual evaluation section:', e);
        htmlParts.push('<p class="alert alert-danger">Erro ao gerar seção de Avaliação Manual.</p>');
      }
    }

    // TESTES USABILIDADE
    if (hasIssues(safeData.testesUsabilidade)) {
      console.log('Generating usability tests section...');
      try {
        let usabilityHtml = `
    <section id="testes-usabilidade" class="mb-5 report-section">
      <h2>Testes de usabilidade</h2>
      ${generateRequirementsSection(grouped.testesUsabilidade, 'testesUsabilidade')}
    </section>`;
        htmlParts.push(usabilityHtml);
      } catch (e) {
        console.error('Error generating usability tests section:', e);
      }
    }

    // ETIQUETAS
    htmlParts.push(`
    <section id="etiquetas" class="mb-5 report-section">
      <h2>Significado das etiquetas utilizadas</h2>
      <ul>
        <li><span class="label-tag label-ok"><span class="sr-only">etiqueta: </span>OK</span> - status OK</li>
        <li><span class="label-tag label-melhoria"><span class="sr-only">etiqueta: </span>melhoria</span> - status OK, mas pode melhorar</li>
        <li><span class="label-tag label-nok"><span class="sr-only">etiqueta: </span>NOK</span> - status Not OK</li>
        <li><span class="label-tag label-na"><span class="sr-only">etiqueta: </span>N/A</span> - status Não Aplicável</li>
        <li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk10 web</span> - checklist 10 Aspetos críticos de acessibilidade funcional</li>
        <li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk conteúdo</span> - checklist Conteúdo</li>
        <li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>chk transação</span> - checklist Transação</li>
        <li><span class="label-tag label-outras"><span class="sr-only">etiqueta: </span>outras violações</span> - permite construir o subcapítulo "Outras violações", o qual integra o capítulo "Avaliações manuais"</li>
        <li><span class="label-tag label-declaracao"><span class="sr-only">etiqueta: </span>dec a11y</span> - permite construir o capítulo "Declaração de acessibilidade e usabilidade"</li>
        <li><span class="label-tag label-auto"><span class="sr-only">etiqueta: </span>av auto</span> - permite construir o capítulo "Avaliação automática"</li>
        <li><span class="label-tag label-checklist"><span class="sr-only">etiqueta: </span>testes usabilidade</span> - permite construir o capítulo "Testes de usabilidade"</li>
      </ul>
    </section>`);

    // FOOTER (fora do container, largura 100%)
    htmlParts.push(`
  </div>
  <footer class="report-footer">
    <p>© 2026 ARTE - Agência para a Reforma Tecnológica do Estado, I.P. Todos os Direitos Reservados.</p>
    <p><em lang="en">GitReports v1.0</em> - relatório gerado automaticamente a partir dos <em lang="en">issues</em> do GitHub</p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`);

    const finalHtml = htmlParts.join('\n');
    const endTime = performance.now();
    console.log(`Finished generateReportHTML successfully in ${Math.round(endTime - startTime)}ms. Total size: ${finalHtml.length} chars.`);
    return finalHtml;
  } catch (e) {
    console.error('Fatal error in generateReportHTML:', e);
    throw e;
  }
}

function sortRequirements(requirements) {
  if (!requirements) return [];
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
  if (!requirements) return '';
  let html = '';
  const sortedRequirements = sortRequirements(requirements);

  for (const requirement of sortedRequirements) {
    try {
      const issues = requirements[requirement];
      if (!issues || issues.length === 0) continue;

      const overallStatus = getRequirementStatus(issues);
      const displayTitle = getRequirementTitle(requirement, checklistType);
      // Use h4 for all requirement titles to maintain proper heading hierarchy

      // Only add the heading if there's a title to display
      if (displayTitle) {
        const reqId = `req-${checklistType}-${requirement.replace(/\s+/g, '-').toLowerCase()}`;
        html += `<h4 class="requirement-title" id="${reqId}">${plainTitle(displayTitle)}</h4>\n`;
      }

      html += `<div class="requirement-content">\n`;
      if (requirement !== 'declaracao') {
        const statusClass = `status-${overallStatus.toLowerCase()}`;
        const statusText = formatStatusForRequirementDisplay(overallStatus, issues);
        const improvementText = overallStatus === 'ok' ? getImprovementText(issues) : '';
        html += `<p><span class="${statusClass}"><span class="sr-only">etiqueta: </span>${statusText}</span>${improvementText}</p>\n`;
      }

      html += `<p>Lista de evidências recolhidas:</p>\n<ul class="evidence-list">\n`;
      // Verificar se issues é um array antes de iterar
      if (Array.isArray(issues)) {
        issues.forEach(issue => {
          // Verificar se issue existe e tem labels
          if (issue && Array.isArray(issue.labels)) {
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
              } else if (labelName.includes('testes') && labelName.includes('usabilidade')) {
                labelClass += ' label-checklist';
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
                <p><span class="visually-hidden">evidência: </span><a href="${issue.html_url}" class="issue-link" target="_blank" rel="noopener noreferrer">issue #${issue.number}</a> <strong>${getCleanIssueTitle(issue)}</strong></p>
                <div class="evidence-labels">${labelTags}</div>
                ${processIssueContent(issue)}
              </li>`;
          }
        });
      }
      html += '</ul>\n</div>\n';
    } catch (e) {
      console.error(`Error in generateRequirementsSection for ${requirement}:`, e);
      html += `<p class="alert alert-warning">Erro ao gerar detalhes do requisito: ${requirement}</p>`;
    }
  }
  return html;
}

function getRequirementStatus(issues) {
  // Verificar se issues é um array
  if (!Array.isArray(issues)) {
    return 'na'; // Se não for um array, retornar 'na'
  }

  // Se não houver issues, retornar 'na'
  if (issues.length === 0) {
    return 'na';
  }

  const statuses = issues.map(issue => issue && issue.status ? issue.status : 'NA');

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
  // Requisito é OK se TODAS as issues aplicáveis forem OK ou melhoria
  if (applicableStatuses.every(s => s === 'OK' || s === 'melhoria')) {
    return 'ok';
  }

  // Qualquer issue NOK torna o requisito NOK
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

// Estado global da avaliação manual (chk10 + conteudo + transacao) baseado na regra de ≥75% por checklist
// Usa a mesma lógica de getOverallProjectStatus/getPassStatus em vez de exigir 100% de requisitos OK
function getManualOverallStatus(data) {
  const checklists = [data.chk10, data.conteudo, data.transacao];
  let hasAtLeastOne = false;

  for (const checklist of checklists) {
    if (!hasIssues(checklist)) continue;
    hasAtLeastOne = true;
    if (getPassStatus(checklist) !== 'passa') return 'nok';
  }

  return hasAtLeastOne ? 'ok' : 'na';
}

// Função para contar o número de melhorias em uma seção
function countMelhorias(section) {
  if (!section) return 0;

  let count = 0;

  // Se section é um array (lista de issues), contar diretamente
  if (Array.isArray(section)) {
    for (const issue of section) {
      if (issue && issue.status === 'melhoria') {
        count++;
      }
    }
    return count;
  }

  // Se section é um objeto (estrutura de seção), iterar pelos requisitos
  const requirements = Object.keys(section);

  for (const req of requirements) {
    const issues = section[req];
    // Verificar se issues é um array antes de iterar
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (issue && issue.status === 'melhoria') {
          count++;
        }
      }
    }
  }

  return count;
}

// Helper function to format status for display at checklist level (no improvements text)
function formatStatusForChecklistDisplay(status) {
  if (status === 'na') return 'N/A';
  if (status === 'ok' || status === 'melhoria') {
    return 'OK';
  }
  return status.toUpperCase();
}

// Helper function to format status for display at requirement level (with improvements text)
function formatStatusForRequirementDisplay(status, section) {
  if (status === 'na') return 'N/A';
  if (status === 'ok' || status === 'melhoria') {
    return 'OK';
  }
  return status.toUpperCase();
}

// Helper function to get improvement text for requirements
function getImprovementText(section) {
  const melhorias = section && typeof section === 'object' ? countMelhorias(section) : 0;
  if (melhorias > 0) {
    const melhoriaText = melhorias === 1 ? 'melhoria' : 'melhorias';
    return ` (no entanto contém ${melhorias} ${melhoriaText} que se recomenda efetuar)`;
  }
  return '';
}

// Helper function to format status for display (legacy - keeping for compatibility)
function formatStatusForDisplay(status, section) {
  if (status === 'na') return 'N/A';
  if (status === 'ok' || status === 'melhoria') {
    return 'OK';
  }
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
  return percentage >= 75 ? 'passa' : 'não passa';
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

  // Para avaliação automática, não mostrar nenhuma informação sobre requisitos
  if (checklistName === 'Avaliação automática') {
    return ``;

  } else {
    // Para outras checklists, mostrar o nível de conformidade
    return `
      <p><strong>Nível de conformidade:</strong></p>
        <ul>
          <li><strong>${checklistName}</strong>: ${percentage}% (${passedRequirements}/${applicableRequirements})
            <ul>
              <li>Requisitos avaliados: ${requirements.length} (${naCount > 0 ? `${naCount} N/A excluído${naCount > 1 ? 's' : ''}, ` : ''}${applicableRequirements} aplicáveis)</li>
              ${passedRequirements > 0 ? `<li>Requisitos OK: ${passedRequirements}</li>` : ''}
              <li>Requisitos NOK: ${nokCount}</li>
              ${naCount > 0 ? `<li>Requisitos N/A: ${naCount}</li>` : ''}
            </ul>
          </li>
        </ul>
    `;
  }
}

function hasIssues(section) {
  return Object.keys(section).length > 0 && Object.values(section).some(issues => issues.length > 0);
}

function getOverallProjectStatus(grouped) {
  // O resultado passa/não passa é determinado apenas pelas 3 checklists manuais (threshold ≥75%)
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

      if (percentage < 75) {
        return 'não passa';
      }
    }
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

  // Special cases to avoid duplication
  if (checklistType === 'declaracao') {
    return 'Declaração de Acessibilidade';
  }

  // Special case for "Outras violações" to avoid duplication with section title
  if (checklistType === 'outras' && requirement === 'Outras violações') {
    return '';
  }

  // Special case for "Testes de usabilidade" to avoid duplication with section title
  if (checklistType === 'testesUsabilidade' && requirement === 'Testes de usabilidade') {
    return '';
  }

  return requirement;
}


// Escapa caracteres HTML especiais em texto proveniente do GitHub
// (títulos de issues, nomes de labels, etc.) para evitar injeção de HTML.
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper para extrair o título limpo de uma issue (remove prefixo "R001 - ORG - ")
function getCleanIssueTitle(issue) {
  if (!issue || !issue.title) return '';
  const parts = issue.title.split(' - ');
  const raw = parts.length >= 3 ? parts.slice(2).join(' - ') : issue.title;
  return escapeHtml(raw);
}

// Remove tags HTML (tanto reais como codificadas) para uso em texto puro
// (índice, títulos de secção, etc.) onde não deve aparecer notação de tags
function plainTitle(title) {
  if (!title) return '';
  return title
    .replace(/<\/?[a-z][\s\S]*?>/gi, '')        // remove tags HTML reais (e.g. <h1>)
    .replace(/&lt;\/[a-z0-9]+&gt;/gi, '')       // remove closing encoded tags (e.g. &lt;/h1&gt; → '')
    .replace(/&lt;([a-z0-9]+)&gt;/gi, '$1');   // opening encoded tags (e.g. &lt;h1&gt; → h1)
}


// ou HTML raw das issues quebrem a estrutura do relatório gerado.
// Usa o DOMParser do browser para normalizar o HTML.
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
    const root = doc.getElementById('root');
    if (root) {
      return root.innerHTML;
    }
    return html;
  } catch (e) {
    console.warn('sanitizeHtml failed, returning original:', e);
    return html;
  }
}

function processIssueContent(issue) {
  if (!issue.body) return '';

  try {
    let content = issue.body;

    // Processar tags HTML de imagem ANTES de processar markdown
    // Usar regex seguro (sem [^]* que causa backtracking catastrófico em conteúdo grande)
    const htmlImageRegex = /<img\s+(?:[^>"']*|"[^"]*"|'[^']*')*\/?>/gi;
    const htmlImages = [];
    let imageCounter = 0;

    content = content.replace(htmlImageRegex, (match) => {
      const srcMatch = match.match(/src=["']([^"']+)["']/i);
      if (!srcMatch) return match; // Não é uma img com src, manter original
      const src = srcMatch[1];
      const altMatch = match.match(/alt=["']([^"']*)['""]/i);
      const alt = altMatch ? altMatch[1] : 'Imagem';

      const imageHtml = `<img src="${src}" alt="${alt}" class="evidence-image" style="max-width: 100%; height: auto; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">`;
      htmlImages.push(imageHtml);
      return `\n\n<!--IMAGE_PLACEHOLDER_${imageCounter++}-->\n\n`;
    });

    // Configurar marked.js e converter markdown para HTML
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false,
        headerIds: false,
        mangle: false
      });
      content = marked.parse(content);
    } else {
      console.warn('Marked library not found, returning raw content');
      // Escapar HTML e converter newlines se marked não estiver disponível
      content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    // Restaurar as imagens ANTES de sanitizar (DOMParser remove comentários HTML)
    // Verificar primeiro a versão com <p> envolvente para não deixar tags <p> vazias
    htmlImages.forEach((imageHtml, index) => {
      const placeholder = `<!--IMAGE_PLACEHOLDER_${index}-->`;
      const wrappedPlaceholder = `<p>${placeholder}</p>`;
      if (content.includes(wrappedPlaceholder)) {
        content = content.replace(wrappedPlaceholder, imageHtml);
      } else {
        content = content.replace(placeholder, imageHtml);
      }
    });

    // Aplicar classe CSS personalizada às imagens markdown restantes
    content = content.replace(/<img([^>]*)>/g, (match, attributes) => {
      if (!attributes.includes('class="evidence-image"')) {
        return `<img${attributes} class="evidence-image" style="max-width: 100%; height: auto; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">`;
      }
      return match;
    });

    // Sanitizar o HTML para garantir estrutura bem-formada APÓS restaurar as imagens.
    // Isto evita que conteúdo HTML das issues (p.ex. </ul>, </li>, </div> soltos)
    // quebre a estrutura do relatório gerado.
    content = sanitizeHtml(content);

    return `<div class="issue-content">${content}</div>`;
  } catch (e) {
    console.error('Error processing issue content:', e);
    // No fallback, mostrar conteúdo bruto de forma segura
    const safeBody = (issue.body || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="issue-content"><pre style="white-space: pre-wrap; word-break: break-word;">${safeBody}</pre></div>`;
  }
}


function calculateProgress(dataForCalculation) {
  // Totais fixos de requisitos por checklist (conforme definição do Selo)
  const TOTALS = { chk10: 27, conteudo: 17, transacao: 13 };

  let totalRequirements = 0;
  let auditedRequirements = 0;

  // Para cada checklist com dados, somar ao total fixo e contar auditados
  ['chk10', 'conteudo', 'transacao'].forEach(section => {
    if (hasIssues(dataForCalculation[section])) {
      totalRequirements += TOTALS[section];
      // Todos os requisitos presentes nos dados foram auditados
      // (N/A é um resultado válido de auditoria)
      auditedRequirements += Object.keys(dataForCalculation[section]).length;
    }
  });

  if (totalRequirements === 0) return { percentage: 0, audited: 0, total: 0 };

  const percentage = Math.round((auditedRequirements / totalRequirements) * 100);

  return {
    percentage: percentage,
    audited: auditedRequirements,
    total: totalRequirements
  };
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revogar o URL após o download para libertar memória
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}