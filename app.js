// --- DATABASE & STATE ---
let db_master = JSON.parse(localStorage.getItem('g_master')) || [];
let db_precos = JSON.parse(localStorage.getItem('g_precos')) || {}; 
let lote = JSON.parse(localStorage.getItem('g_lote')) || [];
let cofre = JSON.parse(localStorage.getItem('g_cofre')) || [];
let current_import_sup = "";
let myChart = null;

// --- NAVEGAÇÃO ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if(tabId === 'dashboard') renderDashboard();
    if(tabId === 'precos') renderPriceTable();
    if(tabId === 'lote') renderLoteTable();
    if(tabId === 'cofre') renderVault();
    if(tabId === 'triagem') renderRecent();
}

// --- IMPORTAÇÃO BANCO MASTER ---
function importMaster(input) {
    if(!input.files[0]) return;
    Papa.parse(input.files[0], {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(res) {
            db_master = res.data.map(r => ({
                id: r['id Produto'] || r['id'],
                cat: r['Categoria de Produto'] || r['categoria'],
                sub: r['Subcategoria de Produto'] || r['sub'],
                name: r['Produto'] || r['nome']
            })).filter(x => x.id);
            localStorage.setItem('g_master', JSON.stringify(db_master));
            updateCategoryFilters();
            alert("Banco Master atualizado com " + db_master.length + " produtos.");
            location.reload();
        }
    });
}

