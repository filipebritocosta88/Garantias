/**
 * METASBOARD CORE ENGINE - VERSÃO ROBUSTA 370+
 * Mantém todas as funcionalidades, filtros e formatação premium.
 */

// --- VARIÁVEIS DE ESTADO GLOBAL ---
let db_produtos = JSON.parse(localStorage.getItem('mb_db_prod')) || [];
let db_precos = JSON.parse(localStorage.getItem('mb_db_prices')) || {};
let lote_pool = JSON.parse(localStorage.getItem('mb_lote_pool')) || [];
let export_vault = JSON.parse(localStorage.getItem('mb_vault')) || [];
let active_charts = {};
let current_import_target = "";

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema Metasboard Iniciado...");
    updateMasterStatus();
    updateRecentTable();
    if (db_produtos.length > 0) {
        populateCategoryFilter();
    }
});

// Atualiza o status visual do Banco Master
function updateMasterStatus() {
    const statusLabel = document.getElementById('masterStatus');
    if (db_produtos.length > 0) {
        statusLabel.innerHTML = `✅ Banco Master Ativo: <strong>${db_produtos.length} Itens Carregados</strong>`;
    }
}

// --- NAVEGAÇÃO ENTRE TELAS ---
function switchTab(tabId) {
    // Esconde todas as abas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Desativa todos os botões
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Ativa a aba selecionada
    document.getElementById(tabId).classList.add('active');
    
    // Busca o botão correspondente para ativar
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });

    // Gatilhos de atualização específicos por aba
    if (tabId === 'dashboard') {
        renderDashboard();
    }
    if (tabId === 'precos') {
        populateCategoryFilter();
        renderPriceTable();
    }
    if (tabId === 'lote') {
        renderLoteTable();
    }
    if (tabId === 'cofre') {
        renderVault();
    }
}

// --- IMPORTAÇÃO DE DADOS MASTER ---
function importMaster(input) {
    if (!input.files[0]) return;

    Papa.parse(input.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            db_produtos = results.data.map(row => {
                return {
                    id: row['ID Produto'] || row['id'] || row['ID'],
                    name: row['Produto'] || row['name'] || row['Descrição'],
                    cat: row['Categoria de Produto'] || row['Categoria'] || 'Diversos'
                };
            }).filter(item => item.id);
            
            localStorage.setItem('mb_db_prod', JSON.stringify(db_produtos));
            updateMasterStatus();
            populateCategoryFilter();
            alert("Sucesso: O Banco Master de produtos foi atualizado com as novas informações.");
        }
    });
}

// Popula o select de categorias dinamicamente
function populateCategoryFilter() {
    const selectFilter = document.getElementById('filterCategory');
    if (!selectFilter) return;

    // Extrai categorias únicas
    const categoriasUnicas = [...new Set(db_produtos.map(p => p.cat))].sort();
    
    let htmlOptions = '<option value="TODOS">Todas as Categorias</option>';
    categoriasUnicas.forEach(cat => {
        htmlOptions += `<option value="${cat}">${cat}</option>`;
    });
    
    selectFilter.innerHTML = htmlOptions;
}

// --- GESTÃO DE PREÇOS POR FORNECEDOR ---
function triggerPriceImport(supplierName) {
    current_import_target = supplierName;
    document.getElementById('priceInput').click();
}

function processPriceCsv(input) {
    if (!input.files[0]) return;

    Papa.parse(input.files[0], {
        header: true,
        complete: function(results) {
            results.data.forEach(row => {
                const skuId = row['id'] || row['ID Produto'] || row['sku'];
                const valorMoeda = row['preco'] || row['valor'] || row['price'];
                
                if (skuId && valorMoeda) {
                    // Limpeza de string de preço (remove R$ e troca vírgula por ponto)
                    const precoLimpo = parseFloat(valorMoeda.toString().replace('R$', '').replace('.', '').replace(',', '.').trim());
                    db_precos[`${skuId}_${current_import_target}`] = precoLimpo;
                }
            });
            
            localStorage.setItem('mb_db_prices', JSON.stringify(db_precos));
            renderPriceTable();
            alert(`Tabela de preços do fornecedor ${current_import_target} foi carregada com sucesso!`);
            input.value = ""; // Reseta o input de arquivo
        }
    });
}

