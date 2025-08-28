drop policy "dive_log_delete_own_anonymous" on "public"."dive_log";

drop policy "dive_log_read_own_anonymous" on "public"."dive_log";

drop policy "dive_log_update_own_anonymous" on "public"."dive_log";

drop policy "dive_log_write_own_anonymous" on "public"."dive_log";

drop policy "Admin only access to dive_logs" on "public"."dive_logs";

drop policy "Users can delete their own dive log images" on "public"."dive_log_image";

drop policy "Users can insert their own dive log images" on "public"."dive_log_image";

drop policy "Users can update their own dive log images" on "public"."dive_log_image";

drop policy "Users can view their own dive log images" on "public"."dive_log_image";

drop view if exists "public"."v_dive_logs_with_images";

drop index if exists "public"."dive_log_anonymous_user_idx";

drop index if exists "public"."idx_dive_log_image_composite_final";

drop index if exists "public"."idx_dive_log_image_created_perf";

drop index if exists "public"."idx_dive_log_image_dive_log_final";

drop index if exists "public"."idx_dive_log_image_perf";

drop index if exists "public"."idx_dive_log_image_user_final";

drop index if exists "public"."idx_dive_log_image_user_perf";

drop index if exists "public"."idx_dive_logs_admin_final";

drop index if exists "public"."idx_dive_logs_admin_perf";

drop index if exists "public"."idx_dive_logs_admin_user";

drop index if exists "public"."idx_dive_logs_created_final";

drop index if exists "public"."idx_dive_logs_created_perf";

drop index if exists "public"."idx_dive_logs_date_final";

drop index if exists "public"."idx_dive_logs_recent_admin";

drop index if exists "public"."idx_dive_logs_user_created_composite";

drop index if exists "public"."idx_dive_logs_user_created_final";

drop index if exists "public"."idx_dive_logs_user_date_composite";

drop index if exists "public"."idx_dive_logs_user_date_final";

drop index if exists "public"."idx_dive_logs_user_date_perf";


  create table "public"."dive_log_audit" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "log_id" uuid not null,
    "completeness_score" smallint not null,
    "risk_score" smallint not null,
    "flags" jsonb not null,
    "computed" jsonb not null,
    "summary" text not null,
    "suggestions" text not null,
    "created_at" timestamp with time zone not null default now(),
    "criteria_version" text default 'koval_enclose_v1'::text,
    "model" text,
    "score_final" numeric(5,2),
    "score_safety" smallint,
    "score_technique" smallint,
    "score_efficiency" smallint,
    "score_readiness" smallint,
    "enclose" jsonb default '[]'::jsonb
      );


alter table "public"."dive_log_audit" enable row level security;

alter table "public"."dive_log" drop column "anonymous_user_id";

alter table "public"."dive_log" add column "ascent_seconds" integer;

alter table "public"."dive_log" add column "ascent_speed_mps" numeric(6,3);

alter table "public"."dive_log" add column "descent_seconds" integer;

alter table "public"."dive_log" add column "descent_speed_mps" numeric(6,3);

alter table "public"."dive_log_image" add column "extracted_metrics" jsonb;

alter table "public"."dive_log_image" add column "file_size" bigint;

alter table "public"."dive_log_image" add column "original_filename" text;

alter table "public"."dive_log_image" add column "path" text not null default ''::text;

alter table "public"."dive_log_image" add column "updated_at" timestamp with time zone default now();

alter table "public"."dive_logs" drop column "ai_analysis";

alter table "public"."dive_logs" drop column "ai_summary";

alter table "public"."dive_logs" drop column "bottom_time_seconds";

alter table "public"."dive_logs" drop column "discipline_type";

alter table "public"."dive_logs" drop column "distance_m";

alter table "public"."dive_logs" drop column "duration_seconds";

alter table "public"."dive_logs" drop column "ear_squeeze";

alter table "public"."dive_logs" drop column "exit_status";

alter table "public"."dive_logs" drop column "gear";

alter table "public"."dive_logs" drop column "lung_squeeze";

alter table "public"."dive_logs" drop column "narcosis_level";

alter table "public"."dive_logs" drop column "recovery_quality";

alter table "public"."dive_logs" drop column "total_time_seconds";

CREATE INDEX chat_msg_thread_idx ON public.chat_message USING btree (thread_id, created_at);

CREATE UNIQUE INDEX dive_log_audit_pkey ON public.dive_log_audit USING btree (id);

CREATE UNIQUE INDEX dive_log_audit_user_id_log_id_key ON public.dive_log_audit USING btree (user_id, log_id);

CREATE INDEX dlc_log_idx ON public.dive_log_comment USING btree (dive_log_id, created_at);

CREATE INDEX goal_user_date_idx ON public.goal USING btree (user_id, target_date);

CREATE INDEX idx_dive_log_admin_user ON public.dive_log USING btree (user_id) WHERE ((user_id)::text = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::text);

CREATE INDEX idx_dive_log_audit_enclose ON public.dive_log_audit USING gin (enclose);

CREATE INDEX idx_dive_log_audit_log_id ON public.dive_log_audit USING btree (log_id);

CREATE INDEX idx_dive_log_audit_scores ON public.dive_log_audit USING btree (user_id, score_final);

CREATE INDEX idx_dive_log_image_emergency ON public.dive_log_image USING btree (dive_log_id, user_id);

CREATE INDEX idx_dive_log_image_filename ON public.dive_log_image USING btree (original_filename);

CREATE INDEX idx_dive_log_image_path ON public.dive_log_image USING btree (path);

CREATE INDEX idx_dive_log_recent_admin ON public.dive_log USING btree (date DESC, created_at DESC) WHERE ((user_id)::text = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::text);

CREATE INDEX idx_dive_log_user_created_composite ON public.dive_log USING btree (user_id, created_at DESC);

CREATE INDEX idx_dive_log_user_date_composite ON public.dive_log USING btree (user_id, date DESC);

CREATE INDEX idx_dive_logs_admin_emergency ON public.dive_logs USING btree (user_id) WHERE (user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid);

CREATE INDEX idx_dive_logs_recent_emergency ON public.dive_logs USING btree (date DESC, created_at DESC) WHERE ((user_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid) AND (date >= '2024-01-01'::date));

CREATE INDEX idx_dive_logs_user_date_emergency ON public.dive_logs USING btree (user_id, date DESC);

CREATE INDEX image_user_idx ON public.dive_log_image USING btree (user_id, created_at DESC);

CREATE INDEX job_user_status_idx ON public.ai_job USING btree (user_id, status, created_at DESC);

CREATE INDEX journal_user_idx ON public.journal_entry USING btree (user_id, created_at DESC);

CREATE INDEX memory_user_idx ON public.assistant_memory USING btree (user_id, created_at DESC);

CREATE INDEX tm_user_created_idx ON public.training_metric USING btree (user_id, created_at DESC);

CREATE INDEX user_document_user_idx ON public.user_document USING btree (user_id, created_at DESC);

alter table "public"."dive_log_audit" add constraint "dive_log_audit_pkey" PRIMARY KEY using index "dive_log_audit_pkey";

alter table "public"."dive_log_audit" add constraint "dive_log_audit_log_id_fkey" FOREIGN KEY (log_id) REFERENCES dive_log(id) ON DELETE CASCADE not valid;

alter table "public"."dive_log_audit" validate constraint "dive_log_audit_log_id_fkey";

alter table "public"."dive_log_audit" add constraint "dive_log_audit_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."dive_log_audit" validate constraint "dive_log_audit_user_id_fkey";

