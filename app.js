// ============================
// BANCO / ESTADO
// ============================
let db_master = JSON.parse(localStorage.getItem('g_master')) || [];
let db_precos = JSON.parse(localStorage.getItem('g_precos')) || {};
let lote = JSON.parse(localStorage.getItem('g_lote')) || [];
let cofre = JSON.parse(localStorage.getItem('g_cofre')) || [];
let envios = JSON.parse(localStorage.getItem('g_envios')) || [];
let fornecedores = JSON.parse(localStorage.getItem('g_fornecedores')) || ['QUARTT', 'CNN', 'GOLD', 'AG', 'IMPORTADA'];

let current_import_sup = "";
let mainChart = null;
let envioChart = null;

// Calendário / envios
let calendarDate = new Date();
let selectedDate = formatDateISO(new Date());
let envioCarouselIndex = 0;
let envioDraftItems = [];

// ============================
// UTILIDADES
// ============================
function saveState() {
  localStorage.setItem('g_master', JSON.stringify(db_master));
  localStorage.setItem('g_precos', JSON.stringify(db_precos));
  localStorage.setItem('g_lote', JSON.stringify(lote));
  localStorage.setItem('g_cofre', JSON.stringify(cofre));
  localStorage.setItem('g_envios', JSON.stringify(envios));
  localStorage.setItem('g_fornecedores', JSON.stringify(fornecedores));
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(text, type = "info") {
  const box = document.getElementById('globalMessage');
  if (!box) return;
  box.className = `top-message show ${type}`;
  box.innerText = text;
  clearTimeout(showMessage._timer);
  showMessage._timer = setTimeout(() => {
    box.className = 'top-message';
    box.innerText = '';
  }, 3500);
}

function currencyBR(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateISO(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(isoDate) {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(isoDate, time = '') {
  return `${formatDateBR(isoDate)}${time ? ' às ' + time : ''}`;
}

function monthNamePt(monthIndex) {
  const names = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return names[monthIndex];
}

function weekdaysPt() {
  return ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
}

function getFornecedorOptionsHtml(selected = "") {
  return fornecedores.map(f => `<option value="${escapeHtml(f)}" ${selected === f ? 'selected' : ''}>${escapeHtml(f)}</option>`).join('');
}

function getProdutoById(id) {
  return db_master.find(p => String(p.id).trim() === String(id).trim());
}

function getMonthEnvios(dateObj) {
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();
  return envios.filter(e => {
    const d = new Date(`${e.data}T00:00:00`);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function getEnviosByDate(dateISO) {
  return envios
    .filter(e => e.data === dateISO)
    .sort((a, b) => {
      const ta = `${a.data} ${a.hora}`;
      const tb = `${b.data} ${b.hora}`;
      return tb.localeCompare(ta);
    });
}

function sumEnvioItems(items = []) {
  return items.reduce((acc, item) => acc + Number(item.qtd || 0), 0);
}

function uniqueCategories() {
  return [...new Set(db_master.map(x => x.cat).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// ============================
// NAVEGAÇÃO
// ============================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(section => {
    section.classList.remove('active');
  });

  document.querySelectorAll('.nav-btn').forEach(button => {
    button.classList.remove('active');
  });

  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  const activeButton = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }

  if (tabId === 'triagem') renderRecent();
  if (tabId === 'envios') renderEnviosPage();
  if (tabId === 'produtos') renderProdutosPage();
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'precos') renderPriceTable();
  if (tabId === 'lote') renderLoteTable();
  if (tabId === 'cofre') renderVault();
}

// ============================
// IMPORTAÇÃO BANCO MASTER
// ============================
function importMaster(input) {
  if (!input.files || !input.files[0]) return;

  Papa.parse(input.files[0], {
    header: true,
    delimiter: "",
    skipEmptyLines: true,
    complete: function (res) {
      const parsed = res.data.map(r => ({
        id: (r['id Produto'] || r['id'] || r['Código'] || r['codigo'] || '').toString().trim(),
        cat: (r['Categoria de Produto'] || r['categoria'] || r['Categoria'] || '').toString().trim(),
        sub: (r['Subcategoria de Produto'] || r['sub'] || r['Subcategoria'] || '').toString().trim(),
        name: (r['Produto'] || r['nome'] || r['Nome'] || '').toString().trim()
      })).filter(x => x.id && x.name);

      db_master = parsed;
      saveState();
      updateCategoryFilters();
      renderProdutosPage();
      previewProd();
      showMessage(`Banco Master atualizado com ${db_master.length} produtos.`, "success");
      updateMasterStatus();
    },
    error: function () {
      showMessage("Erro ao importar o Banco Master.", "error");
    }
  });
}

function updateMasterStatus() {
  const el = document.getElementById('masterStatus');
  if (!el) return;

  if (db_master.length > 0) {
    el.innerHTML = `<strong>✅ Banco Master carregado:</strong> ${db_master.length} produtos reconhecidos`;
  } else {
    el.innerHTML = `<strong>Clique para importar o Banco Master</strong>`;
  }
}

function updateCategoryFilters() {
  const cats = uniqueCategories();
  const options = `<option value="">Todas as Categorias</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  const filterPrice = document.getElementById('filterCatPrice');
  const filterLote = document.getElementById('filterCatLote');

  if (filterPrice) filterPrice.innerHTML = options;
  if (filterLote) filterLote.innerHTML = options;
}

// ============================
// TRIAGEM
// ============================
function previewProd() {
  const id = document.getElementById('inpId').value.trim();
  const sup = document.getElementById('inpSup').value;
  const prod = getProdutoById(id);
  const div = document.getElementById('prevInfo');

  if (!div) return;

  if (prod) {
    const preco = Number(db_precos[`${id}_${sup}`] || 0);
    div.innerHTML = `
      <div>
        <strong style="color:#1d4ed8;">📦 ${escapeHtml(prod.name)}</strong><br>
        <span style="color:#64748b;">Categoria: ${escapeHtml(prod.cat || '-')} | Subcategoria: ${escapeHtml(prod.sub || '-')} | Preço ${escapeHtml(sup)}: ${currencyBR(preco)}</span>
      </div>
    `;
  } else {
    div.innerHTML = `Produto não encontrado no Banco Master.`;
  }
}

function resetTriagemFields() {
  document.getElementById('inpId').value = '';
  document.getElementById('inpBar').value = '';
  document.getElementById('inpDate').value = '';
  document.getElementById('inpReason').selectedIndex = 0;
  document.getElementById('prevInfo').innerHTML = 'Digite o SKU para visualizar o produto.';
  document.getElementById('inpId').focus();
}

function addItem() {
  const fields = {
    id: document.getElementById('inpId').value.trim(),
    bar: document.getElementById('inpBar').value.trim(),
    sup: document.getElementById('inpSup').value,
    date: document.getElementById('inpDate').value,
    reason: document.getElementById('inpReason').value
  };

  if (!fields.id || !fields.bar || !fields.date) {
    showMessage("Preencha SKU, código de barras e data da venda.", "error");
    return;
  }

  if (lote.some(i => i.bar === fields.bar)) {
    showMessage("Este código de barras já existe no lote.", "error");
    return;
  }

  const prod = getProdutoById(fields.id);
  if (!prod) {
    showMessage("SKU não encontrado no Banco Master.", "error");
    return;
  }

  let status = "Garantia";
  const motivosDescarte = ["Tela trincada", "Bateria estufada", "Flex Rasgado"];
  if (motivosDescarte.includes(fields.reason)) status = "Descarte";

  const dtVenda = new Date(`${fields.date}T00:00:00`);
  const hoje = new Date();
  const meses = (hoje.getFullYear() - dtVenda.getFullYear()) * 12 + (hoje.getMonth() - dtVenda.getMonth());

  const catLower = String(prod.cat || "").toLowerCase();
  if (catLower.includes("bateria") && meses > 6) status = "Descarte";
  if (catLower.includes("tela") && meses > 12) status = "Descarte";

  lote.push({
    uid: Date.now(),
    ...fields,
    name: prod.name,
    cat: prod.cat,
    sub: prod.sub,
    status,
    price: Number(db_precos[`${fields.id}_${fields.sup}`] || 0),
    createdAt: new Date().toISOString()
  });

  saveState();
  renderRecent();
  renderLoteTable();
  renderDashboard();
  showMessage(`Item registrado como ${status}.`, "success");
  resetTriagemFields();
}

function renderRecent() {
  const body = document.getElementById('recentBody');
  if (!body) return;

  const rows = lote.slice(-10).reverse().map(i => `
    <tr>
      <td>${formatDateBR(i.date)}</td>
      <td><strong>${escapeHtml(i.id)}</strong></td>
      <td>${escapeHtml(i.name)}</td>
      <td>${escapeHtml(i.bar)}</td>
      <td>${escapeHtml(i.sup)}</td>
      <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${escapeHtml(i.status)}</span></td>
    </tr>
  `).join('');

  body.innerHTML = rows || `<tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhum item registrado ainda.</td></tr>`;
}

// ============================
// PRODUTOS / BANCO MASTER
// ============================
function renderProdutosPage() {
  const totalEl = document.getElementById('prodTotalStat');
  const catEl = document.getElementById('prodCatStat');
  if (totalEl) totalEl.innerText = db_master.length;
  if (catEl) catEl.innerText = uniqueCategories().length;
  renderMasterTable();
}

function renderMasterTable() {
  const body = document.getElementById('masterBody');
  if (!body) return;

  const searchInput = document.getElementById('searchMaster');
  const search = ((searchInput && searchInput.value) || '').toLowerCase().trim();

  const filtered = db_master.filter(p =>
    String(p.id).toLowerCase().includes(search) ||
    String(p.name).toLowerCase().includes(search) ||
    String(p.cat).toLowerCase().includes(search) ||
    String(p.sub).toLowerCase().includes(search)
  );

  body.innerHTML = filtered.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.id)}</strong></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.cat || '-')}</td>
      <td>${escapeHtml(p.sub || '-')}</td>
      <td>
        <div class="toolbar">
          <button class="btn btn-light btn-sm" onclick="editMasterProduct('${escapeForJs(p.id)}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMasterProduct('${escapeForJs(p.id)}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum produto encontrado.</td></tr>`;
}

function escapeForJs(text = "") {
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function clearProductForm() {
  document.getElementById('prodEditIndex').value = '';
  document.getElementById('prodCodigo').value = '';
  document.getElementById('prodCategoria').value = '';
  document.getElementById('prodSubcategoria').value = '';
  document.getElementById('prodNome').value = '';
}

function editMasterProduct(id) {
  const index = db_master.findIndex(p => String(p.id) === String(id));
  if (index < 0) return;

  const prod = db_master[index];
  document.getElementById('prodEditIndex').value = index;
  document.getElementById('prodCodigo').value = prod.id || '';
  document.getElementById('prodCategoria').value = prod.cat || '';
  document.getElementById('prodSubcategoria').value = prod.sub || '';
  document.getElementById('prodNome').value = prod.name || '';

  showMessage(`Produto ${prod.id} carregado para edição.`, "info");
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function saveMasterProduct() {
  const editIndex = document.getElementById('prodEditIndex').value;
  const id = document.getElementById('prodCodigo').value.trim();
  const cat = document.getElementById('prodCategoria').value.trim();
  const sub = document.getElementById('prodSubcategoria').value.trim();
  const name = document.getElementById('prodNome').value.trim();

  if (!id || !name) {
    showMessage("Informe pelo menos o código e o nome do produto.", "error");
    return;
  }

  const payload = { id, cat, sub, name };

  if (editIndex !== '') {
    db_master[Number(editIndex)] = payload;
    showMessage("Produto atualizado com sucesso.", "success");
  } else {
    const exists = db_master.some(p => String(p.id) === String(id));
    if (exists) {
      showMessage("Já existe um produto com esse código.", "error");
      return;
    }
    db_master.push(payload);
    showMessage("Produto adicionado com sucesso.", "success");
  }

  db_master.sort((a, b) => String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }));
  saveState();
  updateCategoryFilters();
  renderProdutosPage();
  clearProductForm();
  updateMasterStatus();
}

function deleteSelectedProductForm() {
  const editIndex = document.getElementById('prodEditIndex').value;
  if (editIndex === '') {
    showMessage("Selecione um produto para excluir.", "error");
    return;
  }

  const prod = db_master[Number(editIndex)];
  if (!prod) return;

  if (confirm(`Excluir o produto ${prod.id} - ${prod.name}?`)) {
    db_master.splice(Number(editIndex), 1);
    saveState();
    updateCategoryFilters();
    renderProdutosPage();
    clearProductForm();
    updateMasterStatus();
    showMessage("Produto excluído com sucesso.", "success");
  }
}

function deleteMasterProduct(id) {
  const index = db_master.findIndex(p => String(p.id) === String(id));
  if (index < 0) return;

  const prod = db_master[index];
  if (confirm(`Excluir o produto ${prod.id} - ${prod.name}?`)) {
    db_master.splice(index, 1);
    saveState();
    updateCategoryFilters();
    renderProdutosPage();
    clearProductForm();
    updateMasterStatus();
    showMessage("Produto excluído com sucesso.", "success");
  }
}

// ============================
// ENVIO / CALENDÁRIO
// ============================
function renderEnviosPage() {
  renderEnvioStats();
  renderCalendar();
  renderSelectedDateCards();
}

function renderEnvioStats() {
  const monthEnvios = getMonthEnvios(calendarDate);
  const totalEnvios = monthEnvios.length;
  const totalItens = monthEnvios.reduce((acc, e) => acc + sumEnvioItems(e.itens), 0);

  const fornecedoresCount = {};
  monthEnvios.forEach(e => {
    fornecedoresCount[e.fornecedor] = (fornecedoresCount[e.fornecedor] || 0) + 1;
  });

  let topFornecedor = '-';
  let topCount = 0;
  Object.entries(fornecedoresCount).forEach(([forn, count]) => {
    if (count > topCount) {
      topFornecedor = forn;
      topCount = count;
    }
  });

  const mesEl = document.getElementById('envioMesStat');
  const itensEl = document.getElementById('envioItensStat');
  const topEl = document.getElementById('envioTopFornecedorStat');
  const dataSelEl = document.getElementById('envioDataSelecionadaStat');

  if (mesEl) mesEl.innerText = totalEnvios;
  if (itensEl) itensEl.innerText = totalItens;
  if (topEl) topEl.innerText = topFornecedor;
  if (dataSelEl) dataSelEl.innerText = formatDateBR(selectedDate);
}

function changeCalendarMonth(offset) {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1);
  renderEnviosPage();
}

function renderCalendar() {
  const title = document.getElementById('calendarTitle');
  const grid = document.getElementById('calendarGrid');
  if (!title || !grid) return;

  title.innerText = `${monthNamePt(calendarDate.getMonth())} ${calendarDate.getFullYear()}`;

  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const lastDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);

  let startWeekday = firstDayOfMonth.getDay();
  if (startWeekday === 0) startWeekday = 7;
  startWeekday = startWeekday - 1;

  const totalDays = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 0).getDate();

  let html = '';

  weekdaysPt().forEach(day => {
    html += `<div class="calendar-weekday">${day}</div>`;
  });

  for (let i = startWeekday - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    html += `
      <div class="calendar-day muted">
        <div class="day-number">${dayNum}</div>
      </div>
    `;
  }

  const todayISO = formatDateISO(new Date());

  for (let day = 1; day <= totalDays; day++) {
    const currentISO = formatDateISO(new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day));
    const count = getEnviosByDate(currentISO).length;
    const isSelected = currentISO === selectedDate;
    const isToday = currentISO === todayISO;

    html += `
      <div class="calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" onclick="selectCalendarDate('${currentISO}')">
        <div class="day-number">${day}</div>
        ${count > 0 ? `<div class="day-counter">${count} envio${count > 1 ? 's' : ''}</div>` : `<div></div>`}
      </div>
    `;
  }

  const totalCellsUsed = startWeekday + totalDays;
  const remaining = totalCellsUsed % 7 === 0 ? 0 : 7 - (totalCellsUsed % 7);

  for (let i = 1; i <= remaining; i++) {
    html += `
      <div class="calendar-day muted">
        <div class="day-number">${i}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function selectCalendarDate(dateISO) {
  selectedDate = dateISO;
  envioCarouselIndex = 0;
  renderEnviosPage();
}

function renderSelectedDateCards() {
  const title = document.getElementById('selectedDateTitle');
  const container = document.getElementById('enviosDiaContainer');
  const controls = document.getElementById('carouselControls');

  if (!container || !title || !controls) return;

  title.innerText = `Envios de ${formatDateBR(selectedDate)}`;

  const dayEnvios = getEnviosByDate(selectedDate);

  if (dayEnvios.length === 0) {
    controls.style.display = 'none';
    container.innerHTML = `
      <div class="empty-state">
        <h3 style="margin-bottom:8px;">Nenhum envio nesta data</h3>
        <p>Cadastre um envio e ele aparecerá aqui com data, hora, fornecedor, rastreio e produtos.</p>
      </div>
    `;
    return;
  }

  if (envioCarouselIndex >= dayEnvios.length) envioCarouselIndex = 0;
  if (envioCarouselIndex < 0) envioCarouselIndex = 0;

  controls.style.display = dayEnvios.length > 1 ? 'flex' : 'none';
  const envio = dayEnvios[envioCarouselIndex];

  container.innerHTML = `
    <div class="envio-card">
      <div class="envio-top">
        <div>
          <h5>Fornecedor: ${escapeHtml(envio.fornecedor)}</h5>
          <p>Rastreio: <strong>${escapeHtml(envio.rastreio)}</strong></p>
        </div>
        <div>
          <span class="status-pill ${envio.status === 'Recebido' ? 'status-recebido' : 'status-enviado'}">${escapeHtml(envio.status)}</span>
        </div>
      </div>

      <div class="envio-body">
        <div class="envio-meta">
          <div class="meta-box">
            <span>Data</span>
            <strong>${formatDateBR(envio.data)}</strong>
          </div>
          <div class="meta-box">
            <span>Hora</span>
            <strong>${escapeHtml(envio.hora)}</strong>
          </div>
          <div class="meta-box">
            <span>Total de itens</span>
            <strong>${sumEnvioItems(envio.itens)}</strong>
          </div>
          <div class="meta-box">
            <span>Qtd de produtos</span>
            <strong>${envio.itens.length}</strong>
          </div>
        </div>

        <div>
          <strong style="color:#0f172a;">Produtos do envio</strong>
          <div class="item-list">
            ${envio.itens.map(item => `
              <div class="item-chip">
                <div>
                  <strong>${escapeHtml(item.codigo)} — ${escapeHtml(item.nome)}</strong><br>
                  <span>Categoria: ${escapeHtml(item.categoria || '-')}</span>
                </div>
                <div>
                  <span>Quantidade</span><br>
                  <strong>${escapeHtml(String(item.qtd))}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${envio.observacao ? `
          <div style="margin-top:16px;">
            <strong style="color:#0f172a;">Observação</strong>
            <p class="subtle" style="margin-top:6px;">${escapeHtml(envio.observacao)}</p>
          </div>
        ` : ''}

        <div class="action-row">
          <button class="btn btn-success btn-sm" onclick="toggleRecebidoEnvio(${envio.uid})">
            ${envio.status === 'Recebido' ? 'Marcar como enviado' : 'Marcar como recebido'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteEnvio(${envio.uid})">Excluir envio</button>
        </div>

        ${dayEnvios.length > 1 ? `
          <p class="footer-note">Card ${envioCarouselIndex + 1} de ${dayEnvios.length}</p>
        ` : ''}
      </div>
    </div>
  `;
}

function prevEnvioCard() {
  const dayEnvios = getEnviosByDate(selectedDate);
  if (dayEnvios.length <= 1) return;
  envioCarouselIndex = (envioCarouselIndex - 1 + dayEnvios.length) % dayEnvios.length;
  renderSelectedDateCards();
}

function nextEnvioCard() {
  const dayEnvios = getEnviosByDate(selectedDate);
  if (dayEnvios.length <= 1) return;
  envioCarouselIndex = (envioCarouselIndex + 1) % dayEnvios.length;
  renderSelectedDateCards();
}

function openEnvioModal() {
  const modal = document.getElementById('envioModal');
  if (!modal) return;

  modal.classList.add('active');
  document.getElementById('envFornecedor').innerHTML = getFornecedorOptionsHtml();
  document.getElementById('envData').value = selectedDate || formatDateISO(new Date());

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('envHora').value = `${hh}:${mm}`;

  previewEnvioProduto();
  renderEnvioItensDraft();
}

function closeEnvioModal() {
  const modal = document.getElementById('envioModal');
  if (modal) modal.classList.remove('active');
}

function clearEnvioDraft() {
  envioDraftItems = [];
  document.getElementById('envRastreio').value = '';
  document.getElementById('envObs').value = '';
  document.getElementById('envProdCodigo').value = '';
  document.getElementById('envProdQtd').value = 1;
  document.getElementById('envStatus').value = 'Enviado';
  previewEnvioProduto();
  renderEnvioItensDraft();
}

function previewEnvioProduto() {
  const input = document.getElementById('envProdCodigo');
  const box = document.getElementById('envProdPreview');
  if (!input || !box) return;

  const codigo = input.value.trim();
  const prod = getProdutoById(codigo);

  if (!codigo) {
    box.innerHTML = 'Digite o código do produto para reconhecimento automático.';
    return;
  }

  if (!prod) {
    box.innerHTML = 'Código não encontrado no Banco Master.';
    return;
  }

  box.innerHTML = `
    <div>
      <strong style="color:#1d4ed8;">${escapeHtml(prod.name)}</strong><br>
      <span style="color:#64748b;">Código: ${escapeHtml(prod.id)} | Categoria: ${escapeHtml(prod.cat || '-')} | Subcategoria: ${escapeHtml(prod.sub || '-')}</span>
    </div>
  `;
}

function addEnvioItem() {
  const codigo = document.getElementById('envProdCodigo').value.trim();
  const qtd = Number(document.getElementById('envProdQtd').value || 0);
  const prod = getProdutoById(codigo);

  if (!codigo || !prod) {
    showMessage("Informe um código válido do Banco Master.", "error");
    return;
  }

  if (!qtd || qtd <= 0) {
    showMessage("Informe uma quantidade válida.", "error");
    return;
  }

  const existente = envioDraftItems.find(i => String(i.codigo) === String(codigo));
  if (existente) {
    existente.qtd += qtd;
  } else {
    envioDraftItems.push({
      codigo: prod.id,
      nome: prod.name,
      categoria: prod.cat,
      subcategoria: prod.sub,
      qtd
    });
  }

  document.getElementById('envProdCodigo').value = '';
  document.getElementById('envProdQtd').value = 1;
  previewEnvioProduto();
  renderEnvioItensDraft();
  showMessage("Item adicionado ao envio.", "success");
}

function renderEnvioItensDraft() {
  const body = document.getElementById('envioItensBody');
  if (!body) return;

  body.innerHTML = envioDraftItems.map((item, index) => `
    <tr>
      <td><strong>${escapeHtml(item.codigo)}</strong></td>
      <td>${escapeHtml(item.nome)}</td>
      <td>${escapeHtml(item.categoria || '-')}</td>
      <td>${escapeHtml(String(item.qtd))}</td>
      <td><button class="btn btn-danger btn-sm" onclick="removeEnvioDraftItem(${index})">Remover</button></td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum produto adicionado ao envio.</td></tr>`;
}

function removeEnvioDraftItem(index) {
  envioDraftItems.splice(index, 1);
  renderEnvioItensDraft();
}

function saveEnvio() {
  const fornecedor = document.getElementById('envFornecedor').value;
  const rastreio = document.getElementById('envRastreio').value.trim();
  const data = document.getElementById('envData').value;
  const hora = document.getElementById('envHora').value;
  const status = document.getElementById('envStatus').value;
  const observacao = document.getElementById('envObs').value.trim();

  if (!fornecedor) {
    showMessage("Selecione o fornecedor.", "error");
    return;
  }

  if (!rastreio) {
    showMessage("Informe o rastreio.", "error");
    return;
  }

  if (!data) {
    showMessage("Informe a data do envio.", "error");
    return;
  }

  if (!hora) {
    showMessage("Informe a hora do cadastro.", "error");
    return;
  }

  if (envioDraftItems.length === 0) {
    showMessage("Adicione pelo menos um produto ao envio.", "error");
    return;
  }

  envios.push({
    uid: Date.now(),
    fornecedor,
    rastreio,
    data,
    hora,
    status,
    observacao,
    itens: [...envioDraftItems],
    createdAt: new Date().toISOString()
  });

  saveState();
  selectedDate = data;
  envioCarouselIndex = 0;
  clearEnvioDraft();
  closeEnvioModal();
  renderEnviosPage();
  renderDashboard();
  showMessage("Envio salvo com sucesso.", "success");
}

function toggleRecebidoEnvio(uid) {
  const envio = envios.find(e => e.uid === uid);
  if (!envio) return;

  envio.status = envio.status === 'Recebido' ? 'Enviado' : 'Recebido';
  saveState();
  renderEnviosPage();
  renderDashboard();
  showMessage(`Envio atualizado para ${envio.status}.`, "success");
}

function deleteEnvio(uid) {
  const envio = envios.find(e => e.uid === uid);
  if (!envio) return;

  if (confirm(`Excluir o envio do fornecedor ${envio.fornecedor} com rastreio ${envio.rastreio}?`)) {
    envios = envios.filter(e => e.uid !== uid);
    saveState();
    renderEnviosPage();
    renderDashboard();
    showMessage("Envio excluído com sucesso.", "success");
  }
}

// ============================
// PREÇOS
// ============================
function triggerPrice(sup) {
  current_import_sup = sup;
  document.getElementById('priceInp').click();
}

function processPriceCsv(input) {
  if (!input.files || !input.files[0]) return;

  Papa.parse(input.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: function (res) {
      res.data.forEach(r => {
        const id = (r['id'] || r['id Produto'] || r['codigo'] || '').toString().trim();
        const val = parseFloat((r['preco'] || r['valor'] || r['Preço'] || 0).toString().replace(',', '.'));
        if (id && !Number.isNaN(val)) {
          db_precos[`${id}_${current_import_sup}`] = val;
        }
      });

      saveState();
      renderPriceTable();
      showMessage(`Preços de ${current_import_sup} importados com sucesso.`, "success");
    },
    error: function () {
      showMessage("Erro ao importar tabela de preços.", "error");
    }
  });
}

function renderPriceTable() {
  const body = document.getElementById('priceBody');
  if (!body) return;

  const searchInput = document.getElementById('searchPrice');
  const filterInput = document.getElementById('filterCatPrice');
  const search = ((searchInput && searchInput.value) || '').toLowerCase();
  const cat = (filterInput && filterInput.value) || '';
  const sups = ['QUARTT', 'CNN', 'GOLD', 'AG', 'IMPORTADA'];

  const filtered = db_master.filter(p =>
    (String(p.id).toLowerCase().includes(search) || String(p.name).toLowerCase().includes(search)) &&
    (cat === "" || p.cat === cat)
  );

  body.innerHTML = filtered.slice(0, 250).map(p => {
    let soma = 0;
    let count = 0;

    const cols = sups.map(s => {
      const v = Number(db_precos[`${p.id}_${s}`] || 0);
      if (v > 0) {
        soma += v;
        count++;
      }
      return `
        <td>
          <input
            type="number"
            value="${v || ''}"
            placeholder="0"
            onchange="savePrice('${escapeForJs(p.id)}','${escapeForJs(s)}',this.value)"
            style="width:100px;padding:8px 10px;border-radius:10px;"
          >
        </td>
      `;
    }).join('');

    const media = count > 0 ? soma / count : 0;

    return `
      <tr>
        <td><strong>${escapeHtml(p.id)}</strong></td>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(p.cat || '-')}</td>
        <td><strong>${currencyBR(media)}</strong></td>
        ${cols}
      </tr>
    `;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:#64748b;">Nenhum produto encontrado.</td></tr>`;
}

function savePrice(id, sup, val) {
  db_precos[`${id}_${sup}`] = parseFloat(val || 0);
  saveState();
}

// ============================
// LOTE
// ============================
function renderLoteTable() {
  const body = document.getElementById('loteBody');
  if (!body) return;

  const searchInput = document.getElementById('searchLote');
  const filterInput = document.getElementById('filterCatLote');
  const search = ((searchInput && searchInput.value) || '').toLowerCase();
  const cat = (filterInput && filterInput.value) || '';

  const filtered = lote.filter(i =>
    (String(i.bar).toLowerCase().includes(search) || String(i.name).toLowerCase().includes(search) || String(i.id).toLowerCase().includes(search)) &&
    (cat === "" || i.cat === cat)
  );

  body.innerHTML = filtered.map(i => `
    <tr>
      <td><strong>${escapeHtml(i.sup)}</strong></td>
      <td>${escapeHtml(i.cat || '-')}</td>
      <td>${escapeHtml(i.name)}</td>
      <td>
        <input
          type="text"
          value="${escapeHtml(i.bar)}"
          onchange="updateBar(${i.uid}, this.value)"
          style="padding:8px 10px;border-radius:10px;"
        >
      </td>
      <td>${formatDateBR(i.date)}</td>
      <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${escapeHtml(i.status)}</span></td>
      <td>${currencyBR(i.price || 0)}</td>
      <td>
        <div class="toolbar">
          <button class="btn btn-danger btn-sm" onclick="removeLote(${i.uid})">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="8" style="text-align:center;color:#64748b;">Nenhum item no lote.</td></tr>`;
}

function updateBar(uid, val) {
  const idx = lote.findIndex(l => l.uid === uid);
  if (idx < 0) return;
  lote[idx].bar = val;
  saveState();
  showMessage("Código de barras atualizado.", "success");
}

function removeLote(uid) {
  if (confirm("Remover este item do lote?")) {
    lote = lote.filter(l => l.uid !== uid);
    saveState();
    renderRecent();
    renderLoteTable();
    renderDashboard();
    showMessage("Item removido do lote.", "success");
  }
}

async function exportExcel(sup) {
  const items = lote.filter(l => l.sup === sup);
  if (items.length === 0) {
    showMessage(`Nenhum item encontrado para o fornecedor ${sup}.`, "error");
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Garantia ${sup}`);

  const headers = ['ID', 'PRODUTO', 'CATEGORIA', 'SUBCATEGORIA', 'BARCODE', 'DATA VENDA', 'STATUS', 'PREÇO'];
  ws.addRow(headers);

  ws.getRow(1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
    c.font = { color: { argb: 'FFFFFF' }, bold: true };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  items.forEach(i => {
    const row = ws.addRow([
      i.id,
      i.name,
      i.cat,
      i.sub || '',
      i.bar,
      formatDateBR(i.date),
      i.status,
      Number(i.price || 0)
    ]);
    row.eachCell(c => {
      c.font = { bold: false };
    });
  });

  ws.columns = [
    { width: 14 },
    { width: 34 },
    { width: 20 },
    { width: 20 },
    { width: 26 },
    { width: 15 },
    { width: 14 },
    { width: 14 }
  ];

  const totalRow = ws.addRow(['', '', '', '', '', '', 'TOTAL', items.reduce((a, b) => a + Number(b.price || 0), 0)]);
  totalRow.eachCell(c => {
    c.font = { bold: true };
  });

  const buf = await wb.xlsx.writeBuffer();
  const fileName = `Garantia_${sup}_${formatDateISO(new Date())}.xlsx`;
  saveAs(new Blob([buf]), fileName);

  cofre.push({
    uid: Date.now(),
    date: new Date().toLocaleString('pt-BR'),
    name: fileName,
    sup,
    count: items.length,
    status: 'Exportado'
  });

  saveState();
  renderVault();
  showMessage(`Arquivo ${fileName} exportado com sucesso.`, "success");
}

// ============================
// DASHBOARD
// ============================
function renderDashboard() {
  const totalEl = document.getElementById('dashTotal');
  const garEl = document.getElementById('dashGar');
  const desEl = document.getElementById('dashDes');
  const valEl = document.getElementById('dashVal');

  const g = lote.filter(x => x.status === "Garantia").length;
  const d = lote.filter(x => x.status === "Descarte").length;
  const val = lote.filter(x => x.status === "Garantia").reduce((a, b) => a + Number(b.price || 0), 0);

  if (totalEl) totalEl.innerText = lote.length;
  if (garEl) garEl.innerText = g;
  if (desEl) desEl.innerText = d;
  if (valEl) valEl.innerText = currencyBR(val);

  const chart1 = document.getElementById('mainChart');
  if (chart1) {
    const ctx1 = chart1.getContext('2d');
    if (mainChart) mainChart.destroy();
    mainChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['Garantia', 'Descarte'],
        datasets: [{
          label: 'Quantidade',
          data: [g, d]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }

  const fornecedoresCount = {};
  envios.forEach(e => {
    fornecedoresCount[e.fornecedor] = (fornecedoresCount[e.fornecedor] || 0) + 1;
  });

  const labels = Object.keys(fornecedoresCount);
  const data = Object.values(fornecedoresCount);

  const chart2 = document.getElementById('envioChart');
  if (chart2) {
    const ctx2 = chart2.getContext('2d');
    if (envioChart) envioChart.destroy();
    envioChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['Sem dados'],
        datasets: [{
          label: 'Envios',
          data: data.length ? data : [0]
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// ============================
// COFRE
// ============================
function renderVault() {
  const body = document.getElementById('vaultBody');
  if (!body) return;

  const fornInput = document.getElementById('vaultForn');
  const dateInput = document.getElementById('vaultDate');
  const fSup = (fornInput && fornInput.value) || '';
  const fDate = (dateInput && dateInput.value) || '';

  const filtered = cofre.filter(v =>
    (fSup === "" || v.sup === fSup) &&
    (fDate === "" || String(v.date).includes(formatDateBR(fDate)))
  );

  body.innerHTML = filtered.slice().reverse().map(v => `
    <tr>
      <td>${escapeHtml(v.date)}</td>
      <td><strong>${escapeHtml(v.name)}</strong></td>
      <td>${escapeHtml(v.sup)}</td>
      <td>${escapeHtml(String(v.count))}</td>
      <td><span class="badge badge-recebido">${escapeHtml(v.status || 'Exportado')}</span></td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhuma exportação registrada.</td></tr>`;
}

function clearVaultFilters() {
  document.getElementById('vaultForn').value = '';
  document.getElementById('vaultDate').value = '';
  renderVault();
}

// ============================
// INICIALIZAÇÃO
// ============================
window.onload = () => {
  document.querySelectorAll('.nav-btn').forEach(button => {
    button.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');
      if (tabId) {
        switchTab(tabId);
      }
    });
  });

  updateMasterStatus();
  updateCategoryFilters();

  const inpDate = document.getElementById('inpDate');
  if (inpDate && !inpDate.value) {
    inpDate.value = formatDateISO(new Date());
  }

  const envFornecedor = document.getElementById('envFornecedor');
  if (envFornecedor) envFornecedor.innerHTML = getFornecedorOptionsHtml();

  const envData = document.getElementById('envData');
  if (envData) envData.value = selectedDate;

  const envHora = document.getElementById('envHora');
  if (envHora) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    envHora.value = `${hh}:${mm}`;
  }

  const prevInfo = document.getElementById('prevInfo');
  if (prevInfo) prevInfo.innerHTML = 'Digite o SKU para visualizar o produto.';

  previewEnvioProduto();

  renderRecent();
  renderProdutosPage();
  renderPriceTable();
  renderLoteTable();
  renderVault();
  renderEnviosPage();
  renderDashboard();
};

// Fecha modal clicando fora
document.addEventListener('click', function (e) {
  const modal = document.getElementById('envioModal');
  if (!modal || !modal.classList.contains('active')) return;

  if (e.target === modal) {
    closeEnvioModal();
  }
});
