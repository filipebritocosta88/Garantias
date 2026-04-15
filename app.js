<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Garantias | Sistema de Gestão</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <style>
    :root{
      --bg:#f4f7fb;
      --surface:#ffffff;
      --surface-2:#f8fbff;
      --navy:#0f172a;
      --navy-2:#172554;
      --primary:#2563eb;
      --primary-2:#1d4ed8;
      --success:#16a34a;
      --warning:#d97706;
      --danger:#dc2626;
      --text:#0f172a;
      --muted:#64748b;
      --border:#dbe4f0;
      --shadow:0 10px 30px rgba(15, 23, 42, .08);
      --shadow-soft:0 4px 14px rgba(15, 23, 42, .06);
      --sidebar-width:270px;
      --radius:18px;
    }

    *{
      box-sizing:border-box;
      margin:0;
      padding:0;
      font-family:'Inter', sans-serif;
    }

    body{
      background:var(--bg);
      color:var(--text);
      display:flex;
      min-height:100vh;
      overflow:hidden;
    }

    aside{
      width:var(--sidebar-width);
      background:linear-gradient(180deg,#081226 0%, #0b1730 100%);
      color:#fff;
      display:flex;
      flex-direction:column;
      flex-shrink:0;
      border-right:1px solid rgba(255,255,255,.06);
    }

    .brand{
      padding:28px 22px;
      border-bottom:1px solid rgba(255,255,255,.08);
    }

    .brand h1{
      font-size:1.45rem;
      letter-spacing:4px;
      font-weight:800;
    }

    .brand p{
      color:#93a4c4;
      margin-top:8px;
      font-size:.88rem;
    }

    nav{
      padding:18px 12px;
      display:flex;
      flex-direction:column;
      gap:8px;
      overflow:auto;
    }

    .nav-btn{
      width:100%;
      border:none;
      background:transparent;
      color:#a6b6d5;
      border-radius:14px;
      padding:14px 16px;
      text-align:left;
      font-weight:700;
      font-size:.95rem;
      cursor:pointer;
      transition:.25s;
      display:flex;
      align-items:center;
      gap:12px;
    }

    .nav-btn:hover{
      background:rgba(255,255,255,.06);
      color:#fff;
    }

    .nav-btn.active{
      background:linear-gradient(135deg,var(--primary),#3b82f6);
      color:#fff;
      box-shadow:0 12px 24px rgba(37,99,235,.25);
    }

    main{
      flex:1;
      overflow:auto;
      padding:26px;
    }

    .tab-content{
      display:none;
      animation:fadeIn .25s ease;
    }

    .tab-content.active{
      display:block;
    }

    @keyframes fadeIn{
      from{opacity:0; transform:translateY(6px);}
      to{opacity:1; transform:translateY(0);}
    }

    .page-title{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
      margin-bottom:22px;
      flex-wrap:wrap;
    }

    .page-title h2{
      font-size:1.6rem;
      font-weight:800;
      color:var(--navy);
    }

    .page-title p{
      color:var(--muted);
      margin-top:6px;
      font-size:.95rem;
    }

    .card{
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:var(--radius);
      box-shadow:var(--shadow-soft);
      padding:22px;
      margin-bottom:20px;
    }

    .card h3{
      font-size:1.2rem;
      color:var(--navy);
      margin-bottom:16px;
      font-weight:800;
    }

    .toolbar{
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
    }

    .grid{
      display:grid;
      gap:16px;
    }

    .grid-2{
      grid-template-columns:repeat(2,minmax(0,1fr));
    }

    .grid-3{
      grid-template-columns:repeat(3,minmax(0,1fr));
    }

    .grid-4{
      grid-template-columns:repeat(4,minmax(0,1fr));
    }

    .grid-auto{
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
    }

    .form-group{
      display:flex;
      flex-direction:column;
      gap:6px;
    }

    label{
      font-size:.75rem;
      text-transform:uppercase;
      font-weight:800;
      color:#5f738f;
      letter-spacing:.4px;
    }

    input, select, textarea{
      width:100%;
      border:1px solid var(--border);
      border-radius:12px;
      background:#fff;
      padding:13px 14px;
      font-size:.95rem;
      outline:none;
      transition:.2s;
      color:var(--text);
    }

    textarea{
      min-height:100px;
      resize:vertical;
    }

    input:focus, select:focus, textarea:focus{
      border-color:#93c5fd;
      box-shadow:0 0 0 4px rgba(37,99,235,.12);
    }

    .btn{
      border:none;
      border-radius:12px;
      padding:12px 16px;
      font-weight:800;
      cursor:pointer;
      transition:.2s;
      font-size:.88rem;
      text-transform:uppercase;
      letter-spacing:.3px;
    }

    .btn:hover{ transform:translateY(-1px); }

    .btn-primary{
      background:linear-gradient(135deg,var(--primary),#3b82f6);
      color:#fff;
      box-shadow:0 10px 24px rgba(37,99,235,.18);
    }

    .btn-success{
      background:linear-gradient(135deg,#16a34a,#22c55e);
      color:#fff;
    }

    .btn-warning{
      background:linear-gradient(135deg,#d97706,#f59e0b);
      color:#fff;
    }

    .btn-danger{
      background:linear-gradient(135deg,#dc2626,#ef4444);
      color:#fff;
    }

    .btn-light{
      background:#eef4ff;
      color:#1d4ed8;
      border:1px solid #dbeafe;
    }

    .btn-dark{
      background:#0f172a;
      color:#fff;
    }

    .btn-outline{
      background:#fff;
      color:var(--navy);
      border:1px solid var(--border);
    }

    .btn-sm{
      padding:9px 12px;
      font-size:.77rem;
      border-radius:10px;
    }

    .stats-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:16px;
      margin-bottom:20px;
    }

    .stat-card{
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:18px;
      padding:18px;
      box-shadow:var(--shadow-soft);
      position:relative;
      overflow:hidden;
    }

    .stat-card::before{
      content:'';
      position:absolute;
      inset:0 auto 0 0;
      width:5px;
      background:var(--primary);
    }

    .stat-card.success::before{ background:var(--success); }
    .stat-card.danger::before{ background:var(--danger); }
    .stat-card.warning::before{ background:var(--warning); }

    .stat-card h4{
      color:var(--muted);
      font-size:.82rem;
      margin-bottom:8px;
      font-weight:700;
      text-transform:uppercase;
    }

    .stat-card p{
      font-size:1.9rem;
      font-weight:800;
      color:var(--navy);
    }

    .table-wrap{
      width:100%;
      overflow:auto;
      border:1px solid var(--border);
      border-radius:14px;
      background:#fff;
    }

    table{
      width:100%;
      border-collapse:collapse;
      min-width:820px;
    }

    th{
      background:#f8fbff;
      color:#637995;
      text-transform:uppercase;
      font-size:.72rem;
      letter-spacing:.35px;
      font-weight:800;
      padding:14px 12px;
      text-align:left;
      border-bottom:1px solid var(--border);
    }

    td{
      padding:14px 12px;
      border-bottom:1px solid #edf2f7;
      font-size:.88rem;
      vertical-align:top;
    }

    tr:hover td{
      background:#fbfdff;
    }

    .badge{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:5px 10px;
      border-radius:999px;
      font-size:.72rem;
      font-weight:800;
      letter-spacing:.2px;
    }

    .badge-garantia{
      background:#dcfce7;
      color:#166534;
    }

    .badge-descarte{
      background:#fee2e2;
      color:#991b1b;
    }

    .badge-recebido{
      background:#dbeafe;
      color:#1d4ed8;
    }

    .badge-pendente{
      background:#fef3c7;
      color:#92400e;
    }

    .subtle{
      color:var(--muted);
      font-size:.9rem;
    }

    .hint-box{
      border:2px dashed #bfd0e6;
      background:#f8fbff;
      border-radius:16px;
      padding:22px;
      text-align:center;
      cursor:pointer;
      transition:.2s;
    }

    .hint-box:hover{
      background:#f1f7ff;
      border-color:#93c5fd;
    }

    .preview-box{
      min-height:52px;
      border:1px dashed var(--border);
      border-radius:12px;
      background:#fbfdff;
      padding:12px 14px;
      display:flex;
      align-items:center;
      font-size:.92rem;
    }

    .calendar-layout{
      display:grid;
      grid-template-columns:380px 1fr;
      gap:20px;
    }

    .calendar-card{
      background:#fff;
      border:1px solid var(--border);
      border-radius:20px;
      box-shadow:var(--shadow-soft);
      padding:18px;
    }

    .calendar-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:14px;
      gap:10px;
    }

    .calendar-head h4{
      font-size:1.05rem;
      font-weight:800;
      color:var(--navy);
    }

    .calendar-grid{
      display:grid;
      grid-template-columns:repeat(7,1fr);
      gap:8px;
    }

    .calendar-weekday{
      text-align:center;
      color:var(--muted);
      font-size:.8rem;
      font-weight:800;
      padding:8px 0;
    }

    .calendar-day{
      border:1px solid var(--border);
      background:#fff;
      min-height:76px;
      border-radius:14px;
      padding:8px;
      cursor:pointer;
      position:relative;
      transition:.2s;
      display:flex;
      flex-direction:column;
      justify-content:space-between;
    }

    .calendar-day:hover{
      border-color:#93c5fd;
      box-shadow:0 0 0 3px rgba(37,99,235,.09);
      transform:translateY(-1px);
    }

    .calendar-day.muted{
      background:#f8fafc;
      color:#94a3b8;
    }

    .calendar-day.selected{
      border-color:#2563eb;
      background:#eff6ff;
      box-shadow:0 0 0 3px rgba(37,99,235,.12);
    }

    .calendar-day.today .day-number{
      background:var(--primary);
      color:#fff;
    }

    .day-number{
      width:28px;
      height:28px;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:999px;
      font-weight:800;
      font-size:.84rem;
    }

    .day-counter{
      align-self:flex-start;
      background:#dbeafe;
      color:#1d4ed8;
      font-size:.72rem;
      font-weight:800;
      border-radius:999px;
      padding:3px 8px;
    }

    .envios-panel{
      background:#fff;
      border:1px solid var(--border);
      border-radius:20px;
      padding:18px;
      box-shadow:var(--shadow-soft);
    }

    .date-header{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      margin-bottom:16px;
      flex-wrap:wrap;
    }

    .date-header h4{
      font-size:1.15rem;
      font-weight:800;
      color:var(--navy);
    }

    .empty-state{
      border:2px dashed #d7e3f1;
      background:#f9fbff;
      border-radius:18px;
      padding:34px 24px;
      text-align:center;
      color:var(--muted);
    }

    .carousel-controls{
      display:flex;
      justify-content:flex-end;
      gap:8px;
      margin-bottom:14px;
    }

    .envio-card{
      border:1px solid var(--border);
      border-radius:20px;
      background:linear-gradient(180deg,#ffffff 0%, #fbfdff 100%);
      box-shadow:var(--shadow-soft);
      overflow:hidden;
    }

    .envio-top{
      display:flex;
      justify-content:space-between;
      align-items:flex-start;
      gap:12px;
      padding:20px 20px 14px;
      border-bottom:1px solid #edf2f7;
      flex-wrap:wrap;
    }

    .envio-top h5{
      font-size:1.15rem;
      font-weight:800;
      color:var(--navy);
      margin-bottom:6px;
    }

    .envio-top p{
      color:var(--muted);
      font-size:.92rem;
    }

    .envio-body{
      padding:18px 20px 20px;
    }

    .envio-meta{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
      gap:12px;
      margin-bottom:16px;
    }

    .meta-box{
      background:#f8fbff;
      border:1px solid #e8eef7;
      border-radius:14px;
      padding:12px;
    }

    .meta-box span{
      display:block;
      color:#6b7f99;
      font-size:.74rem;
      text-transform:uppercase;
      font-weight:800;
      margin-bottom:6px;
    }

    .meta-box strong{
      font-size:.95rem;
      color:var(--navy);
      word-break:break-word;
    }

    .item-list{
      display:flex;
      flex-direction:column;
      gap:10px;
      margin-top:12px;
    }

    .item-chip{
      border:1px solid #e6edf7;
      background:#fbfdff;
      border-radius:14px;
      padding:12px 14px;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:14px;
      flex-wrap:wrap;
    }

    .item-chip strong{
      color:var(--navy);
      font-size:.92rem;
    }

    .item-chip span{
      color:var(--muted);
      font-size:.86rem;
    }

    .action-row{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-top:16px;
    }

    .items-builder{
      background:#f8fbff;
      border:1px solid #e6edf7;
      border-radius:18px;
      padding:16px;
      margin-top:16px;
    }

    .mini-table{
      width:100%;
      min-width:unset;
    }

    .mini-table th, .mini-table td{
      padding:10px 8px;
      font-size:.84rem;
    }

    .status-pill{
      padding:6px 10px;
      border-radius:999px;
      font-weight:800;
      font-size:.75rem;
    }

    .status-enviado{
      background:#dbeafe;
      color:#1d4ed8;
    }

    .status-recebido{
      background:#dcfce7;
      color:#166534;
    }

    .modal{
      position:fixed;
      inset:0;
      background:rgba(2,8,23,.55);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:1000;
      padding:18px;
    }

    .modal.active{
      display:flex;
    }

    .modal-box{
      width:min(960px,100%);
      background:#fff;
      border-radius:24px;
      border:1px solid var(--border);
      box-shadow:0 20px 60px rgba(2,8,23,.25);
      overflow:hidden;
    }

    .modal-header{
      padding:20px 22px;
      border-bottom:1px solid #edf2f7;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
    }

    .modal-header h3{
      margin:0;
      font-size:1.2rem;
    }

    .modal-body{
      padding:22px;
      max-height:80vh;
      overflow:auto;
    }

    .split-form{
      display:grid;
      grid-template-columns:240px 1fr;
      gap:24px;
    }

    .form-side{
      border:1px dashed #d7e3f1;
      border-radius:20px;
      background:#f8fbff;
      padding:18px;
      text-align:center;
    }

    .form-side .icon-circle{
      width:96px;
      height:96px;
      border-radius:24px;
      background:linear-gradient(135deg,#eff6ff,#dbeafe);
      color:#1d4ed8;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:2rem;
      font-weight:800;
      margin:0 auto 14px;
      border:2px dashed #93c5fd;
    }

    .form-side h4{
      color:var(--navy);
      margin-bottom:6px;
      font-size:1rem;
      font-weight:800;
    }

    .form-side p{
      color:var(--muted);
      font-size:.9rem;
      line-height:1.45;
    }

    .section-title{
      font-size:.95rem;
      color:var(--navy);
      font-weight:800;
      margin:10px 0 12px;
    }

    .product-actions{
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    .two-col{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
    }

    .footer-note{
      margin-top:12px;
      color:var(--muted);
      font-size:.84rem;
    }

    .top-message{
      padding:12px 14px;
      border-radius:12px;
      margin-bottom:14px;
      display:none;
      font-weight:700;
      font-size:.9rem;
    }

    .top-message.show{ display:block; }
    .top-message.success{ background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }
    .top-message.error{ background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
    .top-message.info{ background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; }

    @media (max-width:1100px){
      .calendar-layout{ grid-template-columns:1fr; }
      .split-form{ grid-template-columns:1fr; }
    }

    @media (max-width:920px){
      body{ flex-direction:column; overflow:auto; }
      aside{
        width:100%;
        height:auto;
      }
      nav{
        flex-direction:row;
        overflow:auto;
      }
      .nav-btn{
        white-space:nowrap;
        min-width:max-content;
      }
      main{
        padding:18px;
      }
      .grid-2, .grid-3, .grid-4, .two-col{
        grid-template-columns:1fr;
      }
    }
  </style>
</head>
<body>

  <aside>
    <div class="brand">
      <h1>GARANTIAS</h1>
      <p>Sistema interno de triagem, envios e controle</p>
    </div>

    <nav>
      <button class="nav-btn active" onclick="switchTab('triagem')">🔍 Triagem</button>
      <button class="nav-btn" onclick="switchTab('envios')">📅 Envios</button>
      <button class="nav-btn" onclick="switchTab('produtos')">📦 Produtos</button>
      <button class="nav-btn" onclick="switchTab('dashboard')">📊 Dashboard</button>
      <button class="nav-btn" onclick="switchTab('precos')">💰 Preços</button>
      <button class="nav-btn" onclick="switchTab('lote')">📋 Lote</button>
      <button class="nav-btn" onclick="switchTab('cofre')">🔒 Cofre</button>
    </nav>
  </aside>

  <main>
    <div id="globalMessage" class="top-message"></div>

    <!-- TRIAGEM -->
    <section id="triagem" class="tab-content active">
      <div class="page-title">
        <div>
          <h2>Registro de Triagem</h2>
          <p>Importe o banco master, identifique o produto pelo código e registre o item no lote.</p>
        </div>
        <div class="toolbar">
          <button class="btn btn-outline" onclick="resetTriagemFields()">Limpar Campos</button>
        </div>
      </div>

      <div class="card">
        <div class="hint-box" onclick="document.getElementById('csvMaster').click()">
          <p id="masterStatus"><strong>Clique para importar o Banco Master</strong></p>
          <p class="subtle" style="margin-top:6px;">Formato ideal: id Produto / Categoria de Produto / Subcategoria de Produto / Produto</p>
          <input type="file" id="csvMaster" accept=".csv" hidden onchange="importMaster(this)">
        </div>
      </div>

      <div class="card">
        <h3>Cadastro de Item</h3>

        <div class="grid grid-3">
          <div class="form-group" style="grid-column:span 2;">
            <label>ID do Produto (SKU)</label>
            <input type="text" id="inpId" placeholder="Digite o SKU para busca em tempo real..." oninput="previewProd()">
            <div id="prevInfo" class="preview-box"></div>
          </div>

          <div class="form-group">
            <label>Código de Barras</label>
            <input type="text" id="inpBar" placeholder="Bipe ou digite o código único">
          </div>
        </div>

        <div class="grid grid-3" style="margin-top:16px;">
          <div class="form-group">
            <label>Fornecedor</label>
            <select id="inpSup" onchange="previewProd()">
              <option value="QUARTT">QUARTT</option>
              <option value="CNN">CNN</option>
              <option value="GOLD">GOLD</option>
              <option value="AG">AG</option>
              <option value="IMPORTADA">IMPORTADA</option>
            </select>
          </div>

          <div class="form-group">
            <label>Data da Venda</label>
            <input type="date" id="inpDate">
          </div>

          <div class="form-group">
            <label>Análise do Técnico</label>
            <select id="inpReason">
              <option value="Touch intermitente">Touch intermitente (Garantia)</option>
              <option value="Baixa amperagem">Baixa amperagem (Garantia)</option>
              <option value="Tela trincada">Tela trincada (Descarte)</option>
              <option value="Bateria estufada">Bateria estufada (Descarte)</option>
              <option value="Flex Rasgado">Flex Rasgado (Descarte)</option>
            </select>
          </div>
        </div>

        <div style="margin-top:18px;">
          <button class="btn btn-primary" style="width:100%;" onclick="addItem()">Registrar no Lote</button>
        </div>
      </div>

      <div class="card">
        <h3>Últimos 10 itens registrados</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>SKU</th>
                <th>Produto</th>
                <th>Barcode</th>
                <th>Fornecedor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="recentBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ENVIOS -->
    <section id="envios" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Agenda de Envios</h2>
          <p>Selecione uma data no calendário e visualize os envios registrados com fornecedor, rastreio, hora e produtos.</p>
        </div>
        <div class="toolbar">
          <button class="btn btn-primary" onclick="openEnvioModal()">Novo Envio</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h4>Envios no mês</h4>
          <p id="envioMesStat">0</p>
        </div>
        <div class="stat-card success">
          <h4>Itens enviados no mês</h4>
          <p id="envioItensStat">0</p>
        </div>
        <div class="stat-card warning">
          <h4>Fornecedor líder</h4>
          <p id="envioTopFornecedorStat" style="font-size:1.3rem;">-</p>
        </div>
        <div class="stat-card">
          <h4>Data selecionada</h4>
          <p id="envioDataSelecionadaStat" style="font-size:1.2rem;">-</p>
        </div>
      </div>

      <div class="calendar-layout">
        <div class="calendar-card">
          <div class="calendar-head">
            <button class="btn btn-outline btn-sm" onclick="changeCalendarMonth(-1)">◀</button>
            <h4 id="calendarTitle">Mês</h4>
            <button class="btn btn-outline btn-sm" onclick="changeCalendarMonth(1)">▶</button>
          </div>
          <div class="calendar-grid" id="calendarGrid"></div>
        </div>

        <div class="envios-panel">
          <div class="date-header">
            <div>
              <h4 id="selectedDateTitle">Envios da data</h4>
              <p class="subtle">Se não houver card, significa que não houve envio cadastrado nessa data.</p>
            </div>
            <div class="toolbar">
              <button class="btn btn-light btn-sm" onclick="openEnvioModal()">Adicionar envio nesta data</button>
            </div>
          </div>

          <div id="carouselControls" class="carousel-controls" style="display:none;">
            <button class="btn btn-outline btn-sm" onclick="prevEnvioCard()">◀ Anterior</button>
            <button class="btn btn-outline btn-sm" onclick="nextEnvioCard()">Próximo ▶</button>
          </div>

          <div id="enviosDiaContainer"></div>
        </div>
      </div>
    </section>

    <!-- PRODUTOS -->
    <section id="produtos" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Produtos / Banco Master</h2>
          <p>Cadastre, edite e consulte os produtos que serão reconhecidos automaticamente pelo código.</p>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3>Adicionar / Editar Produto</h3>
          <input type="hidden" id="prodEditIndex">

          <div class="grid grid-2">
            <div class="form-group">
              <label>Código / SKU</label>
              <input type="text" id="prodCodigo" placeholder="Ex.: 24111">
            </div>
            <div class="form-group">
              <label>Categoria</label>
              <input type="text" id="prodCategoria" placeholder="Ex.: Tela">
            </div>
          </div>

          <div class="grid grid-2" style="margin-top:14px;">
            <div class="form-group">
              <label>Subcategoria</label>
              <input type="text" id="prodSubcategoria" placeholder="Ex.: iPhone">
            </div>
            <div class="form-group">
              <label>Nome do Produto</label>
              <input type="text" id="prodNome" placeholder="Ex.: Tela iPhone 11">
            </div>
          </div>

          <div class="product-actions" style="margin-top:18px;">
            <button class="btn btn-primary" onclick="saveMasterProduct()">Salvar Produto</button>
            <button class="btn btn-outline" onclick="clearProductForm()">Limpar</button>
            <button class="btn btn-danger" onclick="deleteSelectedProductForm()">Excluir Selecionado</button>
          </div>

          <p class="footer-note">Dica: tudo que estiver aqui poderá ser reconhecido automaticamente nas telas do sistema.</p>
        </div>

        <div class="card">
          <h3>Resumo do Banco Master</h3>
          <div class="stats-grid" style="margin-bottom:0;">
            <div class="stat-card">
              <h4>Total de Produtos</h4>
              <p id="prodTotalStat">0</p>
            </div>
            <div class="stat-card success">
              <h4>Categorias</h4>
              <p id="prodCatStat">0</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="toolbar" style="margin-bottom:16px;">
          <input type="text" id="searchMaster" placeholder="Buscar por código ou nome..." oninput="renderMasterTable()" style="max-width:320px;">
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Subcategoria</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="masterBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- DASHBOARD -->
    <section id="dashboard" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Dashboard Executivo</h2>
          <p>Visão geral de triagem, lote e envios.</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h4>Total no lote</h4>
          <p id="dashTotal">0</p>
        </div>
        <div class="stat-card success">
          <h4>Garantias</h4>
          <p id="dashGar">0</p>
        </div>
        <div class="stat-card danger">
          <h4>Descartes</h4>
          <p id="dashDes">0</p>
        </div>
        <div class="stat-card warning">
          <h4>Valor estimado</h4>
          <p id="dashVal">R$ 0,00</p>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3>Status do Lote</h3>
          <canvas id="mainChart" style="max-height:340px;"></canvas>
        </div>

        <div class="card">
          <h3>Envios por Fornecedor</h3>
          <canvas id="envioChart" style="max-height:340px;"></canvas>
        </div>
      </div>
    </section>

    <!-- PREÇOS -->
    <section id="precos" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Gestão de Preços</h2>
          <p>Importe tabelas por fornecedor e mantenha o comparativo no sistema.</p>
        </div>
      </div>

      <div class="card">
        <div class="toolbar" style="margin-bottom:18px;">
          <button class="btn btn-primary" onclick="triggerPrice('QUARTT')">Importar QUARTT</button>
          <button class="btn btn-primary" onclick="triggerPrice('CNN')">Importar CNN</button>
          <button class="btn btn-primary" onclick="triggerPrice('GOLD')">Importar GOLD</button>
          <button class="btn btn-primary" onclick="triggerPrice('AG')">Importar AG</button>
          <button class="btn btn-primary" onclick="triggerPrice('IMPORTADA')">Importar IMPORTADA</button>
          <input type="file" id="priceInp" hidden onchange="processPriceCsv(this)">
        </div>

        <div class="grid grid-2" style="margin-bottom:16px;">
          <input type="text" id="searchPrice" placeholder="Buscar por SKU ou Produto..." oninput="renderPriceTable()">
          <select id="filterCatPrice" onchange="renderPriceTable()">
            <option value="">Todas as Categorias</option>
          </select>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Média</th>
                <th>Quartt</th>
                <th>CNN</th>
                <th>Gold</th>
                <th>AG</th>
                <th>Importada</th>
              </tr>
            </thead>
            <tbody id="priceBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- LOTE -->
    <section id="lote" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Lote Aberto</h2>
          <p>Consulte, filtre, edite e exporte os itens registrados.</p>
        </div>
      </div>

      <div class="card">
        <div class="toolbar" style="margin-bottom:16px;">
          <button class="btn btn-success" onclick="exportExcel('QUARTT')">Exportar QUARTT</button>
          <button class="btn btn-success" onclick="exportExcel('CNN')">Exportar CNN</button>
          <button class="btn btn-success" onclick="exportExcel('GOLD')">Exportar GOLD</button>
          <button class="btn btn-success" onclick="exportExcel('AG')">Exportar AG</button>
          <button class="btn btn-success" onclick="exportExcel('IMPORTADA')">Exportar IMPORTADA</button>
        </div>

        <div class="grid grid-2" style="margin-bottom:16px;">
          <input type="text" id="searchLote" placeholder="Buscar no lote..." oninput="renderLoteTable()">
          <select id="filterCatLote" onchange="renderLoteTable()">
            <option value="">Todas as Categorias</option>
          </select>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Produto</th>
                <th>Barcode</th>
                <th>Data Venda</th>
                <th>Status</th>
                <th>Preço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="loteBody"></tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- COFRE -->
    <section id="cofre" class="tab-content">
      <div class="page-title">
        <div>
          <h2>Cofre de Exportações</h2>
          <p>Histórico dos arquivos exportados pelo sistema.</p>
        </div>
      </div>

      <div class="card">
        <div class="grid grid-3" style="margin-bottom:16px;">
          <select id="vaultForn" onchange="renderVault()">
            <option value="">Todos os fornecedores</option>
            <option value="QUARTT">QUARTT</option>
            <option value="CNN">CNN</option>
            <option value="GOLD">GOLD</option>
            <option value="AG">AG</option>
            <option value="IMPORTADA">IMPORTADA</option>
          </select>
          <input type="date" id="vaultDate" onchange="renderVault()">
          <button class="btn btn-outline" onclick="clearVaultFilters()">Limpar Filtros</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data Exportação</th>
                <th>Arquivo</th>
                <th>Fornecedor</th>
                <th>Itens</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="vaultBody"></tbody>
          </table>
        </div>
      </div>
    </section>
  </main>

  <!-- MODAL NOVO ENVIO -->
  <div id="envioModal" class="modal">
    <div class="modal-box">
      <div class="modal-header">
        <div>
          <h3>Novo envio</h3>
          <p class="subtle">Cadastre fornecedor, rastreio e os produtos enviados.</p>
        </div>
        <button class="btn btn-outline btn-sm" onclick="closeEnvioModal()">Fechar</button>
      </div>

      <div class="modal-body">
        <div class="split-form">
          <div class="form-side">
            <div class="icon-circle">📦</div>
            <h4>Envio por fornecedor</h4>
            <p>Selecione o fornecedor, informe o rastreio, adicione os produtos por código e salve com data e hora exatas.</p>
          </div>

          <div>
            <div class="grid grid-3">
              <div class="form-group">
                <label>Fornecedor</label>
                <select id="envFornecedor"></select>
              </div>

              <div class="form-group">
                <label>Rastreio</label>
                <input type="text" id="envRastreio" placeholder="Ex.: BR123456789">
              </div>

              <div class="form-group">
                <label>Data do envio</label>
                <input type="date" id="envData">
              </div>
            </div>

            <div class="grid grid-2" style="margin-top:14px;">
              <div class="form-group">
                <label>Hora do cadastro</label>
                <input type="time" id="envHora">
              </div>

              <div class="form-group">
                <label>Status</label>
                <select id="envStatus">
                  <option value="Enviado">Enviado</option>
                  <option value="Recebido">Recebido</option>
                </select>
              </div>
            </div>

            <div class="form-group" style="margin-top:14px;">
              <label>Observação</label>
              <textarea id="envObs" placeholder="Observação opcional..."></textarea>
            </div>

            <div class="items-builder">
              <div class="section-title">Adicionar produtos ao envio</div>

              <div class="grid grid-4">
                <div class="form-group" style="grid-column:span 1;">
                  <label>Código do produto</label>
                  <input type="text" id="envProdCodigo" placeholder="Digite o código..." oninput="previewEnvioProduto()">
                </div>

                <div class="form-group" style="grid-column:span 2;">
                  <label>Produto reconhecido</label>
                  <div id="envProdPreview" class="preview-box">Digite o código do produto para reconhecimento automático.</div>
                </div>

                <div class="form-group">
                  <label>Quantidade</label>
                  <input type="number" id="envProdQtd" min="1" value="1">
                </div>
              </div>

              <div style="margin-top:14px;">
                <button class="btn btn-primary" onclick="addEnvioItem()">Adicionar item</button>
              </div>

              <div style="margin-top:16px;">
                <div class="table-wrap">
                  <table class="mini-table">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Produto</th>
                        <th>Categoria</th>
                        <th>Qtd</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody id="envioItensBody"></tbody>
                  </table>
                </div>
              </div>

              <p class="footer-note">O sistema busca o nome automaticamente com base no código presente no Banco Master.</p>
            </div>

            <div class="action-row" style="margin-top:18px;">
              <button class="btn btn-success" onclick="saveEnvio()">Salvar envio</button>
              <button class="btn btn-outline" onclick="clearEnvioDraft()">Limpar formulário</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
