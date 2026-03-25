/**
 * METASBOARD CORE SYSTEM
 * Versão: 2.0 - Estabilidade Total
 */

// --- ESTADO DA APLICAÇÃO ---
let db_produtos = JSON.parse(localStorage.getItem('mb_db_prod')) || [];
let db_precos = JSON.parse(localStorage.getItem('mb_db_prices')) || {};
let lote_pool = JSON.parse(localStorage.getItem('mb_lote_pool')) || [];
let export_vault = JSON.parse(localStorage.getItem('mb_vault')) || [];
let current_import_target = "";
let chartInstance = null;

// --- SISTEMA DE NAVEGAÇÃO (CORREÇÃO DE TELAS) ---
function switchTab(tabId) {
    console.log("Iniciando troca para:", tabId);
    
    // 1. Ocultar todas as telas fisicamente
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = "none";
    });

    // 2. Desativar todos os botões da sidebar
    const allBtns = document.querySelectorAll('.nav-btn');
    allBtns.forEach(btn => btn.classList.remove('active'));

    // 3. Mostrar a tela alvo
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = "block";
    }

    // 4. Ativar o botão correspondente
    const activeBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // 5. Gatilhos de atualização por tela
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'precos') renderPriceTable();
    if (tabId === 'lote') renderLoteTable();
    if (tabId === 'cofre') renderVault();
}

// --- IMPORTAÇÃO DE BANCO MASTER (CSV) ---
function importMaster(input) {
    if (!input.files[0]) return;
    
    Papa.parse(input.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            db_produtos = results.data.map(row => ({
                id: row['ID Produto'] || row['id'],
                name: row['Produto'] || row['name']
            })).filter(x => x.id);

            localStorage.setItem('mb_db_prod', JSON.stringify(db_produtos));
            document.getElementById('masterStatus').innerHTML = `✅ ${db_produtos.length} Produtos Carregados`;
            alert("Sucesso! Banco de dados atualizado.");
        }
    });
}

// --- GESTÃO DE PREÇOS ---
function triggerPriceImport(sup) {
    current_import_target = sup;
    document.getElementById('priceInput').click();
}

function processPriceCsv(input) {
    if (!input.files[0]) return;
    
    Papa.parse(input.files[0], {
        header: true,
        complete: function(results) {
            results.data.forEach(row => {
                const id = row['id'] || row['ID Produto'];
                const preco = row['preco'] || row['valor'];
                if (id && preco) {
                    const val = parseFloat(preco.toString().replace(',','.').replace('R$', '').trim());
                    db_precos[`${id}_${current_import_target}`] = val;
                }
            });
            localStorage.setItem('mb_db_prices', JSON.stringify(db_precos));
            renderPriceTable();
            alert(`Tabela ${current_import_target} processada.`);
            input.value = "";
        }
    });
}

