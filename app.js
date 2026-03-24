/**
 * LÓGICA DE NEGÓCIO - SISTEMA DE TRIAGEM
 * Mantendo persistência via LocalStorage e exportação formatada ExcelJS
 */

let productDatabase = JSON.parse(localStorage.getItem('metas_db')) || {};
let itemsPool = JSON.parse(localStorage.getItem('metas_pool')) || [];
let exportVault = JSON.parse(localStorage.getItem('metas_vault')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateRecentTable();
    updateFullTable();
    updateVault();
    if(Object.keys(productDatabase).length > 0) {
        document.getElementById('dbStatus').innerText = "✅ Banco de Dados Carregado";
    }
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    
    // Identifica o botão clicado para ativar
    const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if(btn) btn.classList.add('active');
    
    if(tabId === 'historico') updateFullTable();
    if(tabId === 'arquivados') updateVault();
}

// Banco de Dados
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
        }
    });
});

function previewProduct() {
    const id = document.getElementById('productId').value.trim();
    const preview = document.getElementById('productNamePreview');
    preview.innerText = productDatabase[id] || (id ? "❌ Não cadastrado" : "");
}

// Triagem
function addItem() {
    const id = document.getElementById('productId').value.trim();
    const barcode = document.getElementById('barcode').value.trim();
    const supplier = document.getElementById('supplier').value;
    const date = document.getElementById('purchaseDate').value;
    const reason = document.getElementById('reason').value;

    if(!id || !barcode || !date) return alert("Erro: Campos ID, Barcode ou Data vazios.");

    const productName = productDatabase[id] || "PRODUTO NÃO IDENTIFICADO";
    const statusResult = engineValidation(productName, supplier, date, reason);

    const entry = {
        uid: Date.now(),
        id, productName, barcode, supplier, date, reason,
        status: statusResult.status,
        justification: statusResult.justification
    };

    itemsPool.push(entry);
    localStorage.setItem('metas_pool', JSON.stringify(itemsPool));
    
    updateRecentTable();
    document.getElementById('productId').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('productNamePreview').innerText = '';
}

function engineValidation(name, supplier, date, reason) {
    const purchaseDate = new Date(date);
    const today = new Date();
    const diffMonths = (today - purchaseDate) / (1000 * 60 * 60 * 24 * 30.44);

    if (supplier === 'IMPORTADA') return { status: 'Descarte', justification: 'Fornecedor Importado' };
    if (reason === 'Tela Trincada' || reason === 'Bateria Estufada') return { status: 'Descarte', justification: 'Dano Físico/Estufado' };

    const isBattery = name.toLowerCase().includes('bateria');
    const limit = isBattery ? 6 : 12;

    if (diffMonths > limit) {
        return { status: 'Descarte', justification: `Excedeu ${limit} meses` };
    }
    return { status: 'Garantia', justification: 'Dentro das normas' };
}

// Tabelas e UI
function updateRecentTable() {
    const body = document.getElementById('recentBody');
    body.innerHTML = itemsPool.slice(-10).reverse().map(item => `
        <tr>
            <td>${item.supplier}</td>
            <td><strong>${item.productName}</strong></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
        </tr>
    `).join('');
}

function updateFullTable() {
    const body = document.getElementById('fullBody');
    body.innerHTML = itemsPool.slice().reverse().map(item => `
        <tr>
            <td>${item.supplier}</td>
            <td><strong>${item.productName}</strong><br><small>${item.id}</small></td>
            <td><code>${item.barcode}</code></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
            <td>
                <button class="btn" onclick="editItem(${item.uid})">✏️</button>
                <button class="btn" style="color:red" onclick="deleteItem(${item.uid})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function deleteItem(uid) {
    itemsPool = itemsPool.filter(i => i.uid !== uid);
    localStorage.setItem('metas_pool', JSON.stringify(itemsPool));
    updateFullTable();
}

function editItem(uid) {
    const item = itemsPool.find(i => i.uid === uid);
    const newBar = prompt("Corrigir Barcode:", item.barcode);
    if(newBar) {
        item.barcode = newBar;
        localStorage.setItem('metas_pool', JSON.stringify(itemsPool));
        updateFullTable();
    }
}

// Exportação Excel Premium
async function exportData(type) {
    const selSupplier = document.getElementById('filterSupplier').value;
    const data = itemsPool.filter(i => i.status === type && i.supplier === selSupplier);

    if(data.length === 0) return alert("Nenhum item encontrado.");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);

    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'ID', key: 'id', width: 10 },
        { header: 'PRODUTO', key: 'productName', width: 45 },
        { header: 'BARRAS', key: 'barcode', width: 20 },
        { header: 'DATA', key: 'date', width: 12 },
        { header: 'MOTIVO', key: 'reason', width: 20 },
        { header: 'STATUS', key: 'justification', width: 25 }
    ];

    // Estilização do Título/Cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
    });

    data.forEach(item => worksheet.addRow(item));

    const filename = `RELATORIO_${type.toUpperCase()}_${selSupplier}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), filename);

    // Salvar no Cofre
    exportVault.push({
        id: Date.now(),
        filename,
        timestamp: new Date().toLocaleString(),
        content: data,
        type: type
    });
    localStorage.setItem('metas_vault', JSON.stringify(exportVault));
    
    if(confirm("Deseja remover estes itens da lista de pendentes?")) {
        itemsPool = itemsPool.filter(i => !(i.status === type && i.supplier === selSupplier));
        localStorage.setItem('metas_pool', JSON.stringify(itemsPool));
        updateFullTable();
    }
    updateVault();
}

function updateVault() {
    const list = document.getElementById('vaultList');
    list.innerHTML = exportVault.slice().reverse().map(v => `
        <div class="vault-item">
            <div><strong>${v.filename}</strong><br><small>${v.timestamp}</small></div>
            <button class="btn btn-success" onclick="downloadAgain(${v.id})">Baixar Novamente</button>
        </div>
    `).join('');
}

async function downloadAgain(id) {
    const v = exportVault.find(x => x.id === id);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Re-export');
    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 15 },
        { header: 'ID', key: 'id', width: 10 },
        { header: 'PRODUTO', key: 'productName', width: 45 },
        { header: 'BARRAS', key: 'barcode', width: 20 },
        { header: 'DATA', key: 'date', width: 12 },
        { header: 'MOTIVO', key: 'reason', width: 20 }
    ];
    worksheet.getRow(1).eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.font = { color: { argb: 'FFFFFF' }, bold: true };
    });
    v.content.forEach(row => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), v.filename);
}