alter table "public"."dive_log_audit" add constraint "dive_log_audit_user_id_log_id_key" UNIQUE using index "dive_log_audit_user_id_log_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_user_dive_logs_optimized(target_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, user_id uuid, date date, discipline text, location text, target_depth numeric, reached_depth numeric, total_dive_time interval, mouthfill_depth numeric, issue_depth numeric, squeeze text, exit text, attempt_type text, notes text, issue_comment text, surface_protocol text, metadata jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, image_id uuid, image_bucket text, image_path text, original_filename text, image_analysis jsonb, extracted_metrics jsonb, has_image boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- If no user_id provided, use current user
  IF target_user_id IS NULL THEN
    target_user_id := auth.uid();
  END IF;
  
  -- Check if current user is admin or requesting their own data
  IF NOT (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin')
    OR auth.uid() = target_user_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT * FROM v_dive_logs_with_images v
  WHERE v.user_id = target_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_dive_log_image_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."v_dive_metrics" as  SELECT id,
    user_id,
    date,
    discipline,
    reached_depth,
    bottom_time_seconds,
    total_time_seconds,
    location,
    lat,
    lng,
    tags,
    notes,
    ai_summary,
    ai_analysis,
    created_at,
    updated_at,
    discipline_type,
    target_depth,
    mouthfill_depth,
    issue_depth,
    issue_comment,
    squeeze,
    exit_status,
    duration_seconds,
    distance_m,
    attempt_type,
    surface_protocol,
    ear_squeeze,
    lung_squeeze,
    narcosis_level,
    recovery_quality,
    gear,
    descent_seconds,
    ascent_seconds,
    descent_speed_mps,
    ascent_speed_mps,
        CASE
            WHEN (descent_speed_mps IS NOT NULL) THEN descent_speed_mps
            WHEN ((reached_depth IS NOT NULL) AND (descent_seconds IS NOT NULL) AND (descent_seconds > 0)) THEN ((reached_depth)::numeric / (descent_seconds)::numeric)
            ELSE NULL::numeric
        END AS descent_mps,
        CASE
            WHEN (ascent_speed_mps IS NOT NULL) THEN ascent_speed_mps
            WHEN ((reached_depth IS NOT NULL) AND (ascent_seconds IS NOT NULL) AND (ascent_seconds > 0)) THEN ((reached_depth)::numeric / (ascent_seconds)::numeric)
            ELSE NULL::numeric
        END AS ascent_mps,
        CASE
            WHEN ((reached_depth IS NOT NULL) AND (total_time_seconds IS NOT NULL) AND (reached_depth > (0)::numeric)) THEN ((total_time_seconds)::numeric / reached_depth)
            ELSE NULL::numeric
        END AS vdi_sec_per_meter
   FROM dive_log l;


create or replace view "public"."v_user_enclose_summary" as  SELECT user_id,
    count(*) AS total_audits,
    avg(score_final) AS avg_score,
    jsonb_agg(enclose) AS all_enclose_data
   FROM dive_log_audit a
  WHERE ((enclose IS NOT NULL) AND (jsonb_array_length(enclose) > 0))
  GROUP BY user_id;


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end $function$
;

create or replace view "public"."v_dive_logs_with_images" as  SELECT dl.id,
    dl.user_id,
    dl.date,
    dl.discipline,
    dl.location,
    dl.target_depth,
    dl.reached_depth,
    dl.total_dive_time,
    dl.mouthfill_depth,
    dl.issue_depth,
    dl.squeeze,
    dl.exit,
    dl.attempt_type,
    dl.notes,
    dl.issue_comment,
    dl.surface_protocol,
    dl.metadata,
    dl.created_at,
    dl.updated_at,
    dli.id AS image_id,
    dli.bucket AS image_bucket,
    dli.path AS image_path,
    dli.original_filename,
    dli.ai_analysis AS image_analysis,
    dli.extracted_metrics,
        CASE
            WHEN (dli.id IS NOT NULL) THEN true
            ELSE false
        END AS has_image
   FROM (dive_logs dl
     LEFT JOIN dive_log_image dli ON ((dl.id = dli.dive_log_id)))
  ORDER BY dl.date DESC, dl.created_at DESC;


create or replace view "public"."v_admin_dive_logs" as  SELECT id,
    user_id,
    date,
    discipline,
    location,
    target_depth,
    reached_depth,
    total_dive_time,
    mouthfill_depth,
    issue_depth,
    squeeze,
    exit,
    attempt_type,
    notes,
    issue_comment,
    surface_protocol,
    metadata,
    created_at,
    updated_at,
    image_id,
    image_bucket,
    image_path,
    original_filename,
    image_analysis,
    extracted_metrics,
    has_image
   FROM v_dive_logs_with_images;


grant delete on table "public"."dive_log_audit" to "anon";

grant insert on table "public"."dive_log_audit" to "anon";

grant references on table "public"."dive_log_audit" to "anon";

grant select on table "public"."dive_log_audit" to "anon";

grant trigger on table "public"."dive_log_audit" to "anon";

grant truncate on table "public"."dive_log_audit" to "anon";

grant update on table "public"."dive_log_audit" to "anon";

grant delete on table "public"."dive_log_audit" to "authenticated";

grant insert on table "public"."dive_log_audit" to "authenticated";

grant references on table "public"."dive_log_audit" to "authenticated";

grant select on table "public"."dive_log_audit" to "authenticated";

grant trigger on table "public"."dive_log_audit" to "authenticated";

grant truncate on table "public"."dive_log_audit" to "authenticated";

grant update on table "public"."dive_log_audit" to "authenticated";

grant delete on table "public"."dive_log_audit" to "service_role";

grant insert on table "public"."dive_log_audit" to "service_role";

grant references on table "public"."dive_log_audit" to "service_role";

grant select on table "public"."dive_log_audit" to "service_role";

grant trigger on table "public"."dive_log_audit" to "service_role";

grant truncate on table "public"."dive_log_audit" to "service_role";

grant update on table "public"."dive_log_audit" to "service_role";


  create policy "dla_delete_own"
  on "public"."dive_log_audit"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "dla_read_own"
  on "public"."dive_log_audit"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "dla_update_own"
  on "public"."dive_log_audit"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "dla_write_own"
  on "public"."dive_log_audit"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Temporary test policy for dive_logs"
  on "public"."dive_logs"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Users can delete their own dive log images"
  on "public"."dive_log_image"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own dive log images"
  on "public"."dive_log_image"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own dive log images"
  on "public"."dive_log_image"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own dive log images"
  on "public"."dive_log_image"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER trigger_update_dive_log_image_updated_at BEFORE UPDATE ON public.dive_log_image FOR EACH ROW EXECUTE FUNCTION update_dive_log_image_updated_at();


