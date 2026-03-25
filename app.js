/**
 * METASBOARD CORE ENGINE
 * Versão: 2026.Enterprise
 */

// --- ESTADO GLOBAL ---
let db_produtos = JSON.parse(localStorage.getItem('mb_db_prod')) || [];
let db_precos = JSON.parse(localStorage.getItem('mb_db_prices')) || {}; // Chave: "ID_FORNECEDOR"
let lote_pool = JSON.parse(localStorage.getItem('mb_lote_pool')) || [];
let export_vault = JSON.parse(localStorage.getItem('mb_vault')) || [];
let active_charts = {};
let target_supplier = "";

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    refreshStatus();
    updateRecentTable();
});

function refreshStatus() {
    const statusEl = document.getElementById('masterStatus');
    if(db_produtos.length > 0) {
        statusEl.innerHTML = `✅ Banco Master Ativo: <strong>${db_produtos.length} produtos</strong>`;
    }
}

// --- NAVEGAÇÃO ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.onclick.toString().includes(tabId));
    if(activeBtn) activeBtn.classList.add('active');

    // Gatilhos de atualização por aba
    if(tabId === 'dashboard') renderDashboard();
    if(tabId === 'precos') renderPriceTable();
    if(tabId === 'lote') renderLoteTable();
    if(tabId === 'cofre') renderVault();
}

// --- GESTÃO DE DADOS (IMPORTAÇÃO) ---
function importMaster(input) {
    if(!input.files[0]) return;
    Papa.parse(input.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            db_produtos = results.data.map(row => ({
                id: row['ID Produto'] || row['id'],
                name: row['Produto'] || row['name']
            })).filter(x => x.id);
            localStorage.setItem('mb_db_prod', JSON.stringify(db_produtos));
            refreshStatus();
            alert("Sucesso! Banco de produtos atualizado.");
        }
    });
}

function triggerPriceImport(sup) {
    target_supplier = sup;
    document.getElementById('priceInput').click();
}

function processPriceCsv(input) {
    if(!input.files[0]) return;
    Papa.parse(input.files[0], {
        header: true,
        complete: (results) => {
            results.data.forEach(row => {
                const id = row['id'] || row['sku'] || row['ID Produto'];
                const preco = row['preco'] || row['valor'] || row['price'];
                if(id && preco) {
                    db_precos[`${id}_${target_supplier}`] = parseFloat(preco);
                }
            });
            localStorage.setItem('mb_db_prices', JSON.stringify(db_precos));
            renderPriceTable();
            alert(`Preços da ${target_supplier} carregados.`);
        }
    });
}

