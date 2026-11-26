// ===== Ikon Feather =====
if (window.feather) feather.replace();

// ===== Pencarian =====
// search.js (satu folder dengan script.js) menambah ikon cari di navbar beserta panel pencariannya.
// Dimuat dari sini supaya otomatis aktif di semua halaman yang memakai script.js, tanpa menyalin tag ke tiap halaman.
if (document.currentScript) {
  const searchScript = document.createElement('script');
  searchScript.src = new URL('search.js', document.currentScript.src).href;
  document.head.append(searchScript);
}

// ===== Ganti dengan email tujuan pesan dari form kontak =====
const CONTACT_EMAIL = 'emailkamu@gmail.com';
// Alamat ini juga dipakai untuk link email di bagian Kontak (elemen yang punya atribut data-email),
// jadi cukup diganti di satu tempat.
document.querySelectorAll('[data-email]').forEach((el) => {
  el.href = `mailto:${CONTACT_EMAIL}`;
  el.textContent = CONTACT_EMAIL;
});

// ===== Menu hamburger (tampilan HP) =====
const menu = document.querySelector('#menu');
const burger = document.querySelector('#hamburger-menu');

function setMenu(open) {
  menu.classList.toggle('active', open);
  burger.setAttribute('aria-expanded', String(open));
}

// (dicek dulu: navbar halaman detail program tidak punya menu/hamburger)
if (menu && burger) {
  burger.addEventListener('click', () => setMenu(!menu.classList.contains('active')));

  // Tutup menu setelah link diklik
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));

  // Tutup menu kalau klik di luar
  document.addEventListener('click', (e) => {
    if (!burger.contains(e.target) && !menu.contains(e.target)) setMenu(false);
  });
}

// ===== Formulir kontak: kirim langsung ke Google Form (isi, kirim, selesai) =====
// Tampilan formulir tetap di web ini; yang berubah hanya tujuan kirimnya: jawaban masuk ke Google Form
// (dan otomatis ke Google Sheets), tanpa membuka aplikasi email pengunjung.
//
// Cara pasang (sekali saja):
//  1. Buat Google Form dengan 4 pertanyaan: Nama, Email, No. HP, Pesan (jenis "Jawaban singkat",
//     khusus Pesan pakai "Paragraf"). Jangan aktifkan "Batasi 1 respons" dan jangan batasi hanya untuk
//     pengguna organisasi, supaya orang tanpa login Google tetap bisa mengirim. Pertanyaan No. HP jangan diwajibkan.
//  2. Di Google Form klik titik tiga (⋮) > "Dapatkan link isi otomatis". Isi SEMUA pertanyaan dengan apa saja
//     (isinya tidak dipakai; kolom Email harus berisi tanda @), klik "Dapatkan link", lalu "Salin link".
//  3. Tempel link itu di bawah ini. Selesai.
// Dibiarkan kosong (atau linknya salah): formulir membuka aplikasi email seperti sebelumnya.
const GOOGLE_FORM_LINK = 'https://docs.google.com/forms/d/e/1FAIpQLSfwDXy60IW5ciETBfoTytM5foOQ3OUrGDftnfggycXYQzKSGA/viewform?usp=pp_url&entry.1066057732=Humam+Jabar+Shiddiq+Habibi&entry.792014027=habibihumam6@gmail.com&entry.1747333614=Hello';

// Mengubah link isi otomatis menjadi alamat kirim (formResponse) + daftar kode kolom (entry.xxxx).
// Kolom dikenali dari urutannya di link (sama dengan urutan pertanyaan di form) dan bentuk isinya:
//   Nama, Email (isinya ada tanda @), [No. HP], Pesan. Kalau No. HP dikosongkan, kolomnya tidak ikut disimpan.
// Cara lama juga masih jalan: isi kolom dengan kata Nama / Email / HP / Pesan.
function parseGoogleForm(link) {
  try {
    const u = new URL(link);
    const action = `${u.origin}${u.pathname.replace(/\/(viewform|formResponse).*$/, '')}/formResponse`;
    const entries = [...u.searchParams].filter(([key]) => key.startsWith('entry.'));

    // 1) Cara kata kunci
    const map = {};
    entries.forEach(([key, val]) => {
      const v = val.toLowerCase();
      if (v.includes('nama')) map.name = key;
      else if (v.includes('mail')) map.email = key;
      else if (/hp|telp|nomor/.test(v)) map.phone = key;
      else if (v.includes('pesan')) map.message = key;
    });
    if (map.name && map.email && map.message) return { action, map };

    // 2) Cara urutan: Email dikenali dari tanda @, Nama di depannya, Pesan di belakangnya
    const at = entries.findIndex(([, val]) => val.includes('@'));
    const after = at < 0 ? [] : entries.slice(at + 1);
    if (at < 1 || after.length < 1) return null;
    return {
      action,
      map: {
        name: entries[0][0],
        email: entries[at][0],
        phone: after.length > 1 ? after[0][0] : null,
        message: after[after.length - 1][0],
      },
    };
  } catch (err) {
    return null;
  }
}
const googleForm = GOOGLE_FORM_LINK ? parseGoogleForm(GOOGLE_FORM_LINK) : null;
if (GOOGLE_FORM_LINK && !googleForm) {
  console.warn('GOOGLE_FORM_LINK belum benar: pakai link dari "Dapatkan link isi otomatis" (bukan link biasa), isi semua pertanyaannya, dan pastikan kolom Email berisi tanda @.');
}

