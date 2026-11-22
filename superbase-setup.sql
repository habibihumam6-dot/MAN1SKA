-- ============================================================
-- Jalankan SEKALI di Supabase: menu SQL Editor > New query > tempel semua > Run.
-- Membuat tabel berita, tempat foto, dan aturan keamanannya.
-- ============================================================
create table if not exists public.berita (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tanggal date not null default current_date,
  jenis text not null default 'Berita' check (jenis in ('Berita', 'Vlog', 'Dokumentasi')),
  judul text not null,
  ringkasan text not null default '',
  isi text not null default '',
  cover text,
  foto text[] not null default '{}',
  ig text,
  tiktok text,
  youtube text,
  terbit boolean not null default false
);

alter table public.berita enable row level security;

-- Pengunjung web utama: hanya boleh MEMBACA berita yang sudah terbit
create policy "publik membaca yang terbit" on public.berita for select using (terbit = true);
-- Operator (sudah login): boleh membaca semua, menambah, mengubah, menghapus
create policy "operator membaca semua" on public.berita for select to authenticated using (true);
create policy "operator menambah" on public.berita for insert to authenticated with check (true);
create policy "operator mengubah" on public.berita for update to authenticated using (true) with check (true);
create policy "operator menghapus" on public.berita for delete to authenticated using (true);

-- Tempat foto (publik dibaca, hanya operator yang boleh mengunggah)
insert into storage.buckets (id, name, public) values ('berita', 'berita', true) on conflict (id) do nothing;
create policy "publik melihat foto" on storage.objects for select using (bucket_id = 'berita');
create policy "operator mengunggah foto" on storage.objects for insert to authenticated with check (bucket_id = 'berita');
create policy "operator menghapus foto" on storage.objects for delete to authenticated using (bucket_id = 'berita');