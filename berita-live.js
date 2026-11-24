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
.ig-tile .no-cover { position: absolute; inset: 0; aspect-ratio: auto; }`;
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
      const sampul = r.cover ? `<img class="cover" src="${esc(r.cover)}" alt="${esc(r.judul)}">` : '';
      const kepala = program
        ? `<header class="page-head"><h1>${esc(r.judul)}</h1><p class="when"><i data-feather="calendar"></i><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal, true)}</time></p><p class="lead">${esc(r.ringkasan)}</p>${sampul}</header>`
        : `<header class="page-head"><p class="meta"><span class="kind">${esc(r.jenis)}</span><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal)}</time></p><h1>${esc(r.judul)}</h1><p class="lead">${esc(r.ringkasan)}</p>${sampul}</header>`;
      const paras = (r.isi || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      const links = [['ig', 'instagram', 'Reels Instagram'], ['tiktok', 'video', 'Video TikTok'], ['youtube', 'youtube', 'YouTube']]
        .filter(([k]) => /^https?:\/\//i.test(r[k] || ''))
        .map(([k, i, l]) => `<a class="btn" href="${esc(r[k])}" target="_blank" rel="noopener"><i data-feather="${i}"></i>${l}</a>`).join('');
      // Susunan: [judul + isi] di kiri, [dokumentasi] di kanan (layar lebar; di layar kecil turun ke bawah isi),
      // lalu "Tonton juga" selebar halaman. Tanpa foto dokumentasi, isi tampil seperti biasa tanpa kolom kanan.
      const isiBox = paras ? `<section class="detail"><h2>${program ? 'Tentang program' : 'Isi berita'}</h2>${paras}</section>` : '';
      const dok = r.foto && r.foto.length
        ? `<aside class="article-side"><section class="detail"><h2>Dokumentasi</h2><div class="gallery">${r.foto.map((u, i) => `<figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Dokumentasi ${esc(r.judul)}, foto ${i + 1}" loading="lazy"></a></figure>`).join('')}</div></section></aside>`
        : '';
      box.innerHTML = `<div class="article${dok ? ' has-side' : ''}"><div class="article-main">${kepala}${isiBox}</div>${dok}</div>`
        + (links ? `<section class="detail"><h2>Tonton juga</h2><div class="watch">${links}</div></section>` : '');
    })());
  }

  await Promise.all(tugas);
  if (window.feather) feather.replace();
  // Tanda untuk skrip lain (portal.js) bahwa kartu sudah selesai dibuat
  document.documentElement.dataset.beritaReady = '1';
  document.dispatchEvent(new Event('berita:ready'));
})();
