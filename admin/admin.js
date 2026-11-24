
// ===== Panel operator: masuk, buat konten (Berita, Program, Instagram, YouTube), terbit/tarik/ubah/hapus =====
(() => {
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const say = (el, text, ok) => { el.textContent = text; el.className = `msg ${ok ? 'ok' : 'err'}`; };
const tgl = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const idYt = (u) => ((String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})(?![\w-])/) || [])[1]);
const loginForm = $('#login'), panel = $('#panel'), form = $('#post'), list = $('#list'), logoutBtn = $('#logout');
const typesEl = $('#types'), tabsEl = $('#tabs'), msg = $('#post-msg'), listMsg = $('#list-msg');
const coverPrev = $('#cover-prev'), ytPrev = $('#yt-prev');

// Jaring pengaman: formulir masuk tidak pernah dikirim lewat alamat halaman (kalau tidak, email dan kata sandi
// ikut tertulis di URL, riwayat browser, dan log server) walaupun ada yang salah di bawah ini.
loginForm.addEventListener('submit', (e) => e.preventDefault());

// Pemeriksaan awal: kalau Supabase belum siap, sebabnya ditulis di halaman, bukan gagal diam-diam.
const problem =
  typeof supabase === 'undefined'
    ? 'Pustaka Supabase tidak termuat. Periksa koneksi internet, atau matikan pemblokir iklan untuk halaman ini.'
  : typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined'
    ? 'File supabase-config.js tidak terbaca atau nama isinya salah. File itu harus ada di folder utama web (sejajar index.html) dan berisi SUPABASE_URL dan SUPABASE_ANON_KEY.'
  : !/^https:\/\//.test(SUPABASE_URL) || String(SUPABASE_ANON_KEY).length < 20
    ? 'supabase-config.js belum diisi dengan benar: SUPABASE_URL harus diawali https:// dan SUPABASE_ANON_KEY harus berisi kunci dari Supabase.'
  : '';
if (problem) {
  // Halaman tetap bersih saat dibuka; sebabnya ditulis di Console (F12) dan tampil di halaman saat tombol Masuk diklik.
  console.error(problem);
  loginForm.addEventListener('submit', () => say($('#login-msg'), problem, false));
  throw new Error(problem);
}
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- Ikon (Feather, disisipkan langsung supaya panel tidak butuh pustaka ikon) -----
const IC = {
  'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
  youtube: '<path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  link: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
};
const ico = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
logoutBtn.innerHTML = `${ico('log-out')}Keluar`;

// ----- Jenis konten: masing-masing punya kolom dan teks sendiri -----
// "jenis" di database: Berita/Vlog/Dokumentasi (berita), Program, Instagram, Video (YouTube).
const TYPES = {
  berita: { label: 'Berita', sub: 'Tulisan & foto', icon: 'file-text', title: 'Judul berita', date: 'Tanggal berita', isi: 'Isi berita', cover: 'Foto sampul' },
  program: { label: 'Program', sub: 'Acara & kegiatan', icon: 'calendar', title: 'Nama program', date: 'Tanggal acara', isi: 'Penjelasan program', cover: 'Foto sampul' },
  instagram: { label: 'Instagram', sub: 'Reels & postingan', icon: 'instagram', title: 'Keterangan singkat (tampil di petak)', date: 'Tanggal posting', cover: 'Foto sampul petak (disarankan, Instagram tidak punya sampul otomatis)' },
  youtube: { label: 'YouTube', sub: 'Video', icon: 'youtube', title: 'Judul video', date: 'Tanggal tayang' },
};
const typeOf = (r) => (r.jenis === 'Program' ? 'program' : r.jenis === 'Instagram' ? 'instagram' : r.jenis === 'Video' ? 'youtube' : 'berita');
const isTulisan = (t) => t === 'berita' || t === 'program';

let rows = [], editing = null, shown = null, type = 'berita', filter = 'semua';
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const prev = (img, src) => { img.hidden = !src; if (src) img.src = src; };

typesEl.innerHTML = Object.entries(TYPES).map(([k, c]) => `<button type="button" data-t="${k}" aria-pressed="false">${ico(c.icon)}<b>${c.label}</b><small>${c.sub}</small></button>`).join('');

// Menampilkan hanya kolom yang dipakai jenis terpilih. Kolom yang disembunyikan juga dimatikan (disabled),
// supaya kolom wajib yang tidak terlihat tidak menghalangi tombol Simpan.
function setType(t) {
  type = t;
  const c = TYPES[t];
  typesEl.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.t === t)); b.disabled = !!editing && b.dataset.t !== t; });
  form.querySelectorAll('[data-for]').forEach((el) => {
    const on = el.dataset.for.split(' ').includes(t);
    el.hidden = !on;
    el.querySelectorAll('input, select, textarea').forEach((i) => { i.disabled = !on; });
  });
  $('#l-judul').textContent = c.title;
  $('#l-tgl').textContent = c.date;
  $('#l-isi').textContent = c.isi || '';
  $('#l-cover').textContent = c.cover || '';
  $('#form-title').textContent = editing ? `Ubah ${c.label}` : `Buat ${c.label} baru`;
  $('#save').textContent = editing ? 'Simpan perubahan' : `Simpan ${c.label}`;
}

