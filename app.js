// --- ESTADO GLOBAL ---
let db_master = JSON.parse(localStorage.getItem('g_master')) || [];
let db_precos = JSON.parse(localStorage.getItem('g_precos')) || {}; 
let lote = JSON.parse(localStorage.getItem('g_lote')) || [];
let vault = JSON.parse(localStorage.getItem('g_vault')) || [];
let current_sup_price = "";
let chart = null;

// --- NAVEGAÇÃO ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const btn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if(btn) btn.classList.add('active');

    if(tabId === 'dashboard') renderDashboard();
    if(tabId === 'precos') renderPrice();
    if(tabId === 'lote') renderLote();
    if(tabId === 'cofre') renderVault();
    if(tabId === 'triagem') renderRecent();
}

// --- BANCO MASTER ---
function importMaster(input) {
    if(!input.files[0]) return;
    Papa.parse(input.files[0], {
        header: true,
        complete: function(res) {
            db_master = res.data.map(r => ({
                id: r['ID Produto'],
                cat: r['Categoria de Produto'],
                sub: r['Subcategoria de Produto'],
                name: r['Produto']
            })).filter(x => x.id);
            localStorage.setItem('g_master', JSON.stringify(db_master));
            updateSelects();
            alert("Banco Master Carregado!");
        }
    });
}

