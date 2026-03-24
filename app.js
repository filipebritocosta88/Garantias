/**
 * SISTEMA DE TRIAGEM PROFISSIONAL - ARQUITETURA ROBUSTA
 */

let productDatabase = JSON.parse(localStorage.getItem('metas_db')) || {};
let itemsPool = JSON.parse(localStorage.getItem('metas_pool')) || [];
let exportVault = JSON.parse(localStorage.getItem('metas_vault')) || [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    updateRecentTable();
    updateFullTable();
    updateVault();
    if(Object.keys(productDatabase).length > 0) {
        document.getElementById('dbStatus').innerText = "✅ Banco de Dados Ativo";
    }
});

// 1. Controle de Navegação
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if(tabId === 'historico') updateFullTable();
    if(tabId === 'arquivados') updateVault();
}

// 2. Processamento do Banco de Dados (CSV)
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            productDatabase = {};
            results.data.forEach(row => {
                const id = row['ID Produto'] || row['id'];
                if(id) productDatabase[id] = row['Produto'] || row['name'];
            });
            localStorage.setItem('metas_db', JSON.stringify(productDatabase));
            document.getElementById('dbStatus').innerText = "✅ Banco Atualizado (" + Object.keys(productDatabase).length + " itens)";
            alert("Banco de dados processado com sucesso!");
        }
    });
});

function previewProduct() {
    const id = document.getElementById('productId').value.trim();
    const preview = document.getElementById('productNamePreview');
    preview.innerText = productDatabase[id] || (id ? "❌ Não encontrado" : "");
}

// 3. Lógica de Triagem
function addItem() {
    const id = document.getElementById('productId').value.trim();
    const barcode = document.getElementById('barcode').value.trim();
    const supplier = document.getElementById('supplier').value;
    const date = document.getElementById('purchaseDate').value;
    const reason = document.getElementById('reason').value;

    if(!id || !barcode || !date) return alert("Por favor, preencha todos os campos e bipe o código.");

    const productName = productDatabase[id] || "PRODUTO DESCONHECIDO";
    const analysis = runEngine(productName, supplier, date, reason);

    const entry = {
        uid: Date.now(),
        id,
        productName,
        barcode,
        supplier,
        date,
        reason,
        status: analysis.status,
        justification: analysis.justification
    };

    itemsPool.push(entry);
    savePool();
    updateRecentTable();
    
    // Reset campos rápidos
    document.getElementById('productId').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('productNamePreview').innerText = '';
}

function runEngine(name, supplier, date, reason) {
    const purchaseDate = new Date(date);
    const today = new Date();
    const diffMonths = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 30.44);

    if (supplier === 'IMPORTADA') return { status: 'Descarte', justification: 'Fornecedor Importado' };
    if (reason === 'Tela Trincada' || reason === 'Bateria Estufada') return { status: 'Descarte', justification: 'Dano Físico/Estufado' };

    const isBattery = name.toLowerCase().includes('bateria');
    const limit = isBattery ? 6 : 12;

    if (diffMonths > limit) {
        return { status: 'Descarte', justification: `Prazo excedido (${Math.floor(diffMonths)} meses)` };
    }

    return { status: 'Garantia', justification: 'OK' };
}

// 4. Gerenciamento de Dados
function savePool() { localStorage.setItem('metas_pool', JSON.stringify(itemsPool)); }

function deleteItem(uid) {
    itemsPool = itemsPool.filter(i => i.uid !== uid);
    savePool();
    updateFullTable();
}

function editItem(uid) {
    const item = itemsPool.find(i => i.uid === uid);
    const newBarcode = prompt("Novo Código de Barras:", item.barcode);
    if(newBarcode) {
        item.barcode = newBarcode;
        savePool();
        updateFullTable();
    }
}