function renderPriceTable() {
    const termoBusca = document.getElementById('searchPrice').value.toLowerCase();
    const categoriaSelecionada = document.getElementById('filterCategory').value;
    const tabelaCorpo = document.getElementById('priceBody');
    const listaFornecedores = ['QUARTT', 'CNN', 'AG', 'GOLD'];

    // Filtra os produtos com base na busca e na categoria
    const produtosFiltrados = db_produtos.filter(p => {
        const matchesSearch = p.id.toString().includes(termoBusca) || p.name.toLowerCase().includes(termoBusca);
        const matchesCategory = categoriaSelecionada === 'TODOS' || p.cat === categoriaSelecionada;
        return matchesSearch && matchesCategory;
    }).slice(0, 200); // Limite para garantir fluidez na tela

    let tabelaHtml = "";
    produtosFiltrados.forEach(prod => {
        tabelaHtml += `
            <tr>
                <td><strong>${prod.id}</strong></td>
                <td><small>${prod.name}</small></td>
                <td><span class="badge" style="background:#f1f5f9; color:#475569; font-size:10px">${prod.cat}</span></td>
                ${listaFornecedores.map(forn => {
                    const chavePreco = `${prod.id}_${forn}`;
                    const valorAtual = db_precos[chavePreco] || '';
                    return `
                        <td>
                            <input type="number" step="0.01" value="${valorAtual}" 
                                   style="width: 85px; padding: 7px; border-radius: 8px; border: 1px solid var(--border);"
                                   onchange="updatePriceManual('${prod.id}', '${forn}', this.value)">
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    });

    tabelaCorpo.innerHTML = tabelaHtml;
}

function updatePriceManual(id, fornecedor, novoValor) {
    db_precos[`${id}_${fornecedor}`] = parseFloat(novoValor);
    localStorage.setItem('mb_db_prices', JSON.stringify(db_precos));
}

// --- LÓGICA DE TRIAGEM ---
function previewProd() {
    const idDigitado = document.getElementById('inpId').value;
    const fornecedorSelecionado = document.getElementById('inpSup').value;
    const produtoEncontrado = db_produtos.find(p => p.id == idDigitado);
    const precoEstimado = db_precos[`${idDigitado}_${fornecedorSelecionado}`] || 0;
    
    const previewLabel = document.getElementById('prevName');
    if (produtoEncontrado) {
        previewLabel.innerHTML = `📦 ${produtoEncontrado.name} | <span style="color:var(--success)">Valor Base: R$ ${precoEstimado.toFixed(2)}</span>`;
    } else {
        previewLabel.innerText = "";
    }
}

function addPeça() {
    const formId = document.getElementById('inpId').value;
    const formBar = document.getElementById('inpBar').value;
    const formSup = document.getElementById('inpSup').value;
    const formData = document.getElementById('inpDate').value;
    const formReason = document.getElementById('inpReason').value;

    // Validações de entrada
    if (!formId || !formBar || !formData) {
        alert("Atenção: Os campos ID, Código de Barras e Data são obrigatórios para o registro.");
        return;
    }

    // Verifica se o barcode já existe no lote para evitar duplicidade
    const jaExiste = lote_pool.some(item => item.barcode === formBar);
    if (jaExiste) {
        alert("Erro: Este Código de Barras já consta no lote atual em aberto.");
        return;
    }

    const infoProduto = db_produtos.find(p => p.id == formId);
    const valorItem = db_precos[`${formId}_${formSup}`] || 0;
    
    // Regra de Status baseada no motivo
    let statusFinal = 'Garantia';
    if (formReason.includes('Trincada') || formReason.includes('Estufada')) {
        statusFinal = 'Descarte';
    }

    const novoRegistro = {
        uid: Date.now(),
        id: formId,
        barcode: formBar,
        supplier: formSup,
        date: formData,
        reason: formReason,
        name: infoProduto ? infoProduto.name : 'PRODUTO NÃO IDENTIFICADO',
        price: valorItem,
        status: statusFinal
    };

    lote_pool.push(novoRegistro);
    localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
    
    updateRecentTable();
    
    // Limpeza de campos para agilizar o fluxo
    document.getElementById('inpId').value = "";
    document.getElementById('inpBar').value = "";
    document.getElementById('inpId').focus();
    document.getElementById('prevName').innerText = "";
}