function updateCategoryFilters() {
    const cats = [...new Set(db_master.map(x => x.cat))];
    const options = `<option value="">Todas Categorias</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('filterCatPrice').innerHTML = options;
    document.getElementById('filterCatLote').innerHTML = options;
}

// --- LOGICA DE TRIAGEM ---
function previewProd() {
    const id = document.getElementById('inpId').value;
    const sup = document.getElementById('inpSup').value;
    const prod = db_master.find(p => p.id == id);
    const div = document.getElementById('prevInfo');
    
    if(prod) {
        const preco = db_precos[`${id}_${sup}`] || 0;
        div.innerHTML = `<b style="color:var(--primary)">📦 ${prod.name}</b> <br> 
                         <span style="color:#64748b">Categoria: ${prod.cat} | Preço ${sup}: R$ ${preco.toFixed(2)}</span>`;
    } else {
        div.innerHTML = "";
    }
}

function addItem() {
    const fields = {
        id: document.getElementById('inpId').value,
        bar: document.getElementById('inpBar').value,
        sup: document.getElementById('inpSup').value,
        date: document.getElementById('inpDate').value,
        reason: document.getElementById('inpReason').value
    };

    if(!fields.id || !fields.bar || !fields.date) return alert("Preencha todos os campos!");
    if(lote.some(i => i.bar === fields.bar)) return alert("Este Código de Barras já existe no lote!");

    const prod = db_master.find(p => p.id == fields.id);
    if(!prod) return alert("SKU não encontrado no Banco Master!");

    // INTELIGÊNCIA DE GARANTIA
    let status = "Garantia";
    const motivosDescarte = ["Tela trincada", "Bateria estufada", "Flex Rasgado"];
    if(motivosDescarte.includes(fields.reason)) status = "Descarte";

    // Regra de Tempo
    const dtVenda = new Date(fields.date);
    const hoje = new Date();
    const meses = (hoje.getFullYear() - dtVenda.getFullYear()) * 12 + (hoje.getMonth() - dtVenda.getMonth());

    if(prod.cat.toLowerCase().includes("bateria") && meses > 6) status = "Descarte";
    if(prod.cat.toLowerCase().includes("tela") && meses > 12) status = "Descarte";

    lote.push({
        uid: Date.now(),
        ...fields,
        name: prod.name,
        cat: prod.cat,
        status: status,
        price: db_precos[`${fields.id}_${fields.sup}`] || 0
    });

    localStorage.setItem('g_lote', JSON.stringify(lote));
    alert("Item registrado como " + status);
    renderRecent();
    document.getElementById('inpId').value = "";
    document.getElementById('inpBar').value = "";
    document.getElementById('inpId').focus();
}

function renderRecent() {
    const body = document.getElementById('recentBody');
    body.innerHTML = lote.slice(-10).reverse().map(i => `
        <tr>
            <td>${i.date}</td><td>${i.id}</td><td><small>${i.name}</small></td><td>${i.bar}</td>
            <td><span class="badge ${i.status==='Garantia'?'badge-garantia':'badge-descarte'}">${i.status}</span></td>
        </tr>
    `).join('');
}

// --- GESTÃO DE PREÇOS ---
function triggerPrice(sup) {
    current_import_sup = sup;
    document.getElementById('priceInp').click();
}

function processPriceCsv(input) {
    Papa.parse(input.files[0], {
        header: true,
        complete: function(res) {
            res.data.forEach(r => {
                const id = r['id'] || r['id Produto'];
                const val = parseFloat(r['preco'] || r['valor'] || 0);
                if(id) db_precos[`${id}_${current_import_sup}`] = val;
            });
            localStorage.setItem('g_precos', JSON.stringify(db_precos));
            renderPriceTable();
            alert("Preços de " + current_import_sup + " importados.");
        }
    });
}

function renderPriceTable() {
    const search = document.getElementById('searchPrice').value.toLowerCase();
    const cat = document.getElementById('filterCatPrice').value;
    const body = document.getElementById('priceBody');
    const sups = ['QUARTT', 'CNN', 'GOLD', 'AG', 'IMPORTADA'];

    const filtered = db_master.filter(p => 
        (p.id.includes(search) || p.name.toLowerCase().includes(search)) &&
        (cat === "" || p.cat === cat)
    ).slice(0, 100);

    body.innerHTML = filtered.map(p => {
        let soma = 0, count = 0;
        const cols = sups.map(s => {
            const v = db_precos[`${p.id}_${s}`] || 0;
            if(v > 0) { soma += v; count++; }
            return `<td><input type="number" value="${v}" onchange="savePrice('${p.id}','${s}',this.value)" style="width:70px; border:none; background:transparent"></td>`;
        }).join('');
        const media = count > 0 ? (soma/count).toFixed(2) : "0.00";

        return `<tr>
            <td><b>${p.id}</b></td><td><small>${p.name}</small></td><td><small>${p.cat}</small></td>
            <td style="background:#f1f5f9"><b>R$ ${media}</b></td>
            ${cols}
            <td><button class="btn btn-primary" style="padding:5px" onclick="alert('Salvo automaticamente!')">ok</button></td>
        </tr>`;
    }).join('');
}

function savePrice(id, sup, val) {
    db_precos[`${id}_${sup}`] = parseFloat(val);
    localStorage.setItem('g_precos', JSON.stringify(db_precos));
}

// --- LOTE E EXPORTAÇÃO ---
function renderLoteTable() {
    const search = document.getElementById('searchLote').value.toLowerCase();
    const cat = document.getElementById('filterCatLote').value;
    const body = document.getElementById('loteBody');

    const filtered = lote.filter(i => 
        (i.bar.includes(search) || i.name.toLowerCase().includes(search)) &&
        (cat === "" || i.cat === cat)
    );

    body.innerHTML = filtered.map(i => `
        <tr>
            <td><b>${i.sup}</b></td><td><small>${i.cat}</small></td><td><small>${i.name}</small></td>
            <td><input type="text" value="${i.bar}" onchange="updateBar(${i.uid}, this.value)" style="border:none; border-bottom:1px solid #ddd"></td>
            <td><span class="badge ${i.status==='Garantia'?'badge-garantia':'badge-descarte'}">${i.status}</span></td>
            <td><button class="btn btn-danger" style="padding:5px" onclick="removeLote(${i.uid})">🗑️</button></td>
        </tr>
    `).join('');
}

function updateBar(uid, val) {
    const idx = lote.findIndex(l => l.uid === uid);
    lote[idx].bar = val;
    localStorage.setItem('g_lote', JSON.stringify(lote));
}

function removeLote(uid) {
    if(confirm("Remover este item?")) {
        lote = lote.filter(l => l.uid !== uid);
        localStorage.setItem('g_lote', JSON.stringify(lote));
        renderLoteTable();
    }
}

async function exportExcel(sup) {
    const items = lote.filter(l => l.sup === sup);
    if(items.length === 0) return alert("Nenhum item deste fornecedor!");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Garantia ' + sup);

    const headers = ['ID', 'PRODUTO', 'CATEGORIA', 'BARCODE', 'DATA', 'STATUS', 'PREÇO'];
    ws.addRow(headers);

    // Estilo Cabeçalho Azul Marinho / Branco / Negrito
    ws.getRow(1).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        c.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    items.forEach(i => {
        const row = ws.addRow([i.id, i.name, i.cat, i.bar, i.date, i.status, i.price]);
        row.font = { bold: true }; // Linhas em negrito conforme pedido
    });

    ws.columns.forEach(column => { column.width = 25; });

    const buf = await wb.xlsx.writeBuffer();
    const fileName = `Garantia_${sup}_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`;
    saveAs(new Blob([buf]), fileName);

    cofre.push({ date: new Date().toLocaleString(), name: fileName, sup: sup, count: items.length, status: "Exportado" });
    localStorage.setItem('g_cofre', JSON.stringify(cofre));
}

// --- DASHBOARD ---
function renderDashboard() {
    const g = lote.filter(x => x.status === "Garantia").length;
    const d = lote.filter(x => x.status === "Descarte").length;
    const val = lote.filter(x => x.status === "Garantia").reduce((a,b) => a + b.price, 0);

    document.getElementById('dashTotal').innerText = lote.length;
    document.getElementById('dashGar').innerText = g;
    document.getElementById('dashDes').innerText = d;
    document.getElementById('dashVal').innerText = `R$ ${val.toFixed(2)}`;

    const ctx = document.getElementById('mainChart').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Garantia', 'Descarte'],
            datasets: [{
                label: 'Volume de Itens',
                data: [g, d],
                backgroundColor: ['#16a34a', '#dc2626']
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// --- COFRE ---
function renderVault() {
    const fSup = document.getElementById('vaultForn').value;
    const fStat = document.getElementById('vaultStatus').value;
    const fDate = document.getElementById('vaultDate').value;

    const filtered = cofre.filter(v => 
        (fSup === "" || v.sup === fSup) &&
        (fDate === "" || v.date.includes(fDate.split('-').reverse().join('/')))
    );

    document.getElementById('vaultBody').innerHTML = filtered.reverse().map(v => `
        <tr>
            <td>${v.date}</td><td><b>${v.name}</b></td><td>${v.sup}</td><td>${v.count}</td>
            <td><button class="btn btn-primary" onclick="alert('Recuperando arquivo...')">Baixar</button></td>
        </tr>
    `).join('');
}

// INICIALIZAÇÃO
window.onload = () => {
    updateCategoryFilters();
    renderRecent();
    if(db_master.length > 0) document.getElementById('masterStatus').innerText = "✅ Banco Master: " + db_master.length + " Itens Carregados";
};