// 5. Tabelas
function updateRecentTable() {
    const body = document.getElementById('recentBody');
    body.innerHTML = itemsPool.slice(-10).reverse().map(item => `
        <tr>
            <td>${item.supplier}</td>
            <td><strong>${item.productName}</strong></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
            <td>${item.reason}</td>
        </tr>
    `).join('');
}

function updateFullTable() {
    const body = document.getElementById('fullBody');
    body.innerHTML = itemsPool.slice().reverse().map(item => `
        <tr>
            <td>${item.supplier}</td>
            <td>${item.id}</td>
            <td>${item.productName}</td>
            <td><code>${item.barcode}</code></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
            <td>
                <button class="btn" style="background:#f1f5f9" onclick="editItem(${item.uid})">✏️</button>
                <button class="btn btn-danger" onclick="deleteItem(${item.uid})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// 6. EXPORTAÇÃO PREMIUM (ExcelJS)
async function exportData(type) {
    const selectedSupplier = document.getElementById('filterSupplier').value;
    const toExport = itemsPool.filter(i => i.status === type && i.supplier === selectedSupplier);

    if(toExport.length === 0) return alert("Nada encontrado para este fornecedor nesta categoria.");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);

    // Configuração de Colunas
    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'ID', key: 'id', width: 10 },
        { header: 'PRODUTO', key: 'productName', width: 40 },
        { header: 'CÓD. BARRAS', key: 'barcode', width: 20 },
        { header: 'DATA COMPRA', key: 'date', width: 15 },
        { header: 'MOTIVO', key: 'reason', width: 25 },
        { header: 'JUSTIFICATIVA', key: 'justification', width: 30 }
    ];

    // Estilo do Cabeçalho (O que a diretoria quer ver)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true, size: 12 };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    // Adicionar Dados e Bordas
    toExport.forEach(item => {
        const row = worksheet.addRow(item);
        row.eachCell(cell => {
            cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });
    });

    // Salvar no Cofre antes de baixar
    const filename = `Relatorio_${type.toUpperCase()}_${selectedSupplier}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
    
    // Gerar Buffer e Download
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);

    // Registrar no Cofre
    const vaultEntry = {
        date: new Date().toLocaleString(),
        filename,
        supplier: selectedSupplier,
        type: type,
        count: toExport.length,
        data: toExport
    };
    exportVault.push(vaultEntry);
    localStorage.setItem('metas_vault', JSON.stringify(exportVault));

    // Limpar do pool (opcional - você decide se quer limpar após exportar)
    if(confirm("Deseja remover estes itens do lote em aberto?")) {
        itemsPool = itemsPool.filter(i => !(i.status === type && i.supplier === selectedSupplier));
        savePool();
        updateFullTable();
    }
}

function updateVault() {
    const list = document.getElementById('vaultList');
    list.innerHTML = exportVault.slice().reverse().map((exp, index) => `
        <div class="export-item">
            <div>
                <strong>${exp.filename}</strong><br>
                <small>${exp.date} | ${exp.count} itens</small>
            </div>
            <button class="btn btn-success" onclick="reDownload(${exportVault.length - 1 - index})">Re-baixar</button>
        </div>
    `).join('');
}

async function reDownload(index) {
    const exp = exportVault[index];
    // Aqui recriamos o Excel a partir dos dados salvos no vault
    // Por simplicidade de código, chamamos a lógica de exportação novamente com os dados do vault
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(exp.type);
    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'ID', key: 'id', width: 10 },
        { header: 'PRODUTO', key: 'productName', width: 40 },
        { header: 'CÓD. BARRAS', key: 'barcode', width: 20 },
        { header: 'DATA COMPRA', key: 'date', width: 15 },
        { header: 'MOTIVO', key: 'reason', width: 25 },
        { header: 'JUSTIFICATIVA', key: 'justification', width: 30 }
    ];
    
    // Re-aplica estilo
    worksheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    exp.data.forEach(d => worksheet.addRow(d));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), exp.filename);
}
