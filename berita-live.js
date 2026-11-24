// ===== Berita dan program dari panel operator (Supabase) =====
// HTML web sengaja tidak menyimpan kartu berita atau program. Semuanya dibuat di sini dari data yang diunggah
// lewat panel operator (admin/), jadi web kosong sampai ada unggahan:
//  - index.html               : kartu berita terbaru (#news-track) dan daftar program (#program-list)
//  - portal/semua-berita.html : arsip semua berita (#news-list)
//  - berita/baca.html         : isi satu berita atau program (alamatnya baca.html?id=...)
//  - portal/galeri-video.html     : video dari unggahan yang kolom Link YouTube-nya diisi (#video-grid)
//  - portal/galeri-instagram.html : petak dari unggahan yang kolom Link Reels Instagram-nya diisi (#ig-grid)
// Jenis Berita, Vlog, dan Dokumentasi masuk ke bagian berita; jenis Program masuk ke bagian program;
// jenis Instagram dan Video hanya masuk ke galerinya masing-masing (tidak ikut tampil sebagai berita).
// Butuh supabase-config.js dimuat lebih dulu.
(async () => {
  const me = document.currentScript;
  const root = new URL('.', me ? me.src : location.href); // folder utama web (tempat file ini berada)
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tgl = (d, panjang) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: panjang ? 'long' : 'short', year: 'numeric' });
  const bacaUrl = (id) => `${new URL('berita/baca.html', root).href}?id=${encodeURIComponent(id)}`;

  // Gaya kecil untuk bagian yang dibuat di sini: catatan "belum ada" dan kotak pengganti kalau berita tanpa foto sampul
  const gaya = document.createElement('style');
  gaya.textContent = `
.empty-note { flex: 1 1 100%; padding: 1.2rem 0.4rem; color: var(--muted); }
.no-cover { aspect-ratio: 16 / 9; background: linear-gradient(135deg, var(--green-dark), var(--olive)); }
.news-list .news-card .no-cover { aspect-ratio: auto; min-height: 8.5rem; }
.ig-grid .empty-note, .video-grid .empty-note { grid-column: 1 / -1; }
.ig-tile .no-cover { position: absolute; inset: 0; aspect-ratio: auto; }
.gallery a { cursor: zoom-in; }
.lightbox { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 3.8rem 1rem 4.2rem; background: rgba(8, 20, 10, 0.9); }
.lightbox[hidden], .lightbox [hidden] { display: none; }
.lb-stage { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; max-width: 100%; margin: 0; }
.lb-stage img { display: block; width: auto; height: auto; max-width: min(calc(100vw - 2rem), 64rem); max-height: calc(100vh - 11rem); object-fit: contain; background: #000; border-radius: 0.5rem; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
.lb-count { color: #fff; font: 600 0.95rem 'Barlow', sans-serif; }
.lb-close, .lb-nav { position: absolute; display: grid; place-items: center; width: 2.8rem; height: 2.8rem; padding: 0; color: #fff; background-color: rgba(255, 255, 255, 0.16); border: 0; border-radius: 50%; cursor: pointer; transition: background-color 0.2s, color 0.2s; }
.lb-close svg, .lb-nav svg { width: 1.4rem; height: 1.4rem; }
.lb-close:hover, .lb-nav:hover { color: var(--ink); background-color: var(--gold); }
.lb-close:focus-visible, .lb-nav:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.lb-close { top: 1rem; right: 1rem; }
.lb-nav { top: 50%; margin-top: -1.4rem; }
.lb-prev { left: 1rem; }
.lb-next { right: 1rem; }
@media (min-width: 701px) { .lb-stage img { max-width: min(calc(100vw - 9rem), 64rem); } }
@media (max-width: 700px) { .lb-nav { top: auto; bottom: 1rem; margin-top: 0; } }
@media (prefers-reduced-motion: no-preference) { .lightbox { animation: lb-masuk 0.18s ease-out; } @keyframes lb-masuk { from { opacity: 0; } } }`;
  document.head.append(gaya);

  const siap = typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && !String(SUPABASE_URL).includes('ISI_');
  const api = (q) => {
    if (!siap) return Promise.reject(new Error('supabase-config.js tidak terbaca atau belum diisi'));
    return fetch(`${SUPABASE_URL}/rest/v1/berita?${q}`, { headers: { apikey: SUPABASE_ANON_KEY } }).then(async (r) => {
      if (r.ok) return r.json();
      throw new Error(`${r.status} ${await r.text().catch(() => '')}`.trim());
    });
  };

  const URUT = 'order=tanggal.desc,created_at.desc';
  const DAFTAR = 'select=id,tanggal,jenis,judul,ringkasan,cover&terbit=eq.true';
  // Berita = semua jenis KECUALI Program (bagian Program) dan Instagram/Video (galeri). Kalau nanti ada jenis galeri baru, tambahkan di sini.
  const BERITA = `${DAFTAR}&jenis=not.in.(Program,Instagram,Video)&${URUT}`;
  const PROGRAM = `${DAFTAR}&jenis=eq.Program&${URUT}`;
  const VIDEO = `select=id,tanggal,jenis,judul,youtube&terbit=eq.true&youtube=not.is.null&${URUT}`;
  const REELS = `select=id,tanggal,judul,ringkasan,cover,ig&terbit=eq.true&ig=not.is.null&${URUT}`;
  const idYt = (u) => ((String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})(?![\w-])/) || [])[1]);

  const kartuBerita = (r) => `<a class="news-card" href="${esc(bacaUrl(r.id))}">${r.cover ? `<img src="${esc(r.cover)}" alt="">` : '<div class="no-cover"></div>'}<div class="body"><p class="meta"><span class="kind">${esc(r.jenis)}</span><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal)}</time></p><h3>${esc(r.judul)}</h3><p class="desc">${esc(r.ringkasan)}</p></div></a>`;
  const kartuProgram = (r) => `<a class="program-card" href="${esc(bacaUrl(r.id))}"><div class="program-img">${r.cover ? `<img src="${esc(r.cover)}" alt="">` : ''}</div><div class="program-body"><h3>${esc(r.judul)}</h3><p>${esc(r.ringkasan)}</p><div class="program-foot"><p class="when"><i data-feather="calendar"></i><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal, true)}</time></p><span class="more">Selengkapnya<i data-feather="chevron-right"></i></span></div></div></a>`;

  const kartuVideo = (r) => {
    const id = idYt(r.youtube);
    if (!id) return '';
    return `<article class="video-card" data-yt="${esc(id)}"><div class="video-frame"><button class="video-play" type="button" aria-label="Putar video: ${esc(r.judul)}"><img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy"><i data-feather="play"></i></button></div><div class="body"><p class="meta"><span class="kind">${esc(r.jenis)}</span><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal)}</time></p><h3>${esc(r.judul)}</h3><a class="yt-link" href="https://www.youtube.com/watch?v=${esc(id)}" target="_blank" rel="noopener">Tonton di YouTube<i data-feather="external-link"></i></a></div></article>`;
  };
  const petakIg = (r) => /^https?:\/\//i.test(r.ig || '')
    ? `<a class="ig-tile" href="${esc(r.ig)}" target="_blank" rel="noopener" aria-label="Buka di Instagram: ${esc(r.judul)}">${r.cover ? `<img src="${esc(r.cover)}" alt="" loading="lazy">` : '<div class="no-cover"></div>'}<span class="ig-badge"><i data-feather="${/\/reel/i.test(r.ig) ? 'film' : 'image'}"></i></span><span class="ig-cap">${esc(r.judul)}</span></a>`
    : '';

  // Mengisi satu wadah: kartu kalau ada datanya; kalau kosong, catatan "belum ada"; kalau gagal, catatan "belum bisa dimuat".
  // (Sebab gagal yang sebenarnya ditulis di Console browser, F12.)
  const isi = (el, tugas, kartu, kosong) => tugas.then(
    (rows) => {
      // Baris yang tidak bisa dijadikan kartu (misalnya link YouTube yang salah) dilewati, supaya tidak muncul kotak kosong
      const hasil = rows.map(kartu).filter(Boolean);
      el.innerHTML = hasil.length ? hasil.join('') : `<p class="empty-note">${kosong}</p>`;
      return hasil.length;
    },
    (err) => {
      console.error('Gagal memuat dari Supabase:', err.message || err);
      el.innerHTML = '<p class="empty-note">Belum bisa dimuat sekarang. Coba muat ulang halaman ini sebentar lagi.</p>';
      return 0;
    },
  );

  const tugas = [];

  // Beranda: kartu berita dan daftar program
  const track = $('#news-track');
  if (track) {
    tugas.push(isi(track, api(`${BERITA}&limit=8`), kartuBerita, 'Belum ada berita. Nantikan liputan terbaru dari kru MAN1SKA TV.').then((n) => {
      const nav = $('.news-nav'); // tombol geser tidak berguna kalau tidak ada kartu
      if (nav) nav.style.display = n ? '' : 'none';
    }));
  }
  const daftarProgram = $('#program-list');
  if (daftarProgram) {
    tugas.push(isi(daftarProgram, api(`${PROGRAM}&limit=30`), kartuProgram, 'Belum ada program yang ditampilkan. Nantikan kegiatan dari kru MAN1SKA TV.'));
  }

  // Arsip berita (portal/semua-berita.html); Sorotan, filter, dan "Terbaru" disusun portal.js setelah ini selesai
  const arsip = $('#news-list');
  if (arsip) tugas.push(isi(arsip, api(`${BERITA}&limit=100`), kartuBerita, 'Belum ada berita.'));

  // Galeri video dan galeri Instagram: hanya dari unggahan yang kolom link-nya diisi
  const gv = $('#video-grid');
  if (gv) {
    tugas.push(isi(gv, api(`${VIDEO}&limit=60`), kartuVideo, 'Belum ada video. Nantikan tayangan terbaru dari kru MAN1SKA TV.'));
    gv.addEventListener('click', (e) => {
      const b = e.target.closest('.video-play');
      if (!b) return;
      const p = document.createElement('iframe');
      p.src = `https://www.youtube-nocookie.com/embed/${b.closest('.video-card').dataset.yt}?autoplay=1&rel=0`;
      p.title = b.getAttribute('aria-label') || 'Video YouTube';
      p.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      p.allowFullscreen = true;
      b.closest('.video-frame').replaceChildren(p);
    });
  }
  const gi = $('#ig-grid');
  if (gi) tugas.push(isi(gi, api(`${REELS}&limit=30`), petakIg, 'Belum ada postingan. Nantikan Reels terbaru dari @man1skatv.'));

  // Halaman baca (berita/baca.html)
  const box = $('#artikel');
  if (box) {
    const pesan = (judul, teks) => { box.innerHTML = `<header class="page-head"><h1>${judul}</h1><p class="lead">${teks}</p></header>`; };
    tugas.push((async () => {
      const id = new URLSearchParams(location.search).get('id');
      let r;
      try {
        // id yang bukan UUID langsung dianggap tidak ada (kalau dikirim ke database, hasilnya error 400)
        [r] = id && /^[0-9a-f-]{36}$/i.test(id) ? await api(`select=*&id=eq.${id}`) : [];
      } catch (err) {
        console.error('Gagal memuat dari Supabase:', err.message || err);
        pesan('Belum bisa dimuat', 'Ada gangguan saat mengambil isi berita. Coba muat ulang halaman ini sebentar lagi.');
        return;
      }
      if (!r) { pesan('Berita tidak ditemukan', 'Berita ini belum terbit atau sudah dihapus.'); return; }

      const program = r.jenis === 'Program';
      document.title = `${r.judul} - MAN1SKA TV`;
      if (program) { // tombol Kembali menuju bagian Program, bukan Berita
        const back = $('.back-btn');
        if (back) {
          back.href = new URL('index.html#program', root).href;
          const more = back.querySelector('.back-more');
          if (more) more.textContent = ' ke program';
        }
      }
      // Sampul dipisah dari header supaya kolom dokumentasi bisa disejajarkan dengan gambar sampul
      const sampul = r.cover ? `<div class="article-cover"><img class="cover" src="${esc(r.cover)}" alt="${esc(r.judul)}"></div>` : '';
      const tanggal = `<p class="when"><i data-feather="calendar"></i><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal, true)}</time></p>`;
      const kepala = program
        ? `<header class="page-head"><h1>${esc(r.judul)}</h1>${tanggal}<p class="lead">${esc(r.ringkasan)}</p></header>`
        : `<header class="page-head"><h1>${esc(r.judul)}</h1><div class="head-meta"><span class="kind">${esc(r.jenis)}</span>${tanggal}</div><p class="lead">${esc(r.ringkasan)}</p></header>`;
      const paras = (r.isi || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      const links = [['ig', 'instagram', 'Reels Instagram'], ['tiktok', 'video', 'Video TikTok'], ['youtube', 'youtube', 'YouTube']]
        .filter(([k]) => /^https?:\/\//i.test(r[k] || ''))
        .map(([k, i, l]) => `<a class="btn" href="${esc(r[k])}" target="_blank" rel="noopener"><i data-feather="${i}"></i>${l}</a>`).join('');
      // Susunan: judul di atas; di bawahnya [sampul + isi] di kiri dan [dokumentasi] di kanan (layar lebar; di layar
      // kecil dokumentasi turun ke bawah isi); lalu "Tonton juga" selebar halaman. Tanpa foto dokumentasi, tidak ada kolom kanan.
      const isiBox = paras ? `<section class="detail"><h2>${program ? 'Tentang program' : 'Isi berita'}</h2>${paras}</section>` : '';
      const dok = r.foto && r.foto.length
        ? `<aside class="article-side"><section class="detail"><h2>Dokumentasi</h2><div class="gallery">${r.foto.map((u, i) => `<figure><a href="${esc(u)}" title="Klik untuk memperbesar"><img src="${esc(u)}" alt="Dokumentasi ${esc(r.judul)}, foto ${i + 1}" loading="lazy"></a></figure>`).join('')}</div></section></aside>`
        : '';
      box.innerHTML = `<div class="article">${kepala}<div class="article-body${dok ? ' has-side' : ''}"><div class="article-main">${sampul}${isiBox}</div>${dok}</div></div>`
        + (links ? `<section class="detail"><h2>Tonton juga</h2><div class="watch">${links}</div></section>` : '');
      // Pop up foto dokumentasi: foto yang diklik muncul di tengah layar, tanpa pindah halaman.
      // Tutup dengan tombol X, klik area gelap, atau tombol Esc. Foto lain: tombol panah, tombol kiri/kanan, atau geser di HP.
      const fotos = r.foto || [];
      if (fotos.length) {
        let idx = 0, pemicu = null, sentuhX = null;
        const svg = (isi) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${isi}</svg>`;
        const lb = document.createElement('div');
        lb.className = 'lightbox';
        lb.hidden = true;
        lb.setAttribute('role', 'dialog');
        lb.setAttribute('aria-modal', 'true');
        lb.setAttribute('aria-label', 'Foto dokumentasi');
        lb.innerHTML = `<button type="button" class="lb-close" aria-label="Tutup">${svg('<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>')}</button>`
          + `<button type="button" class="lb-nav lb-prev" aria-label="Foto sebelumnya">${svg('<polyline points="15 18 9 12 15 6"></polyline>')}</button>`
          + '<figure class="lb-stage"><img alt=""><figcaption class="lb-count"></figcaption></figure>'
          + `<button type="button" class="lb-nav lb-next" aria-label="Foto berikutnya">${svg('<polyline points="9 18 15 12 9 6"></polyline>')}</button>`;
        document.body.append(lb);

        const gambar = lb.querySelector('img');
        const hitung = lb.querySelector('.lb-count');
        const tombol = [...lb.querySelectorAll('button')];
        const [btnTutup, btnPrev, btnNext] = tombol;
        if (fotos.length < 2) { btnPrev.hidden = true; btnNext.hidden = true; hitung.hidden = true; } // satu foto saja: tanpa panah

        const tampil = (i) => {
          idx = (i + fotos.length) % fotos.length;
          gambar.src = fotos[idx];
          gambar.alt = `Dokumentasi ${r.judul}, foto ${idx + 1}`;
          hitung.textContent = `${idx + 1} / ${fotos.length}`;
        };
        const buka = (i, dari) => {
          pemicu = dari;
          tampil(i);
          lb.hidden = false;
          document.documentElement.style.overflow = 'hidden'; // halaman di belakang tidak ikut tergulir
          btnTutup.focus();
        };
        const tutup = () => {
          lb.hidden = true;
          gambar.removeAttribute('src');
          document.documentElement.style.overflow = '';
          if (pemicu) pemicu.focus();
        };

        btnTutup.addEventListener('click', tutup);
        btnPrev.addEventListener('click', () => tampil(idx - 1));
        btnNext.addEventListener('click', () => tampil(idx + 1));
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-stage')) tutup(); });
        lb.addEventListener('touchstart', (e) => { sentuhX = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener('touchend', (e) => {
          if (sentuhX === null || fotos.length < 2) return;
          const dx = e.changedTouches[0].clientX - sentuhX;
          sentuhX = null;
          if (Math.abs(dx) > 50) tampil(idx + (dx < 0 ? 1 : -1));
        });
        document.addEventListener('keydown', (e) => {
          if (lb.hidden) return;
          if (e.key === 'Escape') tutup();
          else if (e.key === 'ArrowLeft' && fotos.length > 1) tampil(idx - 1);
          else if (e.key === 'ArrowRight' && fotos.length > 1) tampil(idx + 1);
          else if (e.key === 'Tab') { // fokus tetap berputar di dalam pop up
            const aktif = tombol.filter((b) => !b.hidden);
            const awal = aktif[0], akhir = aktif[aktif.length - 1];
            if (e.shiftKey && document.activeElement === awal) { e.preventDefault(); akhir.focus(); }
            else if (!e.shiftKey && document.activeElement === akhir) { e.preventDefault(); awal.focus(); }
          }
        });

        box.querySelectorAll('.gallery a').forEach((a, i) => {
          a.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) return; // Ctrl/Cmd + klik tetap boleh membuka foto di tab baru
            e.preventDefault();
            buka(i, a);
          });
        });
      }
    })());
  }

  await Promise.all(tugas);
  if (window.feather) feather.replace();
  // Tanda untuk skrip lain (portal.js) bahwa kartu sudah selesai dibuat
  document.documentElement.dataset.beritaReady = '1';
  document.dispatchEvent(new Event('berita:ready'));
})();