function reset(t = type) {
  editing = null;
  form.reset();
  form.tanggal.value = today();
  form.terbit.checked = true;
  $('#links').open = false;
  prev(coverPrev, ''); prev(ytPrev, '');
  $('#cancel').hidden = true;
  say(msg, '', true);
  setType(t);
}

// Foto dikecilkan dulu (maks 1600px, JPEG) supaya hemat kuota dan cepat dimuat
async function shrink(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
}
async function upload(file) {
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('berita').upload(path, await shrink(file), { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('berita').getPublicUrl(path).data.publicUrl;
}

// ----- Daftar konten -----
const thumb = (r) => r.cover || (idYt(r.youtube) && typeOf(r) === 'youtube' ? `https://i.ytimg.com/vi/${idYt(r.youtube)}/mqdefault.jpg` : '');
const viewHref = (r) => {
  const t = typeOf(r);
  if (t === 'instagram') return r.ig;
  if (t === 'youtube') return r.youtube;
  return r.terbit ? `../berita/baca.html?id=${encodeURIComponent(r.id)}` : '';
};
function item(r) {
  const t = typeOf(r), img = thumb(r), href = viewHref(r);
  const kind = TYPES[t].label + (t === 'berita' && r.jenis !== 'Berita' ? ` (${esc(r.jenis)})` : '');
  return `<li data-id="${esc(r.id)}"><div class="th">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ico(TYPES[t].icon)}</div>`
    + `<div class="tx"><b>${esc(r.judul)}</b><small>${kind} · ${tgl(r.tanggal)} · <em class="${r.terbit ? 'on' : 'off'}">${r.terbit ? 'Terbit' : 'Draf'}</em></small></div>`
    + `<div class="acts">${href ? `<a href="${esc(href)}" target="_blank" rel="noopener" title="Buka" aria-label="Buka ${esc(r.judul)}">${ico('link')}</a>` : ''}`
    + `<button type="button" data-a="toggle" title="${r.terbit ? 'Tarik dari web' : 'Terbitkan'}" aria-label="${r.terbit ? 'Tarik dari web' : 'Terbitkan'}: ${esc(r.judul)}">${ico(r.terbit ? 'eye-off' : 'eye')}</button>`
    + `<button type="button" data-a="edit" title="Ubah" aria-label="Ubah ${esc(r.judul)}">${ico('edit')}</button>`
    + `<button type="button" data-a="del" class="danger" title="Hapus" aria-label="Hapus ${esc(r.judul)}">${ico('trash')}</button></div></li>`;
}
function render() {
  const n = (k) => (k === 'semua' ? rows.length : rows.filter((r) => typeOf(r) === k).length);
  tabsEl.innerHTML = [['semua', 'Semua'], ...Object.entries(TYPES).map(([k, c]) => [k, c.label])]
    .map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${filter === k}">${l}<b>${n(k)}</b></button>`).join('');
  const show = rows.filter((r) => filter === 'semua' || typeOf(r) === filter);
  list.innerHTML = show.length ? show.map(item).join('') : '<li class="empty">Belum ada konten di sini. Pilih jenisnya di formulir, lalu simpan.</li>';
}
async function load() {
  const { data, error } = await sb.from('berita').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false });
  if (error) { list.innerHTML = `<li class="empty">Gagal memuat daftar: ${esc(error.message)}</li>`; return; }
  rows = data;
  render();
}

// ----- Masuk / keluar -----
function show(user) {
  const on = !!user;
  if (on === shown) return; // abaikan pemberitahuan ulang saat tab dibuka kembali
  shown = on;
  loginForm.hidden = on; panel.hidden = !on; logoutBtn.hidden = !on;
  if (on) { reset('berita'); load(); }
}
sb.auth.getSession().then(({ data }) => show(data.session && data.session.user));
sb.auth.onAuthStateChange((_e, session) => show(session && session.user));

// Pesan yang menjelaskan penyebab gagal masuk (bukan selalu "salah sandi")
function loginError(err) {
  const m = String(err.message || err);
  if (/invalid login/i.test(m)) return 'Email atau kata sandi salah.';
  if (/not confirmed/i.test(m)) return 'Email ini belum dikonfirmasi di Supabase. Buat ulang penggunanya lewat Authentication > Users > Add user dengan "Auto Confirm User" dicentang.';
  if (/fetch|network/i.test(m)) return 'Tidak bisa menghubungi Supabase. Periksa koneksi internet dan SUPABASE_URL di supabase-config.js.';
  return `Gagal masuk: ${m}`;
}
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn');
  btn.disabled = true;
  const f = new FormData(loginForm);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
  say($('#login-msg'), error ? loginError(error) : '', false);
  btn.disabled = false;
});
logoutBtn.addEventListener('click', () => sb.auth.signOut());

