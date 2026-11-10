ALTER TABLE public.participants ADD COLUMN first_submitted_at timestamptz;
ALTER TABLE public.participants ADD COLUMN last_submitted_at timestamptz;

CREATE TABLE public.measurement_visitors (
  id uuid PRIMARY KEY,
  consent boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.measurement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  schedule_id text,
  participant_id uuid,
  visitor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  context jsonb NOT NULL DEFAULT '{}',
  properties jsonb NOT NULL DEFAULT '{}',
  dedupe_key text UNIQUE,
  ads_sent_at timestamptz,
  ads_attempts integer NOT NULL DEFAULT 0,
  ads_next_attempt_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX measurement_events_schedule_idx ON public.measurement_events(schedule_id, name);
CREATE INDEX measurement_events_pending_idx ON public.measurement_events(ads_next_attempt_at, occurred_at)
WHERE ads_sent_at IS NULL AND visitor_id IS NOT NULL AND context @> '{"consent":true}'::jsonb
AND name IN ('event_created', 'availability_first_submitted', 'group_activated');
CREATE INDEX measurement_events_visitor_idx ON public.measurement_events(visitor_id, occurred_at);
ALTER TABLE public.measurement_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.measurement_visitors, public.measurement_events FROM anon, authenticated;
GRANT ALL ON public.measurement_visitors, public.measurement_events TO service_role;

CREATE FUNCTION public.measure_event_creation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.measurement_events(name, schedule_id, dedupe_key, properties)
  VALUES ('event_created', NEW.id, 'created:' || NEW.id,
    jsonb_build_object('event_mode', NEW.mode, 'date_only', NEW.date_only));
  RETURN NEW;
END;
$$;

CREATE TRIGGER measurement_event_created AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.measure_event_creation();

CREATE FUNCTION public.measure_availability_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  event_row public.events%ROWTYPE;
  creator_context jsonb;
  creator_visitor uuid;
BEGIN
  NEW.first_submitted_at := COALESCE(OLD.first_submitted_at, now());
  NEW.last_submitted_at := now();
  IF OLD.first_submitted_at IS NULL THEN
    SELECT * INTO event_row FROM public.events WHERE id = NEW.event_id FOR UPDATE;
    INSERT INTO public.measurement_events(name, schedule_id, participant_id, dedupe_key, properties)
    VALUES ('availability_first_submitted', NEW.event_id, NEW.id, 'submitted:' || NEW.id,
      jsonb_build_object('event_mode', event_row.mode, 'date_only', event_row.date_only));
    IF EXISTS (
      SELECT 1 FROM public.participants
      WHERE event_id = NEW.event_id AND id <> NEW.id AND first_submitted_at IS NOT NULL
    ) THEN
      SELECT context, visitor_id INTO creator_context, creator_visitor
      FROM public.measurement_events WHERE dedupe_key = 'created:' || NEW.event_id;
      INSERT INTO public.measurement_events(name, schedule_id, visitor_id, context, dedupe_key, properties)
      VALUES ('group_activated', NEW.event_id, creator_visitor, COALESCE(creator_context, '{}'),
        'activated:' || NEW.event_id, jsonb_build_object('event_mode', event_row.mode, 'date_only', event_row.date_only))
      ON CONFLICT (dedupe_key) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.measurement_events(name, schedule_id, participant_id)
    VALUES ('availability_updated', NEW.event_id, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER measurement_availability_submitted BEFORE UPDATE OF availability ON public.participants
FOR EACH ROW EXECUTE FUNCTION public.measure_availability_submission();

REVOKE ALL ON FUNCTION public.measure_event_creation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.measure_availability_submission() FROM PUBLIC;
