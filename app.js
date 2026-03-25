/**
 * SISTEMA DE TRIAGEM PROFISSIONAL - VERSÃO 2026.1
 * Foco em Integridade de Dados, Gestão Financeira e KPIs.
 */

// Persistência de Dados
let dbProdutos = JSON.parse(localStorage.getItem('meta_db')) || {};
let poolTriagem = JSON.parse(localStorage.getItem('meta_pool')) || [];
let dbPrecos = JSON.parse(localStorage.getItem('meta_prices')) || {}; 
let cofreExport = JSON.parse(localStorage.getItem('meta_vault')) || [];
let activeCharts = {};

document.addEventListener('DOMContentLoaded', () => {
    if(Object.keys(dbProdutos).length > 0) document.getElementById('dbStatus').innerText = "✅ Banco de Dados Ativo";
    renderPrices();
    updateTables();
    updateVault();
});

// Navegação entre Abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Ativa o botão correspondente
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.innerText.toLowerCase().includes(tabId === 'precos' ? 'preços' : tabId));
    if(btn) btn.classList.add('active');

    if(tabId === 'dashboard') renderCharts();
    if(tabId === 'historico') updateTables();
}

// 1. GESTÃO DO BANCO DE DADOS (CSV)
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(res) {
            dbProdutos = {};
            res.data.forEach(row => {
                const id = row['ID Produto'] || row['id'];
                if(id) dbProdutos[id] = row['Produto'] || row['name'];
            });
            localStorage.setItem('meta_db', JSON.stringify(dbProdutos));
            document.getElementById('dbStatus').innerText = "✅ Banco Atualizado (" + Object.keys(dbProdutos).length + " itens)";
            alert("Sucesso: Banco de dados importado.");
        }
    });
});

// 2. GESTÃO DE PREÇOS
function savePrice() {
    const id = document.getElementById('priceId').value.trim();
    const sup = document.getElementById('priceSupplier').value;
    const val = parseFloat(document.getElementById('priceValue').value);

    if(!id || isNaN(val)) return alert("Erro: ID e Valor são obrigatórios.");

    const key = `${id}_${sup}`;
    dbPrecos[key] = val;
    localStorage.setItem('meta_prices', JSON.stringify(dbPrecos));
    renderPrices();
    document.getElementById('priceId').value = '';
    document.getElementById('priceValue').value = '';
}

function renderPrices() {
    const tbody = document.getElementById('priceListBody');
    tbody.innerHTML = Object.keys(dbPrecos).map(key => {
        const [id, sup] = key.split('_');
        return `<tr><td>${id}</td><td>${sup}</td><td class="price-text">R$ ${dbPrecos[key].toFixed(2)}</td>
                <td><button class="btn btn-edit" onclick="removePrice('${key}')">Remover</button></td></tr>`;
    }).join('');
}

function removePrice(key) {
    delete dbPrecos[key];
    localStorage.setItem('meta_prices', JSON.stringify(dbPrecos));
    renderPrices();
}

// 3. LOGICA DE TRIAGEM
function previewProduct() {
    const id = document.getElementById('productId').value.trim();
    const sup = document.getElementById('supplier').value;
    const preview = document.getElementById('previewName');
    const nome = dbProdutos[id] || "ID não localizado no banco";
    const preco = dbPrecos[`${id}_${sup}`] || 0;
    preview.innerHTML = `${nome} | <span class="price-text">R$ ${preco.toFixed(2)}</span>`;
}

function addItem() {
    const id = document.getElementById('productId').value.trim();
    const bar = document.getElementById('barcode').value.trim();
    const sup = document.getElementById('supplier').value;
    const date = document.getElementById('purchaseDate').value;
    const reason = document.getElementById('reason').value;

    if(!id || !bar || !date) return alert("Erro: Preencha todos os campos e bipe o código.");

    // Validação de Duplicidade (Nível Sênior)
    if(poolTriagem.some(item => item.barcode === bar)) {
        alert("⚠️ ATENÇÃO: Este código de barras já foi registrado neste lote!");
        return;
    }

    const nome = dbProdutos[id] || "PRODUTO DESCONHECIDO";
    const preco = dbPrecos[`${id}_${sup}`] || 0;
    const analise = julgarGarantia(nome, sup, date, reason);

    const novoItem = {
        uid: Date.now(),
        id, nome, barcode: bar, supplier: sup, date, reason,
        price: preco, status: analise.status, justification: analise.justification
    };

    poolTriagem.push(novoItem);
    localStorage.setItem('meta_pool', JSON.stringify(poolTriagem));
    
    updateTables();
    document.getElementById('productId').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('previewName').innerText = '';
}

function julgarGarantia(nome, sup, date, reason) {
    const pDate = new Date(date);
    const hoje = new Date();
    const meses = (hoje - pDate) / (1000 * 60 * 60 * 24 * 30.44);

    if (sup === 'IMPORTADA') return { status: 'Descarte', justification: 'Forn. Importada' };
    if (reason.includes('Trincada') || reason.includes('Estufada')) return { status: 'Descarte', justification: 'Dano Físico' };

    const limite = nome.toLowerCase().includes('bateria') ? 6 : 12;
    return meses <= limite ? { status: 'Garantia', justification: 'Dentro do Prazo' } : { status: 'Descarte', justification: 'Prazo Excedido' };
}