// ===== Form kontak =====
// Google Form terpasang: pesan dikirim langsung. Belum: membuka aplikasi email dengan pesan yang sudah terisi.
// (dicek dulu: halaman detail program tidak punya form ini, dan tanpa cek script akan berhenti di sini)
const contactForm = document.querySelector('#contact-form');
if (contactForm) {
  const status = contactForm.querySelector('#form-status');
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const say = (text, ok) => {
    if (!status) return;
    status.textContent = text;
    status.className = `form-status ${ok ? 'ok' : 'err'}`;
    status.hidden = false;
  };

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const f = new FormData(form);

    if (googleForm) {
      // Kolom jebakan untuk robot: manusia tidak melihatnya, jadi kalau terisi pesan dibuang diam-diam
      if (f.get('website')) { form.reset(); say('Terima kasih! Pesanmu sudah terkirim.', true); return; }
      const data = new URLSearchParams();
      data.set(googleForm.map.name, f.get('name'));
      data.set(googleForm.map.email, f.get('email'));
      if (googleForm.map.phone) data.set(googleForm.map.phone, f.get('phone') || '');
      data.set(googleForm.map.message, f.get('message'));
      submitBtn.disabled = true;
      if (status) status.hidden = true;
      try {
        // Google tidak mengizinkan membaca balasannya dari web lain (no-cors), jadi "terkirim" berarti
        // permintaan sampai ke Google tanpa gangguan jaringan. Tes sekali setelah memasang, lalu cek tab Respons.
        await fetch(googleForm.action, { method: 'POST', mode: 'no-cors', body: data });
        form.reset();
        say('Terima kasih! Pesanmu sudah terkirim.', true);
      } catch (err) {
        say(`Pesan belum terkirim. Periksa sambungan internet lalu coba lagi, atau kirim langsung ke ${CONTACT_EMAIL}.`, false);
      } finally {
        submitBtn.disabled = false;
      }
      return;
    }

    const phone = f.get('phone') ? ` (${f.get('phone')})` : '';
    const body = `${f.get('message')}\n\nDari: ${f.get('name')}${phone}\nEmail: ${f.get('email')}`;
    const subject = `Pesan dari ${f.get('name')}`;
    location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    form.reset();
    say(`Aplikasi emailmu akan terbuka dengan pesan yang sudah terisi. Kalau tidak terbuka, kirim langsung ke ${CONTACT_EMAIL}.`, true);
  });
}

// ===== Berita: tombol geser untuk kartu =====
// Kartunya dibuat belakangan oleh berita-live.js, jadi lebar kartu dicek saat tombol diklik (bukan saat halaman dibuka).
const newsTrack = document.querySelector('#news-track');
if (newsTrack) {
  const step = () => {
    const card = newsTrack.querySelector('.news-card');
    return (card ? card.getBoundingClientRect().width : 0) + 20;
  };
  const prev = document.querySelector('#news-prev');
  const next = document.querySelector('#news-next');
  if (prev) prev.addEventListener('click', () => newsTrack.scrollBy({ left: -step() }));
  if (next) next.addEventListener('click', () => newsTrack.scrollBy({ left: step() }));
}

