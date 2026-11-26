// ===== Tampilan portal berita (portal/semua-berita.html) =====
// Kartu berita dibuat oleh berita-live.js dari berita yang diunggah lewat panel operator. Setelah kartunya jadi,
// berkas ini menjadikan kartu paling atas (paling baru) sebagai "Sorotan", membuat tombol filter jenis,
// dan mengisi daftar "Terbaru" di samping.
const newsList = document.querySelector('#news-list');
if (newsList) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const text = (el, sel) => { const n = el.querySelector(sel); return n ? n.textContent.trim() : ''; };
  const info = (c) => {
    const img = c.querySelector('img');
    return { href: c.getAttribute('href'), src: img ? img.getAttribute('src') : '', kind: text(c, '.kind'), date: text(c, 'time'), title: text(c, 'h3'), desc: text(c, '.desc') };
  };

  const build = () => {
    const cards = [...newsList.querySelectorAll('.news-card')];

    // Sorotan = kartu pertama (kalau berita itu tidak punya foto sampul, teksnya tampil selebar kotak)
    const feature = document.querySelector('#feature');
    if (feature && cards.length) {
      const d = info(cards[0]);
      feature.innerHTML = `
        <div class="feature-text">
          <span class="chip">Sorotan</span>
          <p class="meta"><span class="kind">${esc(d.kind)}</span><time>${esc(d.date)}</time></p>
          <h3 class="feature-title">${esc(d.title)}</h3>
          <p class="feature-desc">${esc(d.desc)}</p>
          <a class="btn with-icon" href="${esc(d.href)}">Baca selengkapnya<i data-feather="arrow-right"></i></a>
        </div>
        ${d.src ? `<a class="feature-img" href="${esc(d.href)}" tabindex="-1" aria-hidden="true"><img src="${esc(d.src)}" alt=""></a>` : ''}`;
      if (!d.src) feature.style.gridTemplateColumns = '1fr';
      cards[0].remove();
    }

    // Judul "Arsip Berita" hanya tampil kalau memang ada kartu di bawah Sorotan
    const rest = cards.slice(1);
    const heading = document.querySelector('.portal-main h2');
    if (heading) heading.hidden = !rest.length;

    // Filter jenis (muncul kalau ada lebih dari satu jenis)
    const kinds = [...new Set(rest.map((c) => text(c, '.kind')).filter(Boolean))];
    const chips = document.querySelector('#chips');
    if (chips && kinds.length > 1) {
      chips.innerHTML = ['Semua', ...kinds].map((k, i) => `<button type="button" aria-pressed="${i === 0}" data-kind="${i ? esc(k) : ''}">${esc(k)}</button>`).join('');
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        rest.forEach((c) => { c.hidden = !!b.dataset.kind && text(c, '.kind') !== b.dataset.kind; });
      });
    }

    // Sidebar "Terbaru": berita teratas (maksimal MAX_TERBARU) (kotaknya disembunyikan kalau belum ada berita)
    const rank = document.querySelector('#rank');
    if (rank) {
      const MAX_TERBARU = 5; // jumlah berita di daftar "Terbaru" (ubah angka ini kalau mau lebih/kurang)
      rank.innerHTML = cards.slice(0, MAX_TERBARU).map((c) => {
        const d = info(c);
        const thumb = d.src ? `<img src="${esc(d.src)}" alt="" loading="lazy">` : '';
        return `<li><a href="${esc(d.href)}"><span class="th">${thumb}</span><span class="t">${esc(d.title)}</span><span class="d">${esc(d.date)}</span></a></li>`;
      }).join('');
      const box = rank.closest('.side-box');
      if (box) box.hidden = !cards.length;
    }
    if (window.feather) feather.replace(); // pasang ikon pada bagian yang baru dibuat
  };

  // Tunggu berita-live.js selesai membuat kartu (kalau sudah selesai lebih dulu, langsung kerjakan)
  if (document.documentElement.dataset.beritaReady) build();
  else document.addEventListener('berita:ready', build, { once: true });
}
