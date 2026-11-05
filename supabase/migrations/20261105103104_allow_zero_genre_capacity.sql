-- Zero explicitly closes recruitment for a genre while preserving the slot.
alter table public.event_genre_slots
  drop constraint event_genre_slots_capacity_check,
  add constraint event_genre_slots_capacity_check check (capacity >= 0);