function updateRecentTable() {
    const corpoRecentes = document.getElementById('recentBody');
    if (!corpoRecentes) return;

    const ultimosCinco = lote_pool.slice(-5).reverse();
    
    corpoRecentes.innerHTML = ultimosCinco.map(item => `
        <tr>
            <td><small>${item.name}</small></td>
            <td><strong>${item.supplier}</strong></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
            <td style="font-weight:800">R$ ${item.price.toFixed(2)}</td>
        </tr>
    `).join('');
}

// --- DASHBOARD E ANALYTICS ---
function renderDashboard() {
    const totalItens = lote_pool.length;
    const itensGarantia = lote_pool.filter(x => x.status === 'Garantia');
    const itensDescarte = lote_pool.filter(x => x.status === 'Descarte');
    
    const valorGarantia = itensGarantia.reduce((acc, curr) => acc + curr.price, 0);
    const valorTotalLote = lote_pool.reduce((acc, curr) => acc + curr.price, 0);
    
    const taxaDescarte = totalItens > 0 ? (itensDescarte.length / totalItens) * 100 : 0;
    const ticketMedio = totalItens > 0 ? valorTotalLote / totalItens : 0;

    document.getElementById('statTotal').innerText = totalItens;
    document.getElementById('statGarValue').innerText = `R$ ${valorGarantia.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('statAvg').innerText = `R$ ${ticketMedio.toFixed(2)}`;
    document.getElementById('statDesRate').innerText = `${taxaDescarte.toFixed(1)}%`;

    renderCharts();
}

function renderCharts() {
    const canvasVolume = document.getElementById('chartVol').getContext('2d');
    const canvasFinanceiro = document.getElementById('chartCash').getContext('2d');
    
    if (active_charts.vol) active_charts.vol.destroy();
    if (active_charts.cash) active_charts.cash.destroy();

    const fornecedoresArr = ['QUARTT', 'CNN', 'AG', 'GOLD'];
    const coresDashboard = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b'];

    active_charts.vol = new Chart(canvasVolume, {
        type: 'doughnut',
        data: {
            labels: fornecedoresArr,
            datasets: [{
                data: fornecedoresArr.map(s => lote_pool.filter(x => x.supplier === s).length),
                backgroundColor: coresDashboard
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    active_charts.cash = new Chart(canvasFinanceiro, {
        type: 'bar',
        data: {
            labels: fornecedoresArr,
            datasets: [
                {
                    label: 'Garantia (R$)',
                    data: fornecedoresArr.map(s => lote_pool.filter(x => x.supplier === s && x.status === 'Garantia').reduce((a,b) => a + b.price, 0)),
                    backgroundColor: '#16a34a'
                },
                {
                    label: 'Descarte (R$)',
                    data: fornecedoresArr.map(s => lote_pool.filter(x => x.supplier === s && x.status === 'Descarte').reduce((a,b) => a + b.price, 0)),
                    backgroundColor: '#dc2626'
                }
            ]
        }
    });
}

// --- EXPORTAÇÃO E EXCEL PREMIUM ---
function renderLoteTable() {
    const corpoLote = document.getElementById('loteBody');
    if (!corpoLote) return;

    const loteOrdenado = lote_pool.slice().reverse();
    
    corpoLote.innerHTML = loteOrdenado.map(item => `
        <tr>
            <td><strong>${item.supplier}</strong></td>
            <td><small>${item.id}</small><br>${item.name}</td>
            <td><code>${item.barcode}</code></td>
            <td><span class="badge ${item.status === 'Garantia' ? 'badge-garantia' : 'badge-descarte'}">${item.status}</span></td>
            <td><small>${item.reason}</small></td>
            <td>
                <button class="btn btn-outline" style="padding:8px" onclick="removeLoteItem(${item.uid})">
                    🗑️ Remover
                </button>
            </td>
        </tr>
    `).join('');
}

function removeLoteItem(uniqueId) {
    if (confirm("Deseja realmente remover este item do lote em aberto?")) {
        lote_pool = lote_pool.filter(item => item.uid !== uniqueId);
        localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
        renderLoteTable();
    }
}

async function exportFiltered(statusFiltro) {
    const fornecedorSelecionado = document.getElementById('selSup').value;
    const dadosFiltrados = lote_pool.filter(x => x.supplier === fornecedorSelecionado && x.status === statusFiltro);
    
    if (dadosFiltrados.length === 0) {
        alert("Nenhum item encontrado para os filtros selecionados.");
        return;
    }

    await generateExcel(`TRIAGEM_${fornecedorSelecionado}_${statusFiltro.toUpperCase()}`, dadosFiltrados);
}

async function exportGeral() {
    if (lote_pool.length === 0) {
        alert("Não há itens no lote para exportar.");
        return;
    }
    await generateExcel(`FECHAMENTO_LOTE_GERAL`, lote_pool);
}

async function generateExcel(nomeArquivoBase, listaDados) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Triagem');

    // Cabeçalhos das Colunas
    worksheet.columns = [
        { header: 'FORNECEDOR', key: 'supplier', width: 18 },
        { header: 'SKU / ID', key: 'id', width: 15 },
        { header: 'DESCRIÇÃO DO PRODUTO', key: 'name', width: 50 },
        { header: 'BARCODE', key: 'barcode', width: 25 },
        { header: 'STATUS ANÁLISE', key: 'status', width: 18 },
        { header: 'MOTIVO DA TRIAGEM', key: 'reason', width: 30 },
        { header: 'VALOR UNITÁRIO', key: 'price', width: 18 },
        { header: 'DATA REGISTRO', key: 'date', width: 15 }
    ];

    // Estilo do Cabeçalho
    worksheet.getRow(1).height = 35;
    worksheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 12 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Adiciona as Linhas com Zebra Striping
    listaDados.forEach((item, idx) => {
        const row = worksheet.addRow(item);
        row.height = 28;
        row.alignment = { vertical: 'middle' };
        
        if (idx % 2 === 0) {
            row.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
            });
        }

        // Formatação Condicional de Status no Excel
        const cellStatus = row.getCell('status');
        if (item.status === 'Garantia') {
            cellStatus.font = { bold: true, color: { argb: '16A34A' } };
        } else {
            cellStatus.font = { bold: true, color: { argb: 'DC2626' } };
        }
        
        // Formata Moeda
        row.getCell('price').numFmt = '"R$ "#,##0.00';
    });

    // Salva o Arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const nomeFinal = `${nomeArquivoBase}_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(new Blob([buffer]), nomeFinal);

    // Registro no Cofre
    export_vault.push({
        name: nomeFinal,
        date: new Date().toLocaleString(),
        count: listaDados.length
    });
    localStorage.setItem('mb_vault', JSON.stringify(export_vault));

    if (confirm("Arquivo gerado com sucesso! Deseja limpar estes itens exportados do lote em aberto para manter o sistema limpo?")) {
        const uidsExportados = listaDados.map(d => d.uid);
        lote_pool = lote_pool.filter(p => !uidsExportados.includes(p.uid));
        localStorage.setItem('mb_lote_pool', JSON.stringify(lote_pool));
        renderLoteTable();
    }
}

function renderVault() {
    const containerVault = document.getElementById('vaultBody');
    if (!containerVault) return;

    const vaultInvertido = export_vault.slice().reverse();
    
    containerVault.innerHTML = vaultInvertido.map(v => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center; padding:1.8rem; margin-bottom:15px">
            <div>
                <strong style="font-size:1.1rem">${v.name}</strong><br>
                <small style="color:#64748b">${v.date} — Contém ${v.count} itens processados</small>
            </div>
            <span class="badge" style="background:#f1f5f9; color:var(--navy-dark); border:none">💾 ARQUIVADO</span>
        </div>
    `).join('');
}
