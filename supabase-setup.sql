-- DIGICAM ARCHIVE V3
-- Jalankan seluruh SQL ini di Supabase > SQL Editor > New query > Run.
-- Bucket dibuat public agar pengunjung dapat melihat/mengunduh foto.
-- Upload/edit/delete tetap membutuhkan sesi login dan dilindungi RLS.

create extension if not exists pgcrypto;

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 32),
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  album_id uuid references public.albums(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.albums enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Public can read albums" on public.albums;
create policy "Public can read albums" on public.albums
for select to anon, authenticated using (true);

drop policy if exists "Admins can insert albums" on public.albums;
create policy "Admins can insert albums" on public.albums
for insert to authenticated with check (true);

drop policy if exists "Admins can update albums" on public.albums;
create policy "Admins can update albums" on public.albums
for update to authenticated using (true) with check (true);

drop policy if exists "Admins can delete albums" on public.albums;
create policy "Admins can delete albums" on public.albums
for delete to authenticated using (true);

drop policy if exists "Public can read photos" on public.photos;
create policy "Public can read photos" on public.photos
for select to anon, authenticated using (true);

drop policy if exists "Admins can insert photos" on public.photos;
create policy "Admins can insert photos" on public.photos
for insert to authenticated with check (true);

drop policy if exists "Admins can update photos" on public.photos;
create policy "Admins can update photos" on public.photos
for update to authenticated using (true) with check (true);

drop policy if exists "Admins can delete photos" on public.photos;
create policy "Admins can delete photos" on public.photos
for delete to authenticated using (true);

-- Buat bucket public bernama digicam-photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('digicam-photos', 'digicam-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public can view digicam photos" on storage.objects;
create policy "Public can view digicam photos" on storage.objects
for select to anon, authenticated using (bucket_id = 'digicam-photos');

drop policy if exists "Admins can upload digicam photos" on storage.objects;
create policy "Admins can upload digicam photos" on storage.objects
for insert to authenticated with check (bucket_id = 'digicam-photos');

drop policy if exists "Admins can update digicam photos" on storage.objects;
create policy "Admins can update digicam photos" on storage.objects
for update to authenticated using (bucket_id = 'digicam-photos') with check (bucket_id = 'digicam-photos');

drop policy if exists "Admins can delete digicam photos" on storage.objects;
create policy "Admins can delete digicam photos" on storage.objects
for delete to authenticated using (bucket_id = 'digicam-photos');

insert into public.albums (name) values ('Unsorted')
on conflict (name) do nothing;