function updateSelects() {
    const cats = [...new Set(db_master.map(x => x.cat))];
    const html = `<option value="">Todas Categorias</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('filterCatPrice').innerHTML = html;
    document.getElementById('filterCatLote').innerHTML = html;
}

// --- LOGICA DE GARANTIA INTELIGENTE ---
function previewProd() {
    const id = document.getElementById('inpId').value;
    const sup = document.getElementById('inpSup').value;
    const prod = db_master.find(p => p.id == id);
    const info = document.getElementById('prevInfo');
    
    if(prod) {
        const preco = db_precos[`${id}_${sup}`] || 0;
        info.innerHTML = `📦 ${prod.name} | 💰 Preço: R$ ${preco.toFixed(2)}`;
    } else {
        info.innerHTML = "";
    }
}

function addItem() {
    const id = document.getElementById('inpId').value;
    const bar = document.getElementById('inpBar').value;
    const sup = document.getElementById('inpSup').value;
    const date = document.getElementById('inpDate').value;
    const reason = document.getElementById('inpReason').value;

    if(!id || !bar || !date) return alert("Preencha os campos!");
    if(lote.some(i => i.bar === bar)) return alert("Código de Barras já existe!");

    const prod = db_master.find(p => p.id == id);
    if(!prod) return alert("Produto não encontrado no Master!");

    // Regra de Inteligência
    let status = "Garantia";
    if(["Tela trincada", "Bateria estufada", "Flex Rasgado"].includes(reason)) {
        status = "Descarte";
    }

    // Validação de Tempo (Bateria 6 meses, Tela 12 meses)
    const venda = new Date(date);
    const hoje = new Date();
    const mesesDiff = (hoje.getFullYear() - venda.getFullYear()) * 12 + hoje.getMonth() - venda.getMonth();

    if(prod.cat.toLowerCase().includes('bateria') && mesesDiff > 6) status = "Descarte";
    if(prod.cat.toLowerCase().includes('tela') && mesesDiff > 12) status = "Descarte";

    const item = {
        uid: Date.now(),
        id, bar, sup, date, reason, status,
        name: prod.name,
        cat: prod.cat,
        price: db_precos[`${id}_${sup}`] || 0
    };

    lote.push(item);
    localStorage.setItem('g_lote', JSON.stringify(lote));
    renderRecent();
    alert("Registrado com sucesso!");
    document.getElementById('inpId').value = "";
    document.getElementById('inpBar').value = "";
}

// --- RENDERIZADORES ---
function renderRecent() {
    const body = document.getElementById('recentBody');
    const last10 = lote.slice(-10).reverse();
    body.innerHTML = last10.map(i => `
        <tr>
            <td>${i.date}</td>
            <td>${i.id}</td>
            <td><small>${i.name}</small></td>
            <td>${i.bar}</td>
            <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${i.status}</span></td>
        </tr>
    `).join('');
}

// --- GESTÃO DE PREÇOS ---
function triggerPrice(sup) {
    current_sup_price = sup;
    document.getElementById('priceInp').click();
}

function processPrice(input) {
    Papa.parse(input.files[0], {
        header: true,
        complete: function(res) {
            res.data.forEach(r => {
                const id = r['id'] || r['ID Produto'];
                const val = parseFloat(r['preco'] || r['valor'] || 0);
                if(id) db_precos[`${id}_${current_sup_price}`] = val;
            });
            localStorage.setItem('g_precos', JSON.stringify(db_precos));
            renderPrice();
        }
    });
}

function renderPrice() {
    const search = document.getElementById('searchPrice').value.toLowerCase();
    const cat = document.getElementById('filterCatPrice').value;
    const body = document.getElementById('priceBody');

    const filtered = db_master.filter(p => 
        (p.id.includes(search) || p.name.toLowerCase().includes(search)) &&
        (cat === "" || p.cat === cat)
    ).slice(0, 50);

    body.innerHTML = filtered.map(p => {
        const sups = ['QUARTT', 'GOLD', 'AG', 'CNN', 'IMPORTADA'];
        // Mostra o valor do primeiro fornecedor que tiver preço ou 0
        const currentVal = db_precos[`${p.id}_QUARTT`] || 0; 
        return `
        <tr>
            <td>${p.id}</td>
            <td><small>${p.name}</small></td>
            <td>${p.cat}</td>
            <td>R$ ${currentVal.toFixed(2)}</td>
            <td><input type="number" id="manual_${p.id}" style="width:80px"></td>
            <td><button class="btn btn-primary" onclick="saveManualPrice('${p.id}')">Salvar</button></td>
        </tr>`;
    }).join('');
}

function saveManualPrice(id) {
    const val = parseFloat(document.getElementById(`manual_${id}`).value);
    if(isNaN(val)) return;
    // Salva para o fornecedor atualmente selecionado no select da triagem como padrão
    const sup = document.getElementById('inpSup').value;
    db_precos[`${id}_${sup}`] = val;
    localStorage.setItem('g_precos', JSON.stringify(db_precos));
    alert("Preço salvo!");
    renderPrice();
}

// --- LOTE E EXPORTAÇÃO ---
function renderLote() {
    const search = document.getElementById('searchLote').value.toLowerCase();
    const cat = document.getElementById('filterCatLote').value;
    const body = document.getElementById('loteBody');

    const filtered = lote.filter(i => 
        (i.bar.includes(search) || i.name.toLowerCase().includes(search)) &&
        (cat === "" || i.cat === cat)
    );

    body.innerHTML = filtered.map(i => `
        <tr>
            <td>${i.sup}</td>
            <td>${i.cat}</td>
            <td><small>${i.name}</small></td>
            <td><input type="text" value="${i.bar}" onchange="updateBarcode(${i.uid}, this.value)"></td>
            <td>R$ ${i.price.toFixed(2)}</td>
            <td><span class="badge ${i.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${i.status}</span></td>
            <td><button onclick="removeItem(${i.uid})">🗑️</button></td>
        </tr>
    `).join('');
}

function updateBarcode(uid, newVal) {
    const idx = lote.findIndex(l => l.uid === uid);
    lote[idx].bar = newVal;
    localStorage.setItem('g_lote', JSON.stringify(lote));
}

async function exportExcel(sup) {
    const items = lote.filter(i => i.sup === sup);
    if(items.length === 0) return alert("Sem itens para este fornecedor!");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sup);

    // Header Azul Marinho / Letra Branca
    const header = ['ID', 'PRODUTO', 'BARCODE', 'CATEGORIA', 'DATA', 'STATUS', 'VALOR'];
    ws.addRow(header);
    ws.getRow(1).eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        c.font = { color: { argb: 'FFFFFF' }, bold: true };
    });

    items.forEach(i => {
        ws.addRow([i.id, i.name, i.bar, i.cat, i.date, i.status, i.price]);
    });

    ws.columns.forEach(column => { column.width = 20; });

    const buf = await wb.xlsx.writeBuffer();
    const fileName = `Garantia_${sup}_${new Date().getTime()}.xlsx`;
    saveAs(new Blob([buf]), fileName);

    vault.push({ date: new Date().toLocaleString(), name: fileName, sup, count: items.length });
    localStorage.setItem('g_vault', JSON.stringify(vault));
}

// --- DASHBOARD ---
function renderDashboard() {
    const total = lote.length;
    const g = lote.filter(x => x.status === "Garantia").length;
    const d = lote.filter(x => x.status === "Descarte").length;
    const val = lote.filter(x => x.status === "Garantia").reduce((a,b) => a + b.price, 0);

    document.getElementById('dashTotal').innerText = total;
    document.getElementById('dashGar').innerText = g;
    document.getElementById('dashDes').innerText = d;
    document.getElementById('dashVal').innerText = `R$ ${val.toFixed(2)}`;

    const ctx = document.getElementById('chartGarantias').getContext('2d');
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Garantias', 'Descartes'],
            datasets: [{
                label: 'Volume',
                data: [g, d],
                backgroundColor: ['#16a34a', '#dc2626']
            }]
        }
    });
}

function renderVault() {
    const body = document.getElementById('vaultBody');
    body.innerHTML = vault.map(v => `
        <tr>
            <td>${v.date}</td>
            <td>${v.name}</td>
            <td>${v.sup}</td>
            <td>${v.count}</td>
            <td><button class="btn btn-primary">Baixar</button></td>
        </tr>
    `).join('');
}

// INICIALIZAR
window.onload = () => {
    updateSelects();
    renderRecent();
};
