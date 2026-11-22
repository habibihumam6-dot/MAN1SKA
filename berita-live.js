// ===== Berita dari panel operator (Supabase) =====
// Di index.html: berita yang terbit muncul paling depan di barisan kartu.
// Di berita/baca.html: menampilkan isi satu berita. Butuh supabase-config.js dimuat lebih dulu.
(async () => {
  if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('ISI_')) return;
  const api = (q) => fetch(`${SUPABASE_URL}/rest/v1/berita?${q}`, { headers: { apikey: SUPABASE_ANON_KEY } })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tgl = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const box = document.querySelector('#artikel');
  const dir = box ? '' : 'berita/';

  const track = document.querySelector('#news-track');
  if (track) {
    try {
      const rows = await api('select=id,tanggal,jenis,judul,ringkasan,cover&terbit=eq.true&order=tanggal.desc,created_at.desc&limit=8');
      const cards = rows.map((r) => {
        const t = document.createElement('template');
        t.innerHTML = `<a class="news-card" href="${dir}baca.html?id=${esc(r.id)}">${r.cover ? `<img src="${esc(r.cover)}" alt="">` : ''}<div class="body"><p class="meta"><span class="kind">${esc(r.jenis)}</span><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal)}</time></p><h3>${esc(r.judul)}</h3><p class="desc">${esc(r.ringkasan)}</p></div></a>`;
        return t.content.firstElementChild;
      });
      track.prepend(...cards);
    } catch (e) { /* tidak ada koneksi: kartu bawaan di HTML tetap tampil */ }
  }

  if (box) {
    try {
      const id = new URLSearchParams(location.search).get('id');
      const [r] = id ? await api(`select=*&id=eq.${encodeURIComponent(id)}`) : [];
      if (!r) throw new Error('tidak ada');
      document.title = `${r.judul} - MAN1SKA TV`;
      const paras = (r.isi || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
      const links = [['ig', 'instagram', 'Reels Instagram'], ['tiktok', 'video', 'Video TikTok'], ['youtube', 'youtube', 'YouTube']]
        .filter(([k]) => /^https?:\/\//i.test(r[k] || ''))
        .map(([k, i, l]) => `<a class="btn" href="${esc(r[k])}" target="_blank" rel="noopener"><i data-feather="${i}"></i>${l}</a>`).join('');
      box.innerHTML = `<header class="page-head"><p class="meta"><span class="kind">${esc(r.jenis)}</span><time datetime="${esc(r.tanggal)}">${tgl(r.tanggal)}</time></p><h1>${esc(r.judul)}</h1><p class="lead">${esc(r.ringkasan)}</p>${r.cover ? `<img class="cover" src="${esc(r.cover)}" alt="${esc(r.judul)}">` : ''}</header>`
        + (paras ? `<section class="detail"><h2>Isi berita</h2>${paras}</section>` : '')
        + (r.foto && r.foto.length ? `<section class="detail"><h2>Dokumentasi</h2><div class="gallery">${r.foto.map((u, i) => `<figure><a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(u)}" alt="Dokumentasi ${esc(r.judul)}, foto ${i + 1}" loading="lazy"></a></figure>`).join('')}</div></section>` : '')
        + (links ? `<section class="detail"><h2>Tonton juga</h2><div class="watch">${links}</div></section>` : '');
    } catch (e) {
      box.innerHTML = '<header class="page-head"><h1>Berita tidak ditemukan</h1><p class="lead">Berita ini belum terbit atau sudah dihapus.</p></header>';
    }
  }
  if (window.feather) feather.replace();
})();