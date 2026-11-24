// ===== Pencarian =====
// Menambah ikon cari di navbar. Kalau diklik, panel pencarian turun di bawah navbar.
// Yang dicari ada dua macam, dan dua-duanya terbaca otomatis tanpa daftar manual:
//  1. Berita, vlog, dokumentasi, program, video, dan Instagram dari panel operator: ditanyakan LANGSUNG ke Supabase
//     setiap kali pengunjung mengetik (judul, ringkasan, dan isi tulisan). Jadi unggahan yang baru saja terbit
//     langsung bisa dicari, tanpa menunggu apa pun.
//  2. Halaman biasa (tiap bagian beranda, halaman divisi, halaman portal, dst.): dibaca dari file HTML-nya.
//     Halaman baru ikut terbaca selama ada link ke halaman itu dari beranda atau halaman portal.
// Dimuat oleh script.js. Butuh dibuka lewat server (Live Server / hosting), bukan dobel-klik file.
(() => {
  const navbar = document.querySelector('.navbar');
  const me = document.currentScript;
  if (!navbar || !me) return;
  const base = new URL('.', me.src); // folder utama web (tempat file ini berada)

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = new URL('search.css', base).href;
  document.head.append(css);

  // Halaman awal yang dibaca. Dari link di dalamnya, halaman lain di web ini ikut ditemukan (satu tingkat).
  const SEED = ['index.html', 'portal/semua-berita.html', 'portal/galeri-video.html', 'portal/galeri-instagram.html'];
  const MAX_PAGES = 40; // batas jumlah halaman yang dibaca, supaya tetap ringan
  const LIMIT = 12; // hasil yang ditampilkan
  // Cadangan kalau halaman tidak bisa dibaca (misalnya file dibuka langsung tanpa server)
  const STATIC = [
    { t: 'Tentang kami', d: 'MAN1SKA TV adalah wadah siswa untuk berkarya lewat video, liputan, dan siaran.', k: 'Halaman', u: 'index.html#about' },
    { t: 'Kontak', d: 'Alamat, email, Instagram, peta, dan formulir pesan untuk MAN1SKA TV.', k: 'Halaman', u: 'index.html#contact' },
    { t: 'Berita selengkapnya', d: 'Arsip semua tulisan dan foto liputan MAN1SKA TV.', k: 'Halaman', u: 'portal/semua-berita.html' },
    { t: 'Galeri video', d: 'Video liputan, vlog, dan dokumentasi MAN1SKA TV.', k: 'Halaman', u: 'portal/galeri-video.html' },
    { t: 'Galeri Instagram', d: 'Reels dan postingan terbaru dari @man1skatv.', k: 'Halaman', u: 'portal/galeri-instagram.html' },
  ];

  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const flat = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const text = (n) => (n ? flat(n.textContent) : '');
  const cut = (s, n) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
  const tgl = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const bacaUrl = (id) => `${new URL('berita/baca.html', base).href}?id=${encodeURIComponent(id)}`;
  const idYt = (u) => ((String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})(?![\w-])/) || [])[1]);

  // ----- Sumber 1: unggahan panel operator (Supabase), ditanyakan langsung -----
  // Alamat dan kunci diambil dari supabase-config.js. Kalau halaman ini belum memuatnya, file itu dibaca sendiri.
  let cfgJanji;
  const config = () => cfgJanji || (cfgJanji = (async () => {
    let url, key;
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
      url = SUPABASE_URL;
      key = SUPABASE_ANON_KEY;
    } else {
      const src = await fetch(new URL('supabase-config.js', base)).then((r) => (r.ok ? r.text() : ''));
      url = (src.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/) || [])[1];
      key = (src.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/) || [])[1];
    }
    return url && key && !url.includes('ISI_') ? { url, key } : null;
  })().catch(() => null));

  // Tanda baca yang punya arti khusus di filter Supabase dibuang dari kata yang diketik
  const bersih = (w) => w.replace(/[,()"\\*]/g, '');
  // Setiap kata harus ada di judul, ringkasan, isi, atau jenis (kata-kata dihubungkan dengan "dan")
  const FIELDS = ['judul', 'ringkasan', 'isi', 'jenis'];
  const dbQuery = (words) => {
    const cond = (w) => `or(${FIELDS.map((f) => `${f}.ilike.*${encodeURIComponent(w)}*`).join(',')})`;
    return `select=id,tanggal,jenis,judul,ringkasan,isi,ig,youtube&terbit=eq.true&and=(${words.map(cond).join(',')})&order=tanggal.desc,created_at.desc&limit=40`;
  };
  // Satu baris Supabase jadi satu hasil. Instagram dan Video dibuka di tempat aslinya (seperti di galeri), sisanya di halaman baca.
  const rowEntry = (r) => {
    const yt = idYt(r.youtube);
    let u = bacaUrl(r.id), ext = false;
    if (r.jenis === 'Instagram' && /^https?:\/\//i.test(r.ig || '')) { u = r.ig; ext = true; }
    else if (r.jenis === 'Video' && yt) { u = `https://www.youtube.com/watch?v=${yt}`; ext = true; }
    return { t: r.judul || '', d: flat(r.ringkasan), b: flat(r.isi), k: r.jenis || 'Berita', date: r.tanggal ? tgl(r.tanggal) : '', u, ext };
  };
  const dbSearch = async (words) => {
    if (!words.length) return [];
    const c = await config();
    if (!c) return []; // belum tersambung ke Supabase: hanya halaman biasa yang dicari
    const r = await fetch(`${c.url}/rest/v1/berita?${dbQuery(words)}`, { headers: { apikey: c.key } });
    if (!r.ok) throw new Error(`${r.status} ${await r.text().catch(() => '')}`.trim());
    return (await r.json()).map(rowEntry);
  };

  // ----- Sumber 2: halaman biasa, dibaca dari file HTML -----
  // Bagian yang diisi belakangan oleh berita-live.js tidak ikut dibaca di sini (isinya sudah dicari lewat Supabase),
  // begitu juga menu, footer, dan formulir yang cuma mengulang-ulang.
  const NOISE = 'script, style, noscript, nav, footer, aside, form, iframe, svg, .empty-note, .news-nav, .program-hint, #news-track, #program-list, #video-grid, #ig-grid, #news-list, #artikel, #feature, #chips, #rank';
  const siteRoot = base.href;
  const home = new URL('index.html', base).href;

  // Link ke halaman .html lain di web ini (halaman baca dan panel operator dilewati)
  const links = (doc, pageUrl) => [...doc.querySelectorAll('a[href]')].map((a) => {
    try { const u = new URL(a.getAttribute('href'), pageUrl); u.hash = ''; u.search = ''; return u.href; } catch (err) { return ''; }
  }).filter((h) => h.startsWith(siteRoot) && /\.html$/i.test(h) && !/\/baca\.html$/i.test(h) && !/\/admin\//i.test(h));

  const pageEntries = (doc, pageUrl) => {
    doc.querySelectorAll(NOISE).forEach((n) => n.remove());
    const out = [];
    const isHome = pageUrl === home || pageUrl === siteRoot;
    const kind = /\/divisi\//i.test(pageUrl) ? 'Divisi' : 'Halaman';
    const lead = (el) => text(el.querySelector('.lead')) || text(el.querySelector('p'));

    // Divisi di beranda (kartu yang menuju halaman divisi)
    doc.querySelectorAll('.role-row').forEach((c) => {
      try { out.push({ t: text(c.querySelector('h3')), d: text(c.querySelector('p')), b: '', k: 'Divisi', u: new URL(c.getAttribute('href') || '', pageUrl).href }); } catch (err) { /* link rusak dilewati */ }
    });

    if (isHome) {
      // Beranda: tiap bagian (Tentang kami, Divisi, Kontak, dst.) jadi satu hasil yang melompat ke bagian itu
      doc.querySelectorAll('section[id]').forEach((s) => {
        out.push({ t: text(s.querySelector('h2')) || text(s.querySelector('h1')), d: cut(lead(s), 160), b: cut(text(s), 6000), k: 'Halaman', u: `${home}#${s.id}` });
      });
    } else {
      const meta = doc.querySelector('meta[name="description"]');
      const judul = text(doc.querySelector('h1')) || text(doc.querySelector('title')).replace(/\s*[-–|]\s*MAN1SKA TV\s*$/i, '');
      out.push({ t: judul, d: cut(flat(meta && meta.content) || lead(doc.body), 160), b: cut(text(doc.body), 6000), k: kind, u: pageUrl });
    }
    return out.filter((x) => x.t);
  };

  const ambil = (url) => fetch(url)
    .then((r) => (r.ok ? r.text() : ''))
    .then((h) => (h ? new DOMParser().parseFromString(h, 'text/html') : null))
    .catch(() => null);

  const crawl = async () => {
    const seen = new Set();
    const entries = [];
    const kunjungi = async (urls, cariLink) => {
      const todo = [...new Set(urls)].filter((u) => !seen.has(u)).slice(0, Math.max(0, MAX_PAGES - seen.size));
      todo.forEach((u) => seen.add(u));
      const docs = await Promise.all(todo.map(ambil));
      const found = [];
      docs.forEach((doc, i) => {
        if (!doc) return;
        if (cariLink) found.push(...links(doc, todo[i])); // link dikumpulkan sebelum menu dan footer dibuang
        entries.push(...pageEntries(doc, todo[i]));
      });
      return found;
    };
    const here = location.href.split('#')[0].split('?')[0];
    const awal = SEED.map((p) => new URL(p, base).href);
    if (here.startsWith(siteRoot) && /\.html$/i.test(here) && !/\/(baca|admin\/)/i.test(here)) awal.push(here); // halaman yang sedang dibuka ikut
    const lanjut = await kunjungi(awal, true);
    await kunjungi(lanjut, false);
    return entries;
  };

  // ----- Mencari dan mengurutkan -----
  const prep = (x) => ({ ...x, n: { t: norm(x.t), d: norm(x.d), k: norm(x.k), b: norm(x.b) } });

  let ready;
  const load = () => ready || (ready = crawl().catch(() => []).then((found) => {
    // Satu alamat = satu hasil. Kalau ada dua sumber untuk alamat yang sama (misalnya kartu divisi dan halaman divisi), digabung.
    const byUrl = new Map();
    [...found, ...STATIC.map((s) => ({ ...s, u: new URL(s.u, base).href }))].forEach((x) => {
      const old = byUrl.get(x.u);
      if (!old) byUrl.set(x.u, { ...x });
      else { if (!old.d) old.d = x.d; old.b = flat(`${old.b || ''} ${x.b || ''}`); }
    });
    return [...byUrl.values()].map(prep);
  }));

  // Semua kata yang diketik harus ada; kata di judul bernilai paling tinggi, lalu jenis, ringkasan, dan isi
  const skor = (it, terms) => {
    let s = 0;
    for (const w of terms) {
      if (it.n.t.includes(w)) s += it.n.t.startsWith(w) || it.n.t.includes(` ${w}`) ? 6 : 4;
      else if (it.n.k.includes(w)) s += 3;
      else if (it.n.d.includes(w)) s += 1;
      else if (it.n.b.includes(w)) s += 0.5;
      else return null;
    }
    return s;
  };
  const find = (items, terms) => {
    if (!terms.length) return [];
    return items.map((it) => ({ it, s: skor(it, terms) })).filter((r) => r.s !== null).sort((a, b) => b.s - a.s).map((r) => r.it);
  };

  // Cuplikan yang ditampilkan di bawah judul. Kalau kata yang dicari cuma ada di isi tulisan, cuplikan diambil dari sekitar kata itu.
  const cuplikan = (it, terms) => {
    const d = it.d || '';
    if (terms.some((w) => it.n.d.includes(w))) return cut(d, 160);
    const low = (it.b || '').toLowerCase();
    const at = terms.map((w) => low.indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (at === undefined) return cut(d || it.b || '', 160);
    const from = Math.max(0, at - 50);
    return `${from ? '…' : ''}${it.b.slice(from, from + 150).trim()}${from + 150 < it.b.length ? '…' : ''}`;
  };

  const mark = (s, q) => {
    const words = q.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) return esc(s);
    return s.split(new RegExp(`(${words.join('|')})`, 'gi')).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
  };

  // ----- Tampilan -----
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-search';
  btn.setAttribute('aria-label', 'Cari');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Cari (tekan /)';
  btn.innerHTML = ICON;
  const burger = document.querySelector('#hamburger-menu');
  const anchor = burger || navbar.querySelector('.back-btn');
  if (anchor) anchor.before(btn); else navbar.append(btn);

  const backdrop = document.createElement('div');
  backdrop.className = 'search-backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'search');
  panel.innerHTML = `<div class="search-box"><label class="search-field">${ICON}<input type="search" placeholder="Cari berita, program, atau divisi..." aria-label="Cari di MAN1SKA TV" autocomplete="off"></label><div class="search-body" aria-live="polite"></div></div>`;
  navbar.append(backdrop, panel);
  const input = panel.querySelector('input');
  const body = panel.querySelector('.search-body');

  let active = -1;
  const setActive = (i) => {
    const els = body.querySelectorAll('.search-item');
    els.forEach((e, j) => e.classList.toggle('is-active', j === i));
    active = i;
    if (els[i]) els[i].scrollIntoView({ block: 'nearest' });
  };

  let urutan = 0; // penanda pencarian terbaru: hasil dari ketikan yang sudah lewat dibuang
  const render = async () => {
    const q = input.value.trim();
    const saya = ++urutan;
    active = -1;
    if (!q) {
      body.innerHTML = `<p class="search-hint">Ketik untuk mencari berita, program, divisi, atau halaman.</p><div class="search-chips">${['Berita', 'Vlog', 'Dokumentasi', 'Program', 'Video', 'Instagram', 'Divisi'].map((w) => `<button type="button">${w}</button>`).join('')}</div>`;
      return;
    }
    if (!body.querySelector('.search-results')) body.innerHTML = '<p class="search-hint">Mencari...</p>'; // hasil lama dibiarkan tampil sampai yang baru datang
    const terms = norm(q).split(/\s+/).filter(Boolean).slice(0, 6);
    const words = q.split(/\s+/).map(bersih).filter(Boolean).slice(0, 6);
    let gagal = false;
    const [halaman, unggahan] = await Promise.all([
      load(),
      dbSearch(words).catch((err) => { gagal = true; console.error('Pencarian di Supabase gagal:', err.message || err); return []; }),
    ]);
    if (saya !== urutan) return;
    const semua = find([...unggahan.map(prep), ...halaman], terms);
    const found = semua.slice(0, LIMIT);
    const catatan = gagal ? '<p class="search-hint">Berita terbaru belum bisa dicari sekarang. Coba lagi sebentar lagi.</p>' : '';
    if (!found.length) {
      body.innerHTML = gagal
        ? catatan
        : `<p class="search-hint">Tidak ada hasil untuk “${esc(q)}”. Coba kata lain, misalnya nama divisi atau judul berita.</p>`;
      return;
    }
    const jumlah = semua.length > LIMIT ? `${LIMIT} hasil teratas` : `${found.length} hasil`;
    body.innerHTML = `<p class="search-count">${jumlah}</p><ul class="search-results" role="listbox">${found.map((r) => `<li role="presentation"><a class="search-item" role="option" href="${esc(r.u)}"${r.ext ? ' target="_blank" rel="noopener"' : ''}><span class="m"><span class="kind">${esc(r.k)}</span>${r.date ? `<span>${esc(r.date)}</span>` : ''}</span><span class="t">${mark(r.t, q)}</span><span class="d">${mark(cuplikan(r, terms), q)}</span></a></li>`).join('')}</ul>${catatan}`;
    setActive(0);
  };

  const closeMenu = () => {
    const menu = document.querySelector('#menu');
    if (menu) menu.classList.remove('active');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    closeMenu(); // menu HP dan pencarian tidak dibuka bersamaan
    panel.hidden = false;
    backdrop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    render();
    input.focus();
    load(); // mulai membaca halaman-halaman web selagi pengunjung mengetik
    config(); // dan menyiapkan sambungan ke Supabase
  };
  const close = () => {
    panel.hidden = true;
    backdrop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  backdrop.addEventListener('click', close);
  if (burger) burger.addEventListener('click', close);

  // Pencarian dijalankan sebentar setelah berhenti mengetik, supaya Supabase tidak ditanya di setiap huruf
  let tunda = 0;
  input.addEventListener('input', () => {
    clearTimeout(tunda);
    if (!input.value.trim()) { tunda = 0; render(); return; }
    tunda = setTimeout(() => { tunda = 0; render(); }, 200);
  });

  input.addEventListener('keydown', (e) => {
    const n = body.querySelectorAll('.search-item').length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); setActive((active + 1) % n); }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); setActive((active - 1 + n) % n); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const buka = () => { const a = body.querySelectorAll('.search-item')[Math.max(active, 0)]; if (a) a.click(); };
      if (tunda) { clearTimeout(tunda); tunda = 0; render().then(buka); } // Enter sebelum hasil terbaru muncul: tunggu hasilnya dulu
      else buka();
    }
  });

  body.addEventListener('click', (e) => {
    const chip = e.target.closest('.search-chips button');
    if (chip) { input.value = chip.textContent; render(); input.focus(); return; }
    const a = e.target.closest('.search-item');
    if (a && a.target !== '_blank') close(); // halaman yang sama (lompat ke bagian) tidak memuat ulang, jadi panel ditutup di sini
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === '/' && panel.hidden && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
  });
})();
