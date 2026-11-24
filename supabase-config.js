// ===== Sambungan ke Supabase =====
// Letakkan file ini di folder utama web (sejajar index.html). Dipakai oleh panel operator (admin/)
// dan oleh halaman berita.
//
// URL proyek dan kunci "publishable" ini memang boleh tampil di web publik: keamanan data dijaga oleh
// aturan (policy) di database, bukan oleh kerahasiaan kunci ini.
// JANGAN PERNAH menaruh kunci "secret" (sb_secret_...) di sini atau di file web mana pun.
const SUPABASE_URL = 'https://qkxzsfqlnwpdsikqphua.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_kAvZWdUK4rSOK65yFBpEug_rwAcBwZz';
