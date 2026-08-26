-- Chart evidence cards: Yahoo sparkline or TradingView widget, stored as
-- their own kind so a figure (image) and a live tape never share a payload.

alter table publication_cards
  drop constraint if exists publication_cards_kind_check;

alter table publication_cards
  add constraint publication_cards_kind_check
  check (kind in (
    'thesis',
    'edge',
    'path_to_target',
    'kill_switch',
    'catalyst_timeline',
    'checklist',
    'figure',
    'chart',
    'steelman',
    'unlock'
  ));
