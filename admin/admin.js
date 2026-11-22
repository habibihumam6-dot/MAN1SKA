// ===== Panel operator: masuk, tulis berita, unggah foto, terbit/tarik/ubah/hapus =====
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const say = (el, text, ok) => { el.textContent = text; el.className = `msg ${ok ? 'ok' : 'err'}`; };
const loginForm = $('#login'), panel = $('#panel'), form = $('#post'), list = $('#list'), logoutBtn = $('#logout');

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
  // Halaman tetap bersih saat dibuka; sebabnya hanya ditulis di Console (F12), dan baru tampil di halaman
  // kalau tombol Masuk diklik padahal sambungan belum siap (supaya tidak gagal diam-diam).
  console.error(problem);
  loginForm.addEventListener('submit', () => say($('#login-msg'), problem, false));
  throw new Error(problem);
}
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let rows = [], editing = null, shown = null;

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

function reset() {
  editing = null;
  form.reset();
  form.tanggal.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  form.terbit.checked = true;
  $('#form-title').textContent = 'Tulis berita baru';
  $('#cancel').hidden = true;
  say($('#post-msg'), '', true);
}

async function load() {
  const { data, error } = await sb.from('berita').select('*').order('tanggal', { ascending: false }).order('created_at', { ascending: false });
  if (error) { list.innerHTML = '<li>Gagal memuat daftar. Coba muat ulang halaman.</li>'; return; }
  rows = data;
  list.innerHTML = rows.length
    ? rows.map((r) => `<li data-id="${esc(r.id)}"><div><b>${esc(r.judul)}</b><small>${esc(r.jenis)} · ${esc(r.tanggal)} · ${r.terbit ? 'Terbit' : 'Draf'}</small></div><span><button data-a="toggle">${r.terbit ? 'Tarik' : 'Terbitkan'}</button><button data-a="edit">Ubah</button><button data-a="del" class="danger">Hapus</button></span></li>`).join('')
    : '<li>Belum ada berita.</li>';
}

function show(user) {
  const on = !!user;
  if (on === shown) return; // abaikan pemberitahuan ulang saat tab dibuka kembali
  shown = on;
  loginForm.hidden = on; panel.hidden = !on; logoutBtn.hidden = !on;
  if (on) { reset(); load(); }
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
  const f = new FormData(loginForm);
  const { error } = await sb.auth.signInWithPassword({ email: f.get('email'), password: f.get('password') });
  say($('#login-msg'), error ? loginError(error) : '', false);
});
logoutBtn.addEventListener('click', () => sb.auth.signOut());
$('#cancel').addEventListener('click', reset);

list.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const row = rows.find((r) => r.id === b.closest('li').dataset.id);
  if (b.dataset.a === 'edit') {
    editing = row;
    ['jenis', 'tanggal', 'judul', 'ringkasan', 'isi', 'ig', 'tiktok', 'youtube'].forEach((k) => { form[k].value = row[k] || ''; });
    form.terbit.checked = row.terbit;
    $('#form-title').textContent = 'Ubah berita';
    $('#cancel').hidden = false;
    say($('#post-msg'), 'Foto lama tetap dipakai kecuali kamu memilih foto baru. Foto dokumentasi baru ditambahkan di belakang yang lama.', true);
    form.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  if (b.dataset.a === 'del') {
    if (!confirm(`Hapus "${row.judul}"? Ini tidak bisa dibatalkan.`)) return;
    await sb.from('berita').delete().eq('id', row.id);
  } else {
    await sb.from('berita').update({ terbit: !row.terbit }).eq('id', row.id);
  }
  load();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#save');
  btn.disabled = true;
  say($('#post-msg'), 'Menyimpan... mengunggah foto bisa memakan waktu, jangan tutup halaman.', true);
  try {
    const row = {
      jenis: form.jenis.value, tanggal: form.tanggal.value, judul: form.judul.value.trim(),
      ringkasan: form.ringkasan.value.trim(), isi: form.isi.value.trim(),
      ig: form.ig.value.trim() || null, tiktok: form.tiktok.value.trim() || null, youtube: form.youtube.value.trim() || null,
      terbit: form.terbit.checked,
    };
    if (form.cover.files[0]) row.cover = await upload(form.cover.files[0]);
    const extra = [];
    for (const f of form.foto.files) extra.push(await upload(f));
    let error;
    if (editing) {
      if (extra.length) row.foto = [...(editing.foto || []), ...extra];
      ({ error } = await sb.from('berita').update(row).eq('id', editing.id));
    } else {
      row.foto = extra;
      ({ error } = await sb.from('berita').insert(row));
    }
    if (error) throw error;
    const published = row.terbit;
    reset();
    say($('#post-msg'), published ? 'Tersimpan dan sudah terbit di web utama.' : 'Tersimpan sebagai draf (belum tampil di web utama).', true);
    load();
  } catch (err) {
    say($('#post-msg'), `Gagal menyimpan: ${err.message || err}`, false);
  }
  btn.disabled = false;
});