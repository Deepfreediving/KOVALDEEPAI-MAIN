-- =======================
-- KovalAI — 03 Onboarding & Legal (v2)
-- Legal docs, acceptances (storage buckets handled separately)
-- Idempotent: safe to re-run
-- =======================

-- NOTE: Storage bucket 'user-docs' should be created manually via:
-- 1. Supabase Dashboard -> Storage, or 
-- 2. Application code using supabase.storage.createBucket()
-- This avoids permission issues during migrations.

-- ---------- Enums ----------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_doc_type') then
    create type user_doc_type as enum ('certification','waiver','medical','other');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type review_status as enum ('pending','approved','rejected');
  end if;
end $$;

-- ---------- legal_document (versioned text) ----------
create table if not exists legal_document (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  version int not null default 1,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, version)
);

-- Anyone (anon + authenticated) can read to show pre-login
alter table legal_document enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='legal_document' and policyname='legal_docs_read_all'
  ) then
    create policy legal_docs_read_all on legal_document
      for select to anon, authenticated
      using (true);
  end if;
end $$;

-- updated_at helper (shared)
create or replace function set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_legal_document_updated_at on legal_document;
create trigger trg_legal_document_updated_at
before update on legal_document
for each row execute function set_updated_at();

-- Ensure only 1 active version per slug
create or replace function legal_on_change_enforce_single_active()
returns trigger language plpgsql as $$
begin
  if new.is_active then
    update legal_document
       set is_active = false, updated_at = now()
     where slug = new.slug and id <> new.id and is_active = true;
  end if;
  return new;
end $$;

drop trigger if exists trg_legal_document_single_active on legal_document;
create trigger trg_legal_document_single_active
after insert or update on legal_document
for each row execute function legal_on_change_enforce_single_active();

-- Helpful view: current active doc per slug
create or replace view legal_document_current as
select distinct on (slug)
  id, slug, version, title, body, is_active, created_at, updated_at
from legal_document
where is_active = true
order by slug, version desc, created_at desc;

-- ---------- user_acceptance ----------
create table if not exists user_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_document_id uuid not null references legal_document(id) on delete cascade,
  version_accepted int not null,
  accepted boolean not null default true,
  signature text,                 -- typed name or signature hash
  signature_path text,            -- path in 'user-docs' if storing drawn signature image
  ip inet,
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique (user_id, legal_document_id, version_accepted)
);

alter table user_acceptance enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='user_acceptance' and policyname='ua_read_own') then
    create policy ua_read_own  on user_acceptance for select using (auth.uid() = user_id);
    create policy ua_write_own on user_acceptance for insert with check (auth.uid() = user_id);
    create policy ua_update_own on user_acceptance for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy ua_delete_own on user_acceptance for delete using (auth.uid() = user_id);
  end if;
end $$;

-- RPC to record acceptance for the current active version of a slug
create or replace function accept_legal(
  p_slug text,
  p_signature text,
  p_signature_path text default null,
  p_ip inet default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_doc record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select id, version into v_doc
  from legal_document_current
  where slug = p_slug;

  if not found then
    raise exception 'No active legal document for slug %', p_slug;
  end if;

  insert into user_acceptance(user_id, legal_document_id, version_accepted,
                              signature, signature_path, ip, user_agent)
  values (v_uid, v_doc.id, v_doc.version, p_signature, p_signature_path, p_ip, p_user_agent)
  on conflict (user_id, legal_document_id, version_accepted) do
  update set accepted = true,
             signature = excluded.signature,
             signature_path = excluded.signature_path,
             accepted_at = now();
end $$;

-- ---------- user_document (uploaded certs/waivers etc.) ----------
create table if not exists user_document (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type user_doc_type not null default 'certification',
  bucket text not null default 'user-docs',
  path text not null,                              -- "<uid>/<uuid>.<ext>"
  original_filename text,
  mime_type text,
  bytes bigint,
  review_status review_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,     -- {"agency":"AIDA","level":"3"}
  created_at timestamptz not null default now(),
  -- enforce path prefix by user_id if you want hard guarantees
  constraint user_document_path_prefix check (position(user_id::text || '/' in path) = 1)
);

create index if not exists user_document_user_idx on user_document (user_id, created_at desc);

alter table user_document enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='user_document' and policyname='udoc_read_own') then
    create policy udoc_read_own  on user_document for select using (auth.uid() = user_id);
    create policy udoc_write_own on user_document for insert with check (auth.uid() = user_id);
    create policy udoc_update_own on user_document for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    create policy udoc_delete_own on user_document for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ---------- Seed legal docs (v1) ----------
