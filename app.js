let productDatabase = {};
let processedItems = [];

// 1. Carregar o Banco de Dados do CSV
document.getElementById('csvFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            results.data.forEach(row => {
                if(row['ID Produto']) {
                    productDatabase[row['ID Produto']] = row['Produto'];
                }
            });
            alert('Banco de dados carregado com sucesso!');
        }
    });
});

function processItem() {
    const id = document.getElementById('productId').value;
    const barcode = document.getElementById('barcode').value;
    const supplier = document.getElementById('supplier').value;
    const date = document.getElementById('purchaseDate').value;
    const reason = document.getElementById('reason').value;

    if (!id || !supplier || !date || !reason) {
        alert("Preencha todos os campos!");
        return;
    }

    const productName = productDatabase[id] || "Produto Não Encontrado";
    const statusObj = checkStatus(productName, supplier, date, reason);

    const newItem = {
        id,
        productName,
        barcode,
        supplier,
        date,
        reason,
        status: statusObj.status,
        justification: statusObj.justification
    };

    processedItems.push(newItem);
    updateTable();
    clearInputs();
}

function checkStatus(name, supplier, date, reason) {
    const purchaseDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today - purchaseDate);
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);

    // Regra 1: Importada é descarte direto
    if (supplier === 'IMPORTADA') return { status: 'Descarte', justification: 'Fornecedor Importado' };

    // Regra 2: Motivos físicos (Tela trincada ou bateria estufada)
    if (reason === 'Tela Trincada' || reason === 'Bateria Estufada') {
        return { status: 'Descarte', justification: 'Dano Físico/Estufado' };
    }

    // Regra 3: Tempo de Garantia (Bateria 6 meses, Resto 12 meses)
    const isBattery = name.toLowerCase().includes('bateria');
    const limit = isBattery ? 6 : 12;

    if (diffMonths > limit) {
        return { status: 'Descarte', justification: `Prazo excedido (${Math.floor(diffMonths)} meses)` };
    }

    return { status: 'Garantia', justification: 'Dentro do prazo e normas' };
}

function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    processedItems.slice().reverse().forEach((item, index) => {
        const row = `<tr>
            <td>${item.supplier}</td>
            <td><strong>${item.productName}</strong><br><small>${item.id}</small></td>
            <td>${item.barcode}</td>
            <td><span class="status-badge ${item.status === 'Garantia' ? 'status-garantia' : 'status-descarte'}">${item.status}</span></td>
            <td><small>${item.justification}</small></td>
        </tr>`;
        tbody.innerHTML += row;
    });
}

function clearInputs() {
    document.getElementById('productId').value = '';
    document.getElementById('barcode').value = '';
    document.getElementById('reason').value = '';
}

function exportData(type) {
    const filtered = processedItems.filter(item => item.status.toLowerCase() === type);
    
    if (filtered.length === 0) {
        alert("Nenhum dado para exportar nessa categoria.");
        return;
    }

    // Organizar por fornecedor para o relatório
    filtered.sort((a, b) => a.supplier.localeCompare(b.supplier));

    let csvContent = "data:text/csv;charset=utf-8,Fornecedor,ID,Produto,Barcode,Data Compra,Motivo,Justificativa\n";
    
    filtered.forEach(item => {
        csvContent += `${item.supplier},${item.id},${item.productName},${item.barcode},${item.date},${item.reason},${item.justification}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Relatorio_${type.toUpperCase()}_Metasboard.csv`);
    document.body.appendChild(link);
    link.click();
}