// ----- Interaksi formulir -----
typesEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !editing) setType(b.dataset.t); });
tabsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { filter = b.dataset.f; render(); } });
$('#cancel').addEventListener('click', () => reset());
form.cover.addEventListener('change', () => {
  const f = form.cover.files[0];
  prev(coverPrev, f ? URL.createObjectURL(f) : (editing && editing.cover) || '');
});
form.youtube.addEventListener('input', () => {
  const id = idYt(form.youtube.value);
  prev(ytPrev, id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
});

function startEdit(row) {
  const t = typeOf(row);
  editing = row;
  form.reset();
  setType(t);
  ['tanggal', 'judul', 'ringkasan', 'isi'].forEach((k) => { if (!form[k].disabled) form[k].value = row[k] || ''; });
  if (t === 'berita') form.jenis.value = row.jenis;
  if (isTulisan(t)) {
    form.x_ig.value = row.ig || ''; form.x_tiktok.value = row.tiktok || ''; form.x_youtube.value = row.youtube || '';
    $('#links').open = !!(row.ig || row.tiktok || row.youtube);
  }
  if (t === 'instagram') form.ig.value = row.ig || '';
  if (t === 'youtube') { form.youtube.value = row.youtube || ''; form.youtube.dispatchEvent(new Event('input')); }
  form.terbit.checked = row.terbit;
  prev(coverPrev, row.cover || '');
  $('#cancel').hidden = false;
  say(msg, isTulisan(t)
    ? 'Foto lama tetap dipakai kecuali kamu memilih foto baru. Foto dokumentasi baru ditambahkan di belakang yang lama.'
    : 'Foto lama tetap dipakai kecuali kamu memilih foto baru.', true);
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

list.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-a]');
  if (!b) return;
  const row = rows.find((r) => r.id === b.closest('li').dataset.id);
  if (!row) return;
  if (b.dataset.a === 'edit') { startEdit(row); return; }
  let error, done;
  if (b.dataset.a === 'del') {
    if (!confirm(`Hapus "${row.judul}"? Ini tidak bisa dibatalkan.`)) return;
    ({ error } = await sb.from('berita').delete().eq('id', row.id));
    if (editing && editing.id === row.id) reset();
    done = 'Konten dihapus.';
  } else {
    ({ error } = await sb.from('berita').update({ terbit: !row.terbit }).eq('id', row.id));
    done = row.terbit ? 'Konten ditarik dari web (jadi draf).' : 'Konten sudah terbit.';
  }
  say(listMsg, error ? `Gagal: ${error.message}` : done, !error);
  load();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#save');
  btn.disabled = true;
  say(msg, 'Menyimpan... mengunggah foto bisa memakan waktu, jangan tutup halaman.', true);
  try {
    const v = (k) => form[k].value.trim();
    const row = { tanggal: form.tanggal.value, judul: v('judul'), terbit: form.terbit.checked };
    if (isTulisan(type)) {
      Object.assign(row, {
        jenis: type === 'program' ? 'Program' : form.jenis.value, ringkasan: v('ringkasan'), isi: v('isi'),
        ig: v('x_ig') || null, tiktok: v('x_tiktok') || null, youtube: v('x_youtube') || null,
      });
    } else if (type === 'instagram') {
      Object.assign(row, { jenis: 'Instagram', ig: v('ig') });
    } else {
      if (!idYt(v('youtube'))) throw new Error('Link YouTube belum dikenali. Salin dari bilah alamat atau tombol Bagikan di YouTube.');
      Object.assign(row, { jenis: 'Video', youtube: v('youtube') });
    }
    if (!isTulisan(type)) Object.assign(row, editing ? {} : { ringkasan: '', isi: '' });
    if (!form.cover.disabled && form.cover.files[0]) row.cover = await upload(form.cover.files[0]);
    const extra = [];
    if (!form.foto.disabled) for (const f of form.foto.files) extra.push(await upload(f));
    let error;
    if (editing) {
      if (extra.length) row.foto = [...(editing.foto || []), ...extra];
      ({ error } = await sb.from('berita').update(row).eq('id', editing.id));
    } else {
      row.foto = extra;
      ({ error } = await sb.from('berita').insert(row));
    }
    if (error) throw error;
    const label = TYPES[type].label, published = row.terbit;
    reset();
    say(msg, published ? `${label} tersimpan dan sudah terbit di web utama.` : `${label} tersimpan sebagai draf (belum tampil di web utama).`, true);
    load();
  } catch (err) {
    const m = String(err.message || err);
    say(msg, /check constraint/i.test(m)
      ? 'Database belum menerima jenis konten ini. Buka Supabase > SQL Editor, tempel seluruh isi file superbase-setup.sql, klik Run (cukup sekali), lalu simpan lagi.'
      : `Gagal menyimpan: ${m}`, false);
  }
  btn.disabled = false;
});
})();