// ===== Program: tampil maksimal 3 kartu, sisanya digulir di dalam kotak =====
// Tinggi kotak dihitung dari tinggi 3 kartu pertama, jadi tetap pas di layar mana pun.
const programList = document.querySelector('#program-list');
if (programList) {
  const MAX_VISIBLE = 3; // ganti angka ini kalau mau menampilkan lebih/kurang dari 3 kartu
  const fitProgram = () => {
    const cards = [...programList.children];
    const hasMore = cards.length > MAX_VISIBLE;
    programList.closest('section').classList.toggle('has-more', hasMore);
    if (!hasMore) { programList.style.maxHeight = ''; return; }
    const cs = getComputedStyle(programList);
    const gap = parseFloat(cs.rowGap) || 0;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const shown = cards.slice(0, MAX_VISIBLE).reduce((sum, c) => sum + c.getBoundingClientRect().height, 0);
    programList.style.maxHeight = `${shown + gap * (MAX_VISIBLE - 1) + pad}px`;
  };
  fitProgram();
  // Hitung ulang kalau ukuran kartu berubah (layar diputar, font selesai dimuat, dll.)
  const watcher = new ResizeObserver(fitProgram);
  const watchCards = () => programList.querySelectorAll('.program-card').forEach((card) => watcher.observe(card));
  watchCards();
  // Kartu program dibuat belakangan oleh berita-live.js (dari data panel operator): hitung ulang saat kartunya muncul
  new MutationObserver(() => { watchCards(); fitProgram(); }).observe(programList, { childList: true });
}