function renderPriceTable() {
    const search = document.getElementById('searchPrice').value.toLowerCase();
    const body = document.getElementById('priceBody');
    const sups = ['QUARTT', 'CNN', 'AG', 'GOLD'];

    const filtered = db_produtos.filter(p => 
        p.id.toString().includes(search) || p.name.toLowerCase().includes(search)
    ).slice(0, 100);

    body.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.id}</strong></td>
            <td><small>${p.name}</small></td>
            ${sups.map(s => `<td>R$ ${(db_precos[`${p.id}_${s}`] || 0).toFixed(2)}</td>`).join('')}
        </tr>
    `).join('');
}

// --- LÓGICA DE TRIAGEM ---
function previewProd() {
    const id = document.getElementById('inpId').value;
    const prod = db_produtos.find(p => p.id == id);
    document.getElementById('prevName').innerText = prod ? `📦 ${prod.name}` : "";
}

function addPeça() {
    const fields = {
        id: document.getElementById('inpId').value,
        bar: document.getElementById('inpBar').value,
        sup: document.getElementById('inpSup').value,
        date: document.getElementById('inpDate').value,
        reason: document.getElementById('inpReason').value
    };

    if (!fields.id || !fields.bar || !fields.date) {
        return alert("Erro: Preencha ID, Barcode e Data.");
    }

    if (lote_pool.some(i => i.barcode === fields.bar)) {
        return alert("Atenção: Este Barcode já está no lote!");
    }

    const prod = db_produtos.find(p => p.id == fields.id);
    const preco = db_precos[`${fields.id}_${fields.sup}`] || 0;
    const status = (fields.reason.includes('Trincada') || fields.reason.includes('Estufada')) ? 'Descarte' : 'Garantia';

    lote_pool.push({
        uid: Date.now(),
        id: fields.id,
        name: prod ? prod.name : 'N/A',
        barcode: fields.bar,
        supplier: fields.sup,
        date: fields.date,
        reason: fields.reason,
        price: preco,
        status: status
    });

    localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
    
    // Limpeza de campos para próximo bip
    document.getElementById('inpId').value = "";
    document.getElementById('inpBar').value = "";
    document.getElementById('inpId').focus();
    previewProd();
    alert("Item Registrado!");
}

// --- DASHBOARD ---
function renderDashboard() {
    const total = lote_pool.length;
    const garItems = lote_pool.filter(x => x.status === 'Garantia');
    const garVal = garItems.reduce((a, b) => a + b.price, 0);
    const desRate = total > 0 ? (lote_pool.filter(x => x.status === 'Descarte').length / total * 100).toFixed(1) : 0;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statGarValue').innerText = `R$ ${garVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('statDesRate').innerText = `${desRate}%`;

    const ctx = document.getElementById('chartVol').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['QUARTT', 'CNN', 'AG', 'GOLD'],
            datasets: [{
                data: ['QUARTT', 'CNN', 'AG', 'GOLD'].map(s => lote_pool.filter(x => x.supplier === s).length),
                backgroundColor: ['#2563eb', '#16a34a', '#dc2626', '#f59e0b']
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

// --- LOTE E EXPORTAÇÃO ---
function renderLoteTable() {
    const body = document.getElementById('loteBody');
    body.innerHTML = lote_pool.slice().reverse().map(i => `
        <tr>
            <td><strong>${i.supplier}</strong></td>
            <td><small>${i.name}</small></td>
            <td><code>${i.barcode}</code></td>
            <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${i.status}</span></td>
            <td><button onclick="removeLote(${i.uid})" style="background:none; border:none; cursor:pointer;">🗑️</button></td>
        </tr>
    `).join('');
}

function removeLote(uid) {
    if (confirm("Remover item?")) {
        lote_pool = lote_pool.filter(i => i.uid !== uid);
        localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
        renderLoteTable();
    }
}

async function exportGeral() {
    if (lote_pool.length === 0) return alert("Lote vazio!");
    
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Relatório Triagem');

    ws.columns = [
        { header: 'Fornecedor', key: 'supplier', width: 15 },
        { header: 'Produto', key: 'name', width: 40 },
        { header: 'Barcode', key: 'barcode', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Preço', key: 'price', width: 15 },
        { header: 'Data', key: 'date', width: 15 }
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };

    lote_pool.forEach(item => ws.addRow(item));

    const buf = await wb.xlsx.writeBuffer();
    const fileName = `Export_Triagem_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buf]), fileName);

    export_vault.push({ name: fileName, date: new Date().toLocaleString(), count: lote_pool.length });
    localStorage.setItem('mb_vault', JSON.stringify(export_vault));
}

function renderVault() {
    const body = document.getElementById('vaultBody');
    body.innerHTML = export_vault.slice().reverse().map(v => `
        <div style="padding: 1rem; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 10px; display:flex; justify-content:space-between;">
            <div><strong>${v.name}</strong><br><small>${v.date}</small></div>
            <div style="font-weight:800;">${v.count} itens</div>
        </div>
    `).join('');
}

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    if (db_produtos.length > 0) document.getElementById('masterStatus').innerText = `✅ ${db_produtos.length} Produtos Ativos`;
    switchTab('triagem');
});
