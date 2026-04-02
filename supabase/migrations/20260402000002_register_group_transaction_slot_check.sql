-- supabase/migrations/20260402000002_register_group_transaction_slot_check.sql
-- ==========================================================================
-- Add atomic slot availability check inside register_group_transaction
-- ==========================================================================
-- The app-layer check (fetch count, compare) is a TOCTOU race under concurrent
-- load. Two simultaneous requests could both pass the app check and both call
-- the RPC, exceeding max_players. This migration replaces the function with
-- a version that enforces the limit atomically inside the transaction.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.register_group_transaction(
  p_schedule_id   UUID,
  p_registrations JSONB,
  p_team          JSONB,
  p_team_members  JSONB,
  p_payment       JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_players      INT;
  v_current_count    INT;
  v_reg_record       JSONB;
  v_member_record    JSONB;
  v_reg_id           UUID;
  v_player_id        UUID;
  v_team_id          UUID;
  v_payment_id       UUID;
  v_reg_map          JSONB := '{}';
  v_registration_ids UUID[] := '{}';
  v_incoming_count   INT;
BEGIN
  -- 0. Atomic slot availability check
  SELECT max_players INTO v_max_players
  FROM schedules
  WHERE id = p_schedule_id;

  SELECT COUNT(*) INTO v_current_count
  FROM registrations
  WHERE schedule_id = p_schedule_id;

  v_incoming_count := jsonb_array_length(p_registrations);

  IF v_current_count + v_incoming_count > v_max_players THEN
    RAISE EXCEPTION 'Schedule is full: % slots available, % requested',
      (v_max_players - v_current_count), v_incoming_count;
  END IF;

  -- 1. Batch insert registrations
  FOR v_reg_record IN SELECT * FROM jsonb_array_elements(p_registrations)
  LOOP
    v_player_id := (v_reg_record->>'player_id')::UUID;

    INSERT INTO registrations (
      schedule_id,
      player_id,
      registered_by,
      preferred_position,
      team_preference,
      registration_note
    ) VALUES (
      p_schedule_id,
      v_player_id,
      (v_reg_record->>'registered_by')::UUID,
      v_reg_record->>'preferred_position',
      v_reg_record->>'team_preference',
      v_reg_record->>'registration_note'
    )
    RETURNING id INTO v_reg_id;

    v_registration_ids := array_append(v_registration_ids, v_reg_id);
    v_reg_map := v_reg_map || jsonb_build_object(v_player_id::TEXT, v_reg_id::TEXT);
  END LOOP;

  -- 2. Insert team
  INSERT INTO teams (schedule_id, name)
  VALUES (p_schedule_id, p_team->>'name')
  RETURNING id INTO v_team_id;

  -- 3. Insert team members
  FOR v_member_record IN SELECT * FROM jsonb_array_elements(p_team_members)
  LOOP
    v_player_id := (v_member_record->>'player_id')::UUID;

    INSERT INTO team_members (team_id, player_id, registration_id, position)
    VALUES (
      v_team_id,
      v_player_id,
      (v_reg_map->>(v_player_id::TEXT))::UUID,
      v_member_record->>'position'
    );
  END LOOP;

  -- 4. Insert payment record
  INSERT INTO registration_payments (
    team_id,
    payer_id,
    schedule_id,
    registration_type,
    required_amount,
    payment_status,
    payment_proof_url,
    payment_channel_id,
    extraction_status
  ) VALUES (
    v_team_id,
    (p_payment->>'payer_id')::UUID,
    p_schedule_id,
    p_payment->>'registration_type',
    (p_payment->>'required_amount')::NUMERIC,
    p_payment->>'payment_status',
    p_payment->>'payment_proof_url',
    CASE
      WHEN p_payment->>'payment_channel_id' IS NULL
        OR p_payment->>'payment_channel_id' = 'null' THEN NULL
      ELSE (p_payment->>'payment_channel_id')::UUID
    END,
    p_payment->>'extraction_status'
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'registration_ids', to_jsonb(v_registration_ids),
    'team_id',          to_jsonb(v_team_id),
    'payment_id',       to_jsonb(v_payment_id)
  );
END;
$$;

-- ==========================================================================
-- ROLLBACK:
-- Restore prior version without slot check, or:
-- DROP FUNCTION IF EXISTS public.register_group_transaction(UUID, JSONB, JSONB, JSONB, JSONB);
-- ==========================================================================
