-- =============================================================
-- 갓생커플 · Supabase 스키마
-- profiles / routines / check_ins + RLS 정책 + 파트너 연결 RPC
-- Supabase SQL Editor에서 그대로 실행 가능
-- =============================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid() 사용

-- -------------------------------------------------------------
-- 1. profiles
--    auth.users 1:1 확장. partner_id로 1:1 커플 관계를 표현한다.
-- -------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nickname     text not null,
  avatar_url   text,
  partner_id   uuid references public.profiles(id) on delete set null,
  invite_code  text unique not null default upper(substr(md5(random()::text), 1, 6)),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 로그인 사용자는 자신의 프로필과 파트너의 프로필만 조회 가능
create policy "profiles_select_self_or_partner"
  on public.profiles for select
  using (
    id = auth.uid()
    or id = public.get_my_partner_id()
  );

-- 자신의 프로필만 수정 가능
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid());

-- 신규 가입 시 자신의 프로필만 생성 가능 (보통은 트리거가 대신 처리)
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- 파트너 id 조회용 security definer 함수.
-- RLS 정책 안에서 partner_id를 얻으려고 profiles를 직접 서브쿼리하면,
-- 그 서브쿼리도 같은 정책의 적용을 받아 정책 평가가 자기 자신을 다시
-- 트리거하는 무한 재귀(Postgres 42P17)에 빠진다. security definer로
-- 감싸면 이 함수 내부의 조회는 RLS를 우회해서 재귀 없이 끝난다.
create or replace function public.get_my_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select partner_id from public.profiles where id = auth.uid()
$$;


-- -------------------------------------------------------------
-- 2. auth.users 가입 시 profiles 행 자동 생성 트리거
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', '갓생러'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- -------------------------------------------------------------
-- 3. 파트너 연결 RPC
--    초대코드로 상대를 찾아 양쪽 partner_id를 서로 연결한다.
--    security definer로 profiles RLS를 우회해 원자적으로 처리.
-- -------------------------------------------------------------
create or replace function public.connect_partner(target_code text)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  target public.profiles;
begin
  if me is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into target from public.profiles where invite_code = upper(target_code);

  if target.id is null then
    raise exception '초대코드를 찾을 수 없습니다';
  end if;

  if target.id = me then
    raise exception '자기 자신을 연결할 수 없습니다';
  end if;

  update public.profiles set partner_id = target.id where id = me;
  update public.profiles set partner_id = me where id = target.id;

  return (select p from public.profiles p where id = me);
end;
$$;


-- -------------------------------------------------------------
-- 4. routines
--    created_by 기준으로 "같은 커플"만 접근 가능하도록 RLS 구성
-- -------------------------------------------------------------
create table public.routines (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  verification_type text not null check (verification_type in ('photo', 'text', 'check')),
  success_rule      text not null default 'both' check (success_rule in ('both', 'either')),
  start_date        date not null default current_date,
  end_date          date,
  created_by        uuid not null references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now()
);

alter table public.routines enable row level security;

-- 같은 커플(본인 또는 파트너가 만든 루틴)만 조회
create policy "routines_select_couple"
  on public.routines for select
  using (
    created_by = auth.uid()
    or created_by = public.get_my_partner_id()
  );

create policy "routines_insert_self"
  on public.routines for insert
  with check (created_by = auth.uid());

create policy "routines_update_couple"
  on public.routines for update
  using (
    created_by = auth.uid()
    or created_by = public.get_my_partner_id()
  );

create policy "routines_delete_owner"
  on public.routines for delete
  using (created_by = auth.uid());


-- -------------------------------------------------------------
-- 5. check_ins
--    하루 1회 인증. 같은 커플 구성원끼리만 서로 열람 가능.
-- -------------------------------------------------------------
create table public.check_ins (
  id         uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  date       date not null default current_date,
  proof_url  text,
  memo       text,
  created_at timestamptz not null default now(),
  unique (routine_id, user_id, date)
);

alter table public.check_ins enable row level security;

create policy "check_ins_select_couple"
  on public.check_ins for select
  using (
    user_id = auth.uid()
    or user_id = public.get_my_partner_id()
  );

-- 본인 명의로만, 그리고 자신이 속한 커플의 루틴에만 인증 가능
create policy "check_ins_insert_self"
  on public.check_ins for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.routines r
      where r.id = routine_id
        and (
          r.created_by = auth.uid()
          or r.created_by = public.get_my_partner_id()
        )
    )
  );

create policy "check_ins_update_self"
  on public.check_ins for update
  using (user_id = auth.uid());

create policy "check_ins_delete_self"
  on public.check_ins for delete
  using (user_id = auth.uid());


-- -------------------------------------------------------------
-- 6. 인덱스
-- -------------------------------------------------------------
create index idx_routines_created_by on public.routines(created_by);
create index idx_check_ins_routine_id on public.check_ins(routine_id);
create index idx_check_ins_user_date on public.check_ins(user_id, date);


-- -------------------------------------------------------------
-- 7. Storage — 인증샷 버킷
--    버킷 자체(이름 proofs, private)는 대시보드에서 생성해야 한다
--    (anon/authenticated 권한으로는 버킷 생성 불가).
--    파일 경로 규칙: {user_id}/{routine_id}/{date}.{ext}
-- -------------------------------------------------------------
create policy "proofs_select_couple"
  on storage.objects for select
  using (
    bucket_id = 'proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = public.get_my_partner_id()::text
    )
  );

create policy "proofs_insert_self"
  on storage.objects for insert
  with check (
    bucket_id = 'proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- -------------------------------------------------------------
-- 8. Realtime — 파트너의 체크인을 실시간으로 반영하기 위해
--    check_ins 테이블을 supabase_realtime publication에 추가한다.
--    구독 시에도 RLS(check_ins_select_couple)가 그대로 적용되므로
--    다른 커플의 체크인은 애초에 이벤트가 전달되지 않는다.
-- -------------------------------------------------------------
alter publication supabase_realtime add table public.check_ins;
