BEGIN;

INSERT INTO public.events(id, title, dates, time_start, time_end, mode, date_only)
VALUES ('measurement-fixture', '계측 검증', ARRAY['2026-11-10'], 36, 84, 'unavailable', false);

INSERT INTO public.participants(id, event_id, name, availability)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'measurement-fixture', '검증 응답 1', '{}'),
  ('22222222-2222-4222-8222-222222222222', 'measurement-fixture', '검증 응답 2', '{}');

DO $$ BEGIN
  ASSERT (SELECT count(*) = 1 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'event_created');
  ASSERT NOT EXISTS (SELECT 1 FROM public.participants WHERE event_id = 'measurement-fixture' AND first_submitted_at IS NOT NULL);
  ASSERT NOT EXISTS (SELECT 1 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'availability_first_submitted');
END $$;

UPDATE public.participants SET availability = '{}' WHERE id = '11111111-1111-4111-8111-111111111111';

DO $$ BEGIN
  ASSERT (SELECT first_submitted_at IS NOT NULL AND last_submitted_at IS NOT NULL FROM public.participants WHERE id = '11111111-1111-4111-8111-111111111111');
  ASSERT (SELECT count(*) = 1 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'availability_first_submitted');
  ASSERT NOT EXISTS (SELECT 1 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'group_activated');
END $$;

UPDATE public.participants SET availability = '{}' WHERE id = '11111111-1111-4111-8111-111111111111';
UPDATE public.participants SET availability = '{}' WHERE id = '22222222-2222-4222-8222-222222222222';
UPDATE public.participants SET availability = '{}' WHERE id = '22222222-2222-4222-8222-222222222222';

DO $$ BEGIN
  ASSERT (SELECT count(*) = 2 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'availability_first_submitted');
  ASSERT (SELECT count(*) = 1 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'group_activated');
  ASSERT (SELECT count(*) = 2 FROM public.measurement_events WHERE schedule_id = 'measurement-fixture' AND name = 'availability_updated');
  ASSERT NOT has_table_privilege('anon', 'public.measurement_events', 'SELECT');
  ASSERT NOT has_table_privilege('authenticated', 'public.measurement_visitors', 'SELECT');
END $$;

ROLLBACK;
