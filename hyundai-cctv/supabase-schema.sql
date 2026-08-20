begin;

create extension if not exists pgcrypto;

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  phone text not null check (char_length(phone) between 9 and 20),
  region text check (region is null or char_length(region) <= 100),
  place_type text check (place_type is null or place_type in ('매장', '사무실', '공장', '주택', '기타')),
  camera_count text check (camera_count is null or char_length(camera_count) <= 30),
  message text check (message is null or char_length(message) <= 1000),
  privacy_agreed boolean not null default false check (privacy_agreed = true),
  status text not null default '신규문의'
    check (status in ('신규문의', '연락완료', '상담중', '견적발송', '계약완료', '보류', '취소')),
  created_at timestamptz not null default now()
);

comment on table public.consultations is '현대CCTV 상담 신청';
comment on column public.consultations.status is '신규문의/연락완료/상담중/견적발송/계약완료/보류/취소';

alter table public.consultations enable row level security;

revoke all on table public.consultations from anon;
grant insert (name, phone, region, place_type, camera_count, message, privacy_agreed)
  on table public.consultations to anon;

drop policy if exists "anon can insert consultations" on public.consultations;
create policy "anon can insert consultations"
  on public.consultations
  for insert
  to anon
  with check (
    privacy_agreed = true
    and char_length(name) between 1 and 50
    and char_length(phone) between 9 and 20
    and (region is null or char_length(region) <= 100)
    and (place_type is null or place_type in ('매장', '사무실', '공장', '주택', '기타'))
    and (camera_count is null or char_length(camera_count) <= 30)
    and (message is null or char_length(message) <= 1000)
  );

commit;
