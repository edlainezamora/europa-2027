/* ==========================================================
   Europa 2027 — interações do site
   ========================================================== */
(() => {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  // localStorage pode falhar (aba anônima, bloqueio); o site funciona sem ele.
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('europa2027:' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('europa2027:' + key, JSON.stringify(value)); } catch { /* sem problema */ }
    },
  };

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const fmtBRL2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtEUR = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const roundTo = (n, step) => Math.round(n / step) * step;

  /* ---------- custos fixos ---------- */
  const FLIGHTS = [             // R$ por pessoa
    { name: 'Maringá → Guarulhos', detail: 'Ida · voo doméstico, cerca de 1 h', min: 300, max: 300 },
    { name: 'Guarulhos ⇄ Barcelona', detail: 'Ida e volta · TAP, Iberia ou Air Europa, em geral com 1 conexão', min: 5000, max: 5000 },
    { name: 'Barcelona ⇄ Londres', detail: 'Ida e volta · Vueling, easyJet, Ryanair ou British Airways, cerca de 2 h', min: 500, max: 1400 },
    { name: 'Guarulhos → Maringá', detail: 'Volta · voo doméstico, cerca de 1 h', min: 300, max: 300 },
  ];
  const PASSPORT_FEE = 257.25;  // R$, passaporte comum (PF, 2026)
  const ETA_GBP = 20;           // £, autorização do Reino Unido
  const ETIAS_EUR = 20;         // €, autorização da Europa (prevista para 2027)
  const ESIM_EUR = 20.52;       // €, Nomad eSIM Europa 10 GB / 30 dias
  const TUSUAL_EUR = 22.80;     // €, passe T-usual de Barcelona, ilimitado por 30 dias seguidos
  const TMOBILITAT_EUR = 4.50;  // €, cartão T-mobilitat onde o passe é carregado (uma vez só)
  const HOTEL_LDN_GBP = [40, 90]; // £ por pessoa por noite, hotel simples dividindo o quarto
  const TICKETS_BCN_EUR = 44;   // € Sagrada Família (~26) + Park Güell (~18)
  const TICKETS_LDN_GBP = 65;   // £ London Eye (~30) + Torre de Londres (~35)
  const FEES = 1.04;            // IOF (3,5%) + taxa do Wise ≈ 4%
  const INSURANCE = {           // R$, seguro viagem Europa 15 dias, por pessoa
    young: [180, 375],          // até 59 anos
    senior: [270, 560],         // 60 a 70 anos
  };

  const rates = { eur: 5.57, gbp: 6.58 }; // referência de out/2026, atualizada pela internet

  /* ---------- menus montados a partir das seções ---------- */
  const sections = $$('main section[data-label]');
  const subnavList = $('#subnav-list');
  const menuList = $('#menu-list');

  const menuItem = (href, icon, label, accent, num) => {
    const li = document.createElement('li');
    li.innerHTML =
      `<a class="menu__link" href="${href}" style="--accent:${accent}">` +
      `<span class="menu__icon" aria-hidden="true">${icon}</span><span>${label}</span>` +
      (num ? `<span class="menu__num">Passo ${num}</span>` : '') + '</a>';
    return li;
  };

  menuList.append(menuItem('#inicio', '🏠', 'Início', 'var(--navy)'));
  sections.forEach((s, i) => {
    const accent = s.style.getPropertyValue('--accent').trim() || 'var(--navy)';
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${s.id}" style="--accent:${accent}"><span aria-hidden="true">${s.dataset.icon}</span>${s.dataset.label}</a>`;
    subnavList.append(li);
    menuList.append(menuItem('#' + s.id, s.dataset.icon, s.dataset.label, accent, i + 1));
  });

  /* ---------- abrir / fechar o menu ---------- */
  const menu = $('#menu');
  const menuBtn = $('.menu-btn');

  const openMenu = () => {
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    $('.menu__link', menu)?.focus();
  };
  const closeMenu = (returnFocus = true) => {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (returnFocus) menuBtn.focus();
  };

  menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  menu.addEventListener('click', (e) => {
    if (e.target === menu || e.target.closest('[data-close-menu]')) closeMenu();
    else if (e.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu();
  });

  /* ---------- tamanho da letra ---------- */
  const SIZES = [16, 17.5, 19, 21, 23, 25];
  let sizeIdx = store.get('fontIdx', 2);
  if (!(sizeIdx >= 0 && sizeIdx < SIZES.length)) sizeIdx = 2;
  const btnDown = $('[data-font="down"]');
  const btnUp = $('[data-font="up"]');

  const applyFont = () => {
    document.documentElement.style.setProperty('--fs', SIZES[sizeIdx] + 'px');
    btnDown.disabled = sizeIdx === 0;
    btnUp.disabled = sizeIdx === SIZES.length - 1;
    store.set('fontIdx', sizeIdx);
  };
  btnDown.addEventListener('click', () => { if (sizeIdx > 0) { sizeIdx--; applyFont(); } });
  btnUp.addEventListener('click', () => { if (sizeIdx < SIZES.length - 1) { sizeIdx++; applyFont(); } });
  applyFont();

  /* ---------- altura do topo (para os links pararem no lugar certo) ---------- */
  const header = $('.topbar');
  const setHeaderH = () => document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  setHeaderH();
  if ('ResizeObserver' in window) new ResizeObserver(setHeaderH).observe(header);

  /* ---------- seção atual destacada no sub-menu ---------- */
  if ('IntersectionObserver' in window) {
    const links = new Map($$('a', subnavList).map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        const a = links.get(entry.target.id);
        if (!a) return;
        a.setAttribute('aria-current', 'true');
        const ul = subnavList;
        const left = a.offsetLeft - ul.clientWidth / 2 + a.clientWidth / 2;
        ul.scrollTo({ left, behavior: 'smooth' });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- botão "Topo" ---------- */
  const toTop = $('#to-top');
  const onScroll = () => toTop.classList.toggle('is-visible', window.scrollY > 900);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- contagem regressiva ---------- */
  const cdDate = $('#cd-date');
  const cdDays = $('#cd-days');
  const cdLabel = $('#cd-label');

  const renderCountdown = () => {
    const value = cdDate.value;
    if (!value) {
      cdDays.textContent = '?';
      cdLabel.textContent = 'Coloque a data da viagem para ver quantos dias faltam';
      return;
    }
    const [y, m, d] = value.split('-').map(Number);
    const trip = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((trip - today) / 86400000);

    if (days > 1) {
      cdDays.textContent = fmtNum.format(days);
      cdLabel.textContent = 'dias para a viagem! 🎉';
    } else if (days === 1) {
      cdDays.textContent = '1';
      cdLabel.textContent = 'dia! A viagem é amanhã! 🧳';
    } else if (days === 0) {
      cdDays.textContent = '✈️';
      cdLabel.textContent = 'É hoje! Boa viagem!';
    } else {
      cdDays.textContent = '💛';
      cdLabel.textContent = 'Esperamos que a viagem tenha sido incrível!';
    }
  };
  cdDate.value = store.get('tripDate', '');
  cdDate.addEventListener('change', () => { store.set('tripDate', cdDate.value); renderCountdown(); });
  renderCountdown();

  /* ---------- botões − / + ---------- */
  const clamp = (input) => {
    const min = Number(input.min);
    const max = Number(input.max);
    let v = Math.round(Number(input.value));
    if (!Number.isFinite(v)) v = min;
    input.value = Math.min(max, Math.max(min, v));
  };

  $$('[data-stepper]').forEach((stepper) => {
    const input = $('input', stepper);
    const size = Number(stepper.dataset.stepSize || 1);
    $$('button', stepper).forEach((btn) => {
      btn.addEventListener('click', () => {
        input.value = Number(input.value) + Number(btn.dataset.step) * size;
        clamp(input);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    input.addEventListener('change', () => { clamp(input); input.dispatchEvent(new Event('input', { bubbles: true })); });
  });

  /* ---------- custos: passagens + calculadora ---------- */
  const peopleInput = $('#people');
  const seniorsInput = $('#seniors');
  const daysBcn = $('#days-bcn');
  const daysLdn = $('#days-ldn');
  const dailyInput = $('#daily');
  const costTable = $('#cost-table');

  const num = (input) => Math.max(0, Number(input.value) || 0);
  const range = (a, b) => (a === b ? fmtBRL.format(a) : `${fmtBRL.format(a)} a ${fmtNum.format(b)}`);

  // "um dia em Barcelona / Londres": tudo proporcional ao valor de "Euros por dia"
  const renderDaily = (dailyEur) => {
    const gbpDay = Math.round((dailyEur * rates.eur) / rates.gbp);
    $$('[data-daily-eur]').forEach((el) => { el.textContent = `€${dailyEur}`; });
    $$('[data-daily-gbp]').forEach((el) => { el.textContent = `£${gbpDay}`; });
    $$('[data-eur-day]').forEach((el) => { el.textContent = '≈ ' + fmtBRL.format(dailyEur * rates.eur * FEES); });
    $$('[data-gbp-day]').forEach((el) => { el.textContent = `≈ £${gbpDay}`; });

    $$('[data-budget]').forEach((card) => {
      const symbol = card.dataset.budget === 'gbp' ? '£' : '€';
      const target = card.dataset.budget === 'gbp' ? gbpDay : dailyEur;
      const items = $$('[data-base]', card);
      const base = items.reduce((acc, el) => acc + Number(el.dataset.base), 0);
      const values = items.map((el) => Math.round((Number(el.dataset.base) * target) / base));
      // ajusta o arredondamento no maior item para a soma bater com o total do dia
      const biggest = values.indexOf(Math.max(...values));
      values[biggest] += target - values.reduce((acc, v) => acc + v, 0);
      items.forEach((el, i) => { el.textContent = `${symbol}${values[i]}`; });
    });
  };

  const renderCosts = () => {
    const people = Math.max(1, num(peopleInput));

    // gastos do dia a dia
    const dailyEur = num(dailyInput);
    const totalDays = num(daysBcn) + num(daysLdn);
    const eurPP = totalDays * dailyEur;
    const brlPP = eurPP * rates.eur * FEES;

    renderDaily(dailyEur);
    $('#r-daily-eur').textContent = fmtEUR.format(eurPP);
    $('#r-daily-brl').textContent = '≈ ' + fmtBRL.format(roundTo(brlPP, 10));
    $('#r-people-txt').textContent = people === 1 ? '1 pessoa' : `${people} pessoas`;
    $('#r-group-eur').textContent = fmtEUR.format(eurPP * people);
    $('#r-group-brl').textContent = '≈ ' + fmtBRL.format(roundTo(brlPP * people, 10));

    // seguro viagem (depende de quantos têm 60 anos ou mais)
    if (num(seniorsInput) > people) seniorsInput.value = people;
    const seniors = num(seniorsInput);
    const young = people - seniors;
    const insMin = young * INSURANCE.young[0] + seniors * INSURANCE.senior[0];
    const insMax = young * INSURANCE.young[1] + seniors * INSURANCE.senior[1];
    const insLabel = `${people === 1 ? '1 pessoa' : `${people} pessoas`} (${seniors} com 60 anos ou mais)`;
    $$('[data-ins-label]').forEach((el) => { el.textContent = insLabel; });
    $$('[data-ins-group]').forEach((el) => { el.textContent = range(insMin, insMax); });

    // tabela com todos os custos, item por item
    const bcnDays = num(daysBcn);
    const ldnDays = num(daysLdn);
    const eurBRL = rates.eur * FEES;
    const gbpBRL = rates.gbp * FEES;
    const rows = [];
    const add = (cat, name, detail, orig, ppMin, ppMax = ppMin, gMin = ppMin * people, gMax = ppMax * people) => {
      rows.push({ cat, name, detail, orig, ppMin, ppMax, gMin, gMax });
    };

    FLIGHTS.forEach((f) => add('✈️ Passagens de avião', f.name, f.detail, '—', f.min, f.max));

    add('📄 Documentos', 'Passaporte', 'Taxa da Polícia Federal', '—', PASSPORT_FEE);
    add('📄 Documentos', 'ETA (Reino Unido)', 'Autorização para entrar na Inglaterra', `£${ETA_GBP}`, ETA_GBP * gbpBRL);
    add('📄 Documentos', 'ETIAS (Europa)', 'Previsto para começar em 2027', `€${ETIAS_EUR}`, ETIAS_EUR * eurBRL);

    add('🩺 Seguro viagem', 'Seguro viagem', `Plano Europa, 15 dias (${seniors} com 60 anos ou mais)`, '—',
      young > 0 ? INSURANCE.young[0] : INSURANCE.senior[0],
      seniors > 0 ? INSURANCE.senior[1] : INSURANCE.young[1],
      insMin, insMax);

    if (bcnDays) add('🍽️ Gastos do dia a dia', 'Barcelona', `${bcnDays} dias × €${dailyEur} (comida e extras)`, `€${fmtNum.format(bcnDays * dailyEur)}`, bcnDays * dailyEur * eurBRL);
    if (ldnDays) add('🍽️ Gastos do dia a dia', 'Londres', `${ldnDays} dias × €${dailyEur} (comida, transporte, extras)`, `€${fmtNum.format(ldnDays * dailyEur)}`, ldnDays * dailyEur * eurBRL);

    if (bcnDays) {
      // o passe vale 30 dias seguidos a partir do primeiro uso (conta também os dias em Londres)
      const passes = Math.ceil((bcnDays + ldnDays) / 30);
      const passEur = passes * TUSUAL_EUR + TMOBILITAT_EUR;
      add('🚇 Transporte em Barcelona', 'Passe T-usual',
        `${passes === 1 ? '1 passe' : `${passes} passes`} de 30 dias (metrô, ônibus e trem à vontade, inclusive no aeroporto) + cartão T-mobilitat`,
        `€${passEur.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, passEur * eurBRL);
    }

    if (bcnDays) add('🏨 Hospedagem', 'Barcelona', 'Em casa 🏠', '—', 0);
    if (ldnDays) {
      add('🏨 Hospedagem', 'Hotel em Londres', `${ldnDays} ${ldnDays === 1 ? 'noite' : 'noites'}, hotel simples dividindo o quarto (estimativa)`,
        `£${ldnDays * HOTEL_LDN_GBP[0]} a £${ldnDays * HOTEL_LDN_GBP[1]}`,
        ldnDays * HOTEL_LDN_GBP[0] * gbpBRL, ldnDays * HOTEL_LDN_GBP[1] * gbpBRL);
    }

    add('📶 Internet no celular', 'Chip virtual Nomad eSIM', 'Pacote Europa 10 GB, 30 dias', `€${ESIM_EUR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, ESIM_EUR * eurBRL);

    if (bcnDays) add('🎟️ Ingressos (sugestão)', 'Barcelona', 'Sagrada Família e Park Güell', `€${TICKETS_BCN_EUR}`, TICKETS_BCN_EUR * eurBRL);
    if (ldnDays) add('🎟️ Ingressos (sugestão)', 'Londres', 'London Eye e Torre de Londres', `£${TICKETS_LDN_GBP}`, TICKETS_LDN_GBP * gbpBRL);

    const r = (a, b) => range(Math.round(a), Math.round(b));
    let html = '';
    let lastCat = '';
    rows.forEach((row) => {
      if (row.cat !== lastCat) {
        html += `<tr class="ct-cat"><th colspan="5" scope="colgroup">${row.cat}</th></tr>`;
        lastCat = row.cat;
      }
      html += '<tr>' +
        `<th scope="row">${row.name}</th>` +
        `<td class="ct-detail" data-label="Detalhe">${row.detail}</td>` +
        `<td class="num ct-orig${row.orig === '—' ? ' is-empty' : ''}" data-label="Valor">${row.orig}</td>` +
        `<td class="num ct-pp" data-label="Por pessoa">${row.ppMax === 0 ? 'R$ 0' : r(row.ppMin, row.ppMax)}</td>` +
        `<td class="num ct-group" data-label="Para o grupo" data-col-group>${row.gMax === 0 ? 'R$ 0' : r(row.gMin, row.gMax)}</td>` +
        '</tr>';
    });
    $('tbody', costTable).innerHTML = html;
    costTable.classList.toggle('is-solo', people === 1);

    const sum = (key) => rows.reduce((acc, row) => acc + row[key], 0);
    const totPP = [roundTo(sum('ppMin'), 10), roundTo(sum('ppMax'), 10)];
    const totG = [roundTo(sum('gMin'), 10), roundTo(sum('gMax'), 10)];
    $('#ct-total-pp').textContent = range(...totPP);
    $('#ct-total-group').textContent = range(...totG);

    // viagem completa = soma da tabela
    $('#r-total-pp').textContent = range(...totPP);
    $('#r-total-group').textContent = `${people === 1 ? 'Total' : 'Grupo'}: ${range(...totG)}`;
  };

  seniorsInput.addEventListener('input', () => {
    if (num(seniorsInput) > num(peopleInput)) peopleInput.value = Math.min(num(seniorsInput), Number(peopleInput.max));
  });
  [peopleInput, seniorsInput, daysBcn, daysLdn, dailyInput].forEach((el) => el.addEventListener('input', renderCosts));

  /* ---------- cotação (atualiza sozinha quando há internet) ---------- */
  const renderRates = () => {
    $$('[data-rate="eur"]').forEach((el) => { el.textContent = fmtBRL2.format(rates.eur); });
    $$('[data-rate="gbp"]').forEach((el) => { el.textContent = fmtBRL2.format(rates.gbp); });
    $$('[data-gbp]').forEach((el) => {
      el.textContent = `(≈ ${fmtBRL.format(Number(el.dataset.gbp) * rates.gbp)})`;
    });
    renderCosts();
  };

  const loadRates = async () => {
    const status = $('#rates-status');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/EUR-BRL,GBP-BRL', { signal: ctrl.signal });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const eur = Number(data.EURBRL?.bid);
      const gbp = Number(data.GBPBRL?.bid);
      if (!(eur > 0 && gbp > 0)) throw new Error('cotação inválida');
      rates.eur = eur;
      rates.gbp = gbp;
      const when = (data.EURBRL.create_date || '').split(' ');
      const [yy, mm, dd] = (when[0] || '').split('-');
      status.textContent = dd ? `atualizada em ${dd}/${mm}/${yy}, às ${(when[1] || '').slice(0, 5)}` : 'atualizada agora';
      renderRates();
    } catch {
      status.textContent = 'valores de referência (sem conexão para atualizar)';
    } finally {
      clearTimeout(timer);
    }
  };

  renderRates();
  loadRates();

  /* ---------- abas iPhone / Android ---------- */
  $$('[data-tabs]').forEach((box) => {
    const key = 'tab:' + box.dataset.tabs;
    const tabs = $$('[role="tab"]', box);

    const select = (tab, focus = false) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
      store.set(key, tab.id);
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!dir) return;
        e.preventDefault();
        select(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });

    // já abre no tipo de celular de quem está usando
    const saved = store.get(key, null);
    const guess = /android/i.test(navigator.userAgent) ? 'tab-android' : 'tab-iphone';
    const initial = tabs.find((t) => t.id === saved) || tabs.find((t) => t.id === guess) || tabs[0];
    select(initial);
  });

  /* ---------- checklist ---------- */
  const todo = $('#todo');
  const boxes = $$('input[type="checkbox"]', todo);
  const fill = $('#progress-fill');
  const progressText = $('#progress-text');
  const saved = new Set(store.get('checklist', []));

  const renderProgress = () => {
    const done = boxes.filter((b) => b.checked).length;
    fill.style.width = (done / boxes.length) * 100 + '%';
    progressText.textContent = done === boxes.length
      ? 'Tudo pronto! Boa viagem! 🎉'
      : `${done} de ${boxes.length} prontos`;
  };

  boxes.forEach((b) => {
    b.checked = saved.has(b.value);
    b.addEventListener('change', () => {
      store.set('checklist', boxes.filter((x) => x.checked).map((x) => x.value));
      renderProgress();
    });
  });
  renderProgress();

  $('#reset-btn').addEventListener('click', () => {
    if (!window.confirm('Desmarcar todos os itens da lista?')) return;
    boxes.forEach((b) => { b.checked = false; });
    store.set('checklist', []);
    renderProgress();
  });

  $('#print-btn').addEventListener('click', () => {
    document.body.classList.add('print-checklist');
    window.print();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('print-checklist'));

  /* ---------- ouvir as frases ---------- */
  const synth = window.speechSynthesis;
  if (synth && 'SpeechSynthesisUtterance' in window) {
    let speakingBtn = null;
    const pickVoice = (lang) => {
      const voices = synth.getVoices();
      return voices.find((v) => v.lang === lang) ||
        voices.find((v) => v.lang.replace('_', '-').startsWith(lang.slice(0, 2)));
    };

    $$('.say').forEach((btn) => {
      btn.setAttribute('aria-label', `Ouvir: ${btn.textContent}`);
      btn.addEventListener('click', () => {
        synth.cancel();
        speakingBtn?.classList.remove('is-speaking');
        const u = new SpeechSynthesisUtterance(btn.textContent);
        u.lang = btn.dataset.lang;
        u.rate = 0.8;
        const voice = pickVoice(u.lang);
        if (voice) u.voice = voice;
        u.onend = u.onerror = () => btn.classList.remove('is-speaking');
        btn.classList.add('is-speaking');
        speakingBtn = btn;
        synth.speak(u);
      });
    });
  } else {
    document.documentElement.classList.add('no-speech');
    $$('.say').forEach((btn) => { btn.disabled = true; });
  }

  /* ---------- tabelas viram cartões no celular ---------- */
  $$('table[data-stack]').forEach((table) => {
    const labels = $$('thead th', table).map((th) => th.textContent.trim());
    $$('tbody tr, tfoot tr', table).forEach((tr) => {
      let col = 0;
      [...tr.cells].forEach((cell) => {
        if (cell.tagName === 'TD' && labels[col]) cell.dataset.label = labels[col];
        col += cell.colSpan;
      });
    });
    table.classList.add('is-stackable');
  });
})();