// ===== Galeri video (berita/galeri-video.html): sampul diambil otomatis dari link YouTube =====
// Cukup isi link videonya di atribut data-video. Klik gambar = video diputar di tempat.
document.querySelectorAll('.video-card[data-video]').forEach((card) => {
  const btn = card.querySelector('.video-play');
  const img = btn.querySelector('img');
  const ytLink = card.querySelector('.yt-link');
  // Mengenali link watch?v=, youtu.be/, shorts/, dan embed/. ID YouTube selalu 11 karakter.
  const m = (card.dataset.video || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})(?![\w-])/);
  if (!m) { // link belum diisi atau belum benar: kartu tampil sebagai tempat kosong
    card.classList.add('is-empty');
    btn.disabled = true;
    img.remove();
    if (ytLink) ytLink.hidden = true;
    return;
  }
  const id = m[1];
  img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${id}`;
  btn.addEventListener('click', () => {
    const player = document.createElement('iframe');
    player.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    player.title = btn.getAttribute('aria-label') || 'Video YouTube';
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true;
    card.querySelector('.video-frame').replaceChildren(player);
  });
});

// ===== Tombol kembali ke atas =====
// Dibuat di sini supaya otomatis ada di semua halaman tanpa menyalin HTML-nya.
// Muncul setelah halaman digulir melewati sebagian hero (atau 400px di halaman tanpa hero).
const toTop = document.createElement('button');
toTop.type = 'button';
toTop.className = 'to-top';
toTop.setAttribute('aria-label', 'Kembali ke atas');
toTop.title = 'Kembali ke atas';
toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
document.body.append(toTop);

const heroEl = document.querySelector('#home');
let topTicking = false;
const updateToTop = () => {
  topTicking = false;
  const limit = heroEl ? heroEl.offsetHeight * 0.9 : 400; // ubah 0.9 kalau mau muncul lebih cepat/lambat
  toTop.classList.toggle('show', window.scrollY > limit);
};
window.addEventListener('scroll', () => {
  if (!topTicking) { topTicking = true; requestAnimationFrame(updateToTop); }
}, { passive: true });
updateToTop();
// Tanpa "behavior": ikut aturan scroll-behavior di CSS (halus, dan langsung kalau pengguna mematikan animasi)
toTop.addEventListener('click', () => window.scrollTo({ top: 0 }));

// ===== Menu navbar menyala sesuai bagian yang sedang dibaca =====
// Bagian yang melewati garis tipis di sekitar tengah layar dianggap "sedang dibaca".
const navLinks = [...document.querySelectorAll('#menu a[href^="#"]')];
if (navLinks.length && 'IntersectionObserver' in window) {
  const linkById = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.removeAttribute('aria-current'));
      const link = linkById.get(en.target.id);
      if (link) link.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  linkById.forEach((link, id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
}

// ===== Halaman berita selengkapnya: tombol filter jenis berita =====
// Dibuat otomatis dari tulisan jenis (Berita / Vlog / Dokumentasi) di tiap kartu, tanpa perlu menambah HTML.
const newsGrid = document.querySelector('.news-grid');
if (newsGrid) {
  const kindOf = (card) => ((card.querySelector('.kind') || {}).textContent || '').trim();
  const cards = [...newsGrid.querySelectorAll('.news-card')];
  const kinds = [...new Set(cards.map(kindOf).filter(Boolean))];
  if (kinds.length > 1) { // kalau cuma satu jenis, filter tidak ada gunanya
    const bar = document.createElement('div');
    bar.className = 'news-filter';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filter jenis berita');
    ['Semua', ...kinds].forEach((label, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-pressed', String(i === 0));
      b.addEventListener('click', () => {
        bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        cards.forEach((c) => { c.hidden = i !== 0 && kindOf(c) !== label; });
      });
      bar.append(b);
    });
    newsGrid.before(bar);
  }
}

// ===== Animasi masuk (pop) =====
// Kartu berita, kartu program, baris divisi, dan logo Tentang kami muncul sekali saat pertama terlihat di layar.
// Kartu berita dan program dibuat belakangan oleh berita-live.js, jadi wadahnya dipantau supaya kartu baru ikut dipasang.
// Dilewati kalau pengguna mematikan animasi di perangkatnya. Ubah 0.08 (detik) untuk jeda antar kartu.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const popSel = '#news-track .news-card, #program-list .program-card, .crew .role-row, .about-img img';
  const armed = new WeakSet();
  const popIO = new IntersectionObserver((entries) => {
    let n = 0;
    entries.filter((en) => en.isIntersecting).forEach((en) => {
      const el = en.target;
      popIO.unobserve(el);
      el.style.setProperty('--d', `${Math.min(n++, 5) * 0.08}s`);
      el.classList.add('in');
      // Setelah selesai, kelasnya dilepas supaya gaya hover biasa kembali bekerja
      setTimeout(() => { el.classList.remove('pop', 'in'); el.style.removeProperty('--d'); }, 1300);
    });
  }, { threshold: 0.15 });
  const armPop = () => document.querySelectorAll(popSel).forEach((el) => {
    if (armed.has(el)) return;
    armed.add(el);
    el.classList.add('pop');
    popIO.observe(el);
  });
  armPop();
  ['#news-track', '#program-list'].forEach((s) => {
    const box = document.querySelector(s);
    if (box) new MutationObserver(armPop).observe(box, { childList: true });
  });
}

// ===== Animasi masuk: slogan dan batang merah judul =====
// Slogan "Berita ... Cerita" tersapu masuk, dan batang merah di judul tiap bagian memanjang, sekali saat terlihat.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const onceIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    onceIO.unobserve(en.target);
  }), { threshold: 0.6 });
  const slogan = document.querySelector('.slogan');
  if (slogan) { slogan.classList.add('sweep'); onceIO.observe(slogan); }
  document.querySelectorAll('section h2').forEach((h) => { h.classList.add('grow'); onceIO.observe(h); });
}

// ===== Seret dengan mouse: kartu berita (kiri-kanan) dan kartu program (atas-bawah) =====
// Hanya untuk mouse; di layar sentuh sudah ada geser bawaan. Klik biasa tetap membuka kartu,
// hanya klik yang berakhir sebagai seretan (lebih dari 6px) yang dibatalkan. Gulir roda mouse tidak diubah.
const enableDragScroll = (el, axis) => {
  if (!el) return;
  const horiz = axis === 'x';
  let startPos = 0, startScroll = 0, down = false, moved = false;
  const canScroll = () => (horiz ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1);
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !canScroll()) return;
    // Menekan batang gulir bawaan dibiarkan bekerja sendiri
    const r = el.getBoundingClientRect();
    if (horiz ? e.clientY - r.top > el.clientHeight : e.clientX - r.left > el.clientWidth) return;
    down = true;
    moved = false;
    startPos = horiz ? e.clientX : e.clientY;
    startScroll = horiz ? el.scrollLeft : el.scrollTop;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const d = (horiz ? e.clientX : e.clientY) - startPos;
    if (!moved) {
      if (Math.abs(d) < 6) return;
      moved = true;
      el.classList.add('dragging');
      getSelection().removeAllRanges();
    }
    if (horiz) el.scrollLeft = startScroll - d;
    else el.scrollTop = startScroll - d;
  });
  const end = () => {
    if (!down) return;
    down = false;
    el.classList.remove('dragging'); // snap aktif lagi, kartu berhenti pas di posisinya
    if (moved) setTimeout(() => { moved = false; }, 0);
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  el.addEventListener('dragstart', (e) => e.preventDefault()); // cegah seret bawaan browser untuk gambar dan link
};
enableDragScroll(document.querySelector('#news-track'), 'x');
enableDragScroll(document.querySelector('#program-list'), 'y');