// 4. TABELAS E EDIÇÃO
function updateTables() {
    const recent = document.getElementById('recentBody');
    recent.innerHTML = poolTriagem.slice(-10).reverse().map(i => `
        <tr><td>${i.supplier}</td><td><strong>${i.nome}</strong></td>
        <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia':'badge-descarte'}">${i.status}</span></td>
        <td class="price-text">R$ ${i.price.toFixed(2)}</td></tr>
    `).join('');

    const full = document.getElementById('fullBody');
    full.innerHTML = poolTriagem.slice().reverse().map(i => `
        <tr><td>${i.supplier}</td><td>${i.nome}<br><small>${i.id}</small></td><td><code>${i.barcode}</code></td>
        <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia':'badge-descarte'}">${i.status}</span></td>
        <td>
            <button class="btn btn-edit" onclick="editItem(${i.uid})">✏️</button>
            <button class="btn btn-edit" style="color:red" onclick="removeItem(${i.uid})">🗑️</button>
        </td></tr>
    `).join('');
}

function removeItem(uid) {
    poolTriagem = poolTriagem.filter(i => i.uid !== uid);
    localStorage.setItem('meta_pool', JSON.stringify(poolTriagem));
    updateTables();
}

function editItem(uid) {
    const item = poolTriagem.find(i => i.uid === uid);
    const novoBar = prompt("Corrigir Barcode:", item.barcode);
    if(novoBar) {
        item.barcode = novoBar;
        localStorage.setItem('meta_pool', JSON.stringify(poolTriagem));
        updateTables();
    }
}

// 5. DASHBOARD (CHART.JS)
function renderCharts() {
    if(activeCharts.pie) activeCharts.pie.destroy();
    if(activeCharts.bar) activeCharts.bar.destroy();

    const sups = ["QUARTT", "AG", "CNN", "GOLD", "IMPORTADA"];
    const cores = ['#2563eb', '#16a34a', '#dc2626', '#eab308', '#64748b'];
    
    const countData = sups.map(s => poolTriagem.filter(i => i.supplier === s).length);
    const recuperado = sups.map(s => poolTriagem.filter(i => i.supplier === s && i.status === 'Garantia').reduce((a, b) => a + b.price, 0));
    const prejuizo = sups.map(s => poolTriagem.filter(i => i.supplier === s && i.status === 'Descarte').reduce((a, b) => a + b.price, 0));

    activeCharts.pie = new Chart(document.getElementById('chartPie'), {
        type: 'doughnut',
        data: { labels: sups, datasets: [{ data: countData, backgroundColor: cores }] }
    });

    activeCharts.bar = new Chart(document.getElementById('chartBar'), {
        type: 'bar',
        data: {
            labels: sups,
            datasets: [
                { label: 'Garantia (R$)', data: recuperado, backgroundColor: '#16a34a' },
                { label: 'Descarte (R$)', data: prejuizo, backgroundColor: '#dc2626' }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// 6. EXPORTAÇÃO EXCEL PREMIUM
async function exportExcel(tipo) {
    const sup = document.getElementById('exportFilter').value;
    const dados = poolTriagem.filter(i => i.status === tipo && i.supplier === sup);

    if(!dados.length) return alert("Nenhum item encontrado para exportar.");

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(tipo);

    // Titulo e Estilo
    ws.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'PRODUTO', key: 'nome', width: 40 },
        { header: 'BARCODE', key: 'barcode', width: 25 },
        { header: 'DATA COMPRA', key: 'date', width: 15 },
        { header: 'VALOR R$', key: 'price', width: 12 },
        { header: 'MOTIVO', key: 'reason', width: 20 },
        { header: 'ANALISE', key: 'justification', width: 20 }
    ];

    ws.getRow(1).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        c.font = { color: { argb: 'FFFFFF' }, bold: true };
        c.alignment = { horizontal: 'center' };
    });

    dados.forEach(i => ws.addRow(i));

    const fileName = `RELATORIO_${tipo.toUpperCase()}_${sup}_${new Date().getTime()}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);

    // Salvar no Cofre
    cofreExport.push({ fileName, data: new Date().toLocaleString(), items: dados, tipo });
    localStorage.setItem('meta_vault', JSON.stringify(cofreExport));
    
    if(confirm("Deseja remover estes itens do lote em aberto?")) {
        poolTriagem = poolTriagem.filter(i => !(i.status === tipo && i.supplier === sup));
        localStorage.setItem('meta_pool', JSON.stringify(poolTriagem));
        updateTables();
    }
    updateVault();
}

function updateVault() {
    const v = document.getElementById('vaultContainer');
    v.innerHTML = cofreExport.slice().reverse().map((exp, idx) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1rem">
            <div><strong>${exp.fileName}</strong><br><small>${exp.data}</small></div>
            <button class="btn btn-success" style="padding:0.4rem 1rem" onclick="reExport(${cofreExport.length - 1 - idx})">Baixar</button>
        </div>
    `).join('');
}

async function reExport(idx) {
    const exp = cofreExport[idx];
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Relatorio');
    ws.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'PRODUTO', key: 'nome', width: 40 },
        { header: 'BARCODE', key: 'barcode', width: 25 },
        { header: 'VALOR R$', key: 'price', width: 12 }
    ];
    ws.getRow(1).font = { bold: true };
    exp.items.forEach(i => ws.addRow(i));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), exp.fileName);
}