// --- GESTÃO DE PREÇOS (INTERFACE) ---
function renderPriceTable() {
    const query = document.getElementById('searchPrice').value.toLowerCase();
    const body = document.getElementById('priceBody');
    const suppliers = ['QUARTT', 'CNN', 'AG', 'GOLD'];
    
    const filtered = db_produtos.filter(p => 
        p.id.includes(query) || p.name.toLowerCase().includes(query)
    ).slice(0, 100);

    body.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td><small>${p.name}</small></td>
            ${suppliers.map(s => {
                const key = `${p.id}_${s}`;
                const val = db_precos[key] || '';
                return `<td><input type="number" step="0.01" class="input-price" 
                        style="width: 70px; padding: 4px; border-radius: 4px; border: 1px solid var(--border);"
                        value="${val}" onchange="manualPriceUpdate('${p.id}', '${s}', this.value)"></td>`;
            }).join('')}
        </tr>
    `).join('');
}

function manualPriceUpdate(id, sup, val) {
    db_precos[`${id}_${sup}`] = parseFloat(val);
    localStorage.setItem('mb_db_prices', JSON.stringify(db_precos));
}

// --- TRIAGEM (LÓGICA) ---
function previewProd() {
    const id = document.getElementById('inpId').value;
    const sup = document.getElementById('inpSup').value;
    const prod = db_produtos.find(p => p.id === id);
    const preco = db_precos[`${id}_${sup}`] || 0;
    
    const preview = document.getElementById('prevName');
    if(prod) {
        preview.innerHTML = `${prod.name} | <span style="color:var(--success)">R$ ${preco.toFixed(2)}</span>`;
    } else {
        preview.innerText = "";
    }
}

function addPeça() {
    const fields = {
        id: document.getElementById('inpId').value,
        bar: document.getElementById('inpBar').value,
        sup: document.getElementById('inpSup').value,
        date: document.getElementById('inpDate').value,
        reason: document.getElementById('inpReason').value
    };

    if(!fields.id || !fields.bar || !fields.date) {
        alert("⚠️ Erro: Preencha ID, Barcode e Data.");
        return;
    }

    if(lote_pool.some(x => x.barcode === fields.bar)) {
        alert("⚠️ Erro: Este Código de Barras já está no lote atual.");
        return;
    }

    const prod = db_produtos.find(p => p.id === fields.id);
    const preco = db_precos[`${fields.id}_${fields.sup}`] || 0;

    // Regra de Negócio: Se trincada ou estufada -> Descarte. Caso contrário -> Garantia.
    const status = (fields.reason.includes('Trincada') || fields.reason.includes('Estufada')) ? 'Descarte' : 'Garantia';

    const novoItem = {
        uid: Date.now(),
        ...fields,
        name: prod ? prod.name : 'NÃO CADASTRADO',
        price: preco,
        status: status
    };

    lote_pool.push(novoItem);
    localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
    
    updateRecentTable();
    clearTriagemForm();
}

function clearTriagemForm() {
    document.getElementById('inpId').value = "";
    document.getElementById('inpBar').value = "";
    document.getElementById('prevName').innerText = "";
}

function updateRecentTable() {
    const body = document.getElementById('recentBody');
    body.innerHTML = lote_pool.slice(-5).reverse().map(i => `
        <tr>
            <td><small>${i.name}</small></td>
            <td>${i.supplier}</td>
            <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${i.status}</span></td>
            <td style="font-weight:700">R$ ${i.price.toFixed(2)}</td>
        </tr>
    `).join('');
}

// --- DASHBOARD (KPIs) ---
function renderDashboard() {
    const total = lote_pool.length;
    const garItems = lote_pool.filter(x => x.status === 'Garantia');
    const garValue = garItems.reduce((acc, curr) => acc + curr.price, 0);
    const totalValue = lote_pool.reduce((acc, curr) => acc + curr.price, 0);
    const ticketMedio = total > 0 ? totalValue / total : 0;
    const taxaRec = total > 0 ? (garItems.length / total) * 100 : 0;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statGarValue').innerText = `R$ ${garValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('statAvg').innerText = `R$ ${ticketMedio.toFixed(2)}`;
    document.getElementById('statRec').innerText = `${taxaRec.toFixed(1)}%`;

    renderCharts();
}

function renderCharts() {
    const ctxVol = document.getElementById('chartVol').getContext('2d');
    const ctxCash = document.getElementById('chartCash').getContext('2d');
    
    if(active_charts.vol) active_charts.vol.destroy();
    if(active_charts.cash) active_charts.cash.destroy();

    const sups = ['QUARTT', 'CNN', 'AG', 'GOLD'];
    const colors = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b'];

    active_charts.vol = new Chart(ctxVol, {
        type: 'doughnut',
        data: {
            labels: sups,
            datasets: [{
                data: sups.map(s => lote_pool.filter(x => x.supplier === s).length),
                backgroundColor: colors
            }]
        }
    });

    active_charts.cash = new Chart(ctxCash, {
        type: 'bar',
        data: {
            labels: sups,
            datasets: [
                { 
                    label: 'Garantia (R$)', 
                    data: sups.map(s => lote_pool.filter(x => x.supplier === s && x.status === 'Garantia').reduce((a,b)=>a+b.price, 0)),
                    backgroundColor: '#16a34a'
                },
                { 
                    label: 'Descarte (R$)', 
                    data: sups.map(s => lote_pool.filter(x => x.supplier === s && x.status === 'Descarte').reduce((a,b)=>a+b.price, 0)),
                    backgroundColor: '#dc2626'
                }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// --- LOTE E EXPORTAÇÃO (FORMATO PREMIUM) ---
function renderLoteTable() {
    const body = document.getElementById('loteBody');
    body.innerHTML = lote_pool.slice().reverse().map(i => `
        <tr>
            <td><strong>${i.supplier}</strong></td>
            <td><small>${i.id}</small><br>${i.name}</td>
            <td><code>${i.barcode}</code></td>
            <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${i.status}</span></td>
            <td><small>${i.reason}</small></td>
            <td><button class="btn btn-outline" style="padding: 5px;" onclick="removeFromLote(${i.uid})">🗑️</button></td>
        </tr>
    `).join('');
}

function removeFromLote(uid) {
    lote_pool = lote_pool.filter(x => x.uid !== uid);
    localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
    renderLoteTable();
}

async function exportFiltered(status) {
    const sup = document.getElementById('selSup').value;
    const data = lote_pool.filter(x => x.supplier === sup && x.status === status);
    if(data.length === 0) return alert("Nada para exportar com esses filtros.");
    
    await generateExcel(`TRIAGEM_${sup}_${status.toUpperCase()}`, data);
}

async function exportGeral() {
    if(lote_pool.length === 0) return alert("O lote está vazio.");
    await generateExcel(`LOTE_GERAL_CONSOLIDADO`, lote_pool);
}

async function generateExcel(baseName, data) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Peças');

    // Definição de Colunas
    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'ID PRODUTO', key: 'id', width: 15 },
        { header: 'NOME DO PRODUTO', key: 'name', width: 40 },
        { header: 'CÓDIGO DE BARRAS', key: 'barcode', width: 25 },
        { header: 'STATUS', key: 'status', width: 15 },
        { header: 'MOTIVO', key: 'reason', width: 25 },
        { header: 'VALOR UNIT.', key: 'price', width: 15 },
        { header: 'DATA ENTRADA', key: 'date', width: 15 }
    ];

    // Estilização Profissional
    worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        cell.alignment = { horizontal: 'center' };
    });

    data.forEach((item, index) => {
        const row = worksheet.addRow(item);
        // Zebra Stripes
        if(index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
        
        // Formatação de Preço
        row.getCell('price').numFmt = '"R$ "#,##0.00';
        
        // Cores no Status
        const statusCell = row.getCell('status');
        if(item.status === 'Garantia') statusCell.font = { color: { argb: '16A34A' }, bold: true };
        else statusCell.font = { color: { argb: 'DC2626' }, bold: true };
    });

    // Gerar Buffer e Salvar
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${baseName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

    // Salvar no Cofre e Limpar Lote
    export_vault.push({ name: fileName, date: new Date().toLocaleString(), count: data.length });
    localStorage.setItem('mb_vault', JSON.stringify(export_vault));

    if(confirm("Arquivo gerado! Deseja remover estes itens do lote em aberto?")) {
        const exportedUids = data.map(d => d.uid);
        lote_pool = lote_pool.filter(p => !exportedUids.includes(p.uid));
        localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
        renderLoteTable();
    }
}

function renderVault() {
    const body = document.getElementById('vaultBody');
    body.innerHTML = export_vault.slice().reverse().map(v => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1.25rem;">
            <div>
                <strong>${v.name}</strong><br>
                <small style="color:#64748b">${v.date} — ${v.count} itens processados</small>
            </div>
            <span class="badge badge-garantia" style="background:#f1f5f9; color:var(--navy-dark); border:none;">Arquivado</span>
        </div>
    `).join('');
}
