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
  const PASSPORT_FEE = 257.25;  // R$, passaporte comum (PF, 2026)
  const ETA_GBP = 20;           // £, autorização do Reino Unido
  const FEES = 1.04;            // IOF (3,5%) + taxa do Wise ≈ 4%

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
  const daysBcn = $('#days-bcn');
  const daysLdn = $('#days-ldn');
  const dailyInput = $('#daily');
  const flightRows = $$('#flights tbody tr');

  const num = (input) => Math.max(0, Number(input.value) || 0);
  const range = (a, b) => `${fmtBRL.format(a)} a ${fmtNum.format(b)}`;

  const renderCosts = () => {
    const people = Math.max(1, num(peopleInput));

    // passagens
    let fMin = 0;
    let fMax = 0;
    flightRows.forEach((row) => {
      const min = Number(row.dataset.min);
      const max = Number(row.dataset.max);
      fMin += min;
      fMax += max;
      $('[data-group]', row).textContent = range(min * people, max * people);
    });
    $('#flights-total').textContent = range(fMin * people, fMax * people);

    // gastos do dia a dia
    const dailyEur = num(dailyInput);
    const totalDays = num(daysBcn) + num(daysLdn);
    const eurPP = totalDays * dailyEur;
    const brlPP = eurPP * rates.eur * FEES;

    $('#r-daily-eur').textContent = fmtEUR.format(eurPP);
    $('#r-daily-brl').textContent = '≈ ' + fmtBRL.format(roundTo(brlPP, 10));
    $('#r-people-txt').textContent = people === 1 ? '1 pessoa' : `${people} pessoas`;
    $('#r-group-eur').textContent = fmtEUR.format(eurPP * people);
    $('#r-group-brl').textContent = '≈ ' + fmtBRL.format(roundTo(brlPP * people, 10));

    // viagem completa (sem hotel, seguro e ingressos)
    const fixedPP = brlPP + PASSPORT_FEE + ETA_GBP * rates.gbp;
    const tMin = roundTo(fMin + fixedPP, 100);
    const tMax = roundTo(fMax + fixedPP, 100);
    $('#r-total-pp').textContent = range(tMin, tMax);
    $('#r-total-group').textContent = `${people === 1 ? 'Total' : 'Grupo'}: ${range(tMin * people, tMax * people)}`;
  };

  [peopleInput, daysBcn, daysLdn, dailyInput].forEach((el) => el.addEventListener('input', renderCosts));

  /* ---------- cotação (atualiza sozinha quando há internet) ---------- */
  const renderRates = () => {
    $$('[data-rate="eur"]').forEach((el) => { el.textContent = fmtBRL2.format(rates.eur); });
    $$('[data-rate="gbp"]').forEach((el) => { el.textContent = fmtBRL2.format(rates.gbp); });
    $$('[data-gbp]').forEach((el) => {
      el.textContent = `(≈ ${fmtBRL.format(Number(el.dataset.gbp) * rates.gbp)})`;
    });
    $$('[data-eur-day]').forEach((el) => {
      el.textContent = '≈ ' + fmtBRL.format(roundTo(40 * rates.eur * FEES, 1));
    });
    $$('[data-gbp-day]').forEach((el) => {
      el.textContent = '≈ £' + Math.round((40 * rates.eur) / rates.gbp);
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