insert into legal_document (slug, version, title, body, is_active)
values (
  'liability_release',
  1,
  'KOVAL DEEP AI – RELEASE OF LIABILITY, ASSUMPTION OF RISK, AND DISCLAIMER AGREEMENT',
  $LD1$
PLEASE READ CAREFULLY. THIS IS A LEGALLY BINDING AGREEMENT. BY ACCESSING OR USING THE KOVAL DEEP AI CHATBOT ("THE AI SERVICE"), YOU AGREE TO BE LEGALLY BOUND BY THE TERMS BELOW.

This Release of Liability and Disclaimer Agreement ("Agreement") is entered into by and between you ("User", "Participant", or "You") and Koval Deep AI, Daniel Koval, Freediving Instructors International LLC and Deep Freediving Instruction LLC (collectively, "Providers") as a condition of accessing and using the AI-based freediving chatbot and related services (the “Service”).

1. NO MEDICAL OR SAFETY GUARANTEE
The information provided by Koval Deep AI is not a substitute for formal freediving education, medical advice, or supervision. This chatbot provides generalized training guidance for educational purposes only. Freediving is a high-risk activity that can result in serious injury or death. You understand and agree that:
- The AI does not evaluate individual health conditions or emergency preparedness.
- You must not rely on the AI in place of certified freediving instruction or in-water supervision.
- Use of the chatbot’s advice without proper physical readiness, certified training, or supervision may result in serious bodily injury, blackout, barotrauma, or death.

2. ASSUMPTION OF RISK
You voluntarily assume all risks associated with freediving training, preparation, or simulation, including but not limited to:
- Blackout (loss of consciousness)
- Shallow or deep-water blackout
- Lung squeeze or barotrauma
- Ear or sinus injury
- Death due to hypoxia, entrapment, or drowning
You acknowledge that no AI system, chatbot, or online resource can mitigate or remove these risks. Your decision to practice techniques suggested by Koval Deep AI is at your sole and exclusive risk.

3. WAIVER AND RELEASE OF LIABILITY
To the fullest extent permitted by law, you hereby release, waive, and discharge Koval Deep AI, Daniel Koval, Deep Freediving Instruction LLC, and all officers, agents, employees, affiliates, contractors, AI platforms (including OpenAI), successors, and assigns from any and all liability, claims, demands, or causes of action whatsoever arising out of or related to your access to or use of the chatbot, including but not limited to:
- Any injury, death, disability, or damages you sustain while practicing freediving
- Misapplication or misinterpretation of AI suggestions
- Failure to follow safe diving standards
- Any decision you make based on chatbot content
This release applies whether or not your injury or loss is caused by the negligence (active or passive) of any of the Released Parties.

4. NO WARRANTIES
The Providers make no representations or warranties, express or implied, about the safety, effectiveness, or accuracy of the information provided. The Service is provided “as is” without warranty of any kind.

5. INDEMNIFICATION
You agree to indemnify, defend, and hold harmless the Released Parties from any claims, damages, losses, or expenses (including attorney’s fees) arising out of or related to your use of the Service; any bodily injury, death, or property damage resulting from your freediving training or activities; or your violation of this Agreement or of any applicable laws, safety protocols, or freediving standards.

6. AGE AND LEGAL CAPACITY
You confirm that you are at least 18 years of age (or legal age in your jurisdiction) and legally capable of entering into this binding release. If under 18, do not use this Service without parental consent and legal supervision.

7. GOVERNING LAW AND JURISDICTION
This Agreement is governed by the laws of the State of Hawaii. Exclusive jurisdiction and venue lie in the courts of the State of Hawaii.

8. ENTIRE AGREEMENT
This document constitutes the entire agreement regarding your use of Koval Deep AI and supersedes all prior agreements.

9. ACKNOWLEDGMENT
By using the Koval Deep AI chatbot, you affirm that you have read and understood this Release of Liability and voluntarily agree to be bound by its terms.
$LD1$,
  true
)
on conflict (slug, version) do update
set title = excluded.title, body = excluded.body, is_active = excluded.is_active;

insert into legal_document (slug, version, title, body, is_active)
values (
  'medical_release',
  1,
  'Koval Deep AI – Medical and Liability Release',
  $LD2$
By checking the box below, you confirm the following:

You do NOT have any history of:
- Ear or sinus surgery
- Chronic sinus congestion
- Asthma, chronic bronchitis, or any lung condition
- Fainting, seizures, blackouts, or neurological conditions
- Diabetes (Type 1 or 2)
- Heart disease, arrhythmia, or high blood pressure
- Panic attacks or claustrophobia
- Blood disorders
- Recent major surgery or hospitalization
- Pregnancy (if applicable)

You understand that:
- Freediving carries serious risk, including blackout, barotrauma, lung squeeze, and death.
- Koval Deep AI provides general training guidance only and is not a substitute for professional medical or dive supervision.
- You are solely responsible for how you apply the information provided by the AI.
- You will never train in water without a certified buddy or instructor present.
- If any discomfort, dizziness, or symptoms arise, you will immediately stop training and seek medical evaluation.
$LD2$,
  true
)
on conflict (slug, version) do update
set title = excluded.title, body = excluded.body, is_active = excluded.is_active;
