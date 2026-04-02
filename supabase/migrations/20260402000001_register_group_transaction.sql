-- ==========================================================================
-- Atomic group/team registration transaction
-- ==========================================================================
-- Replaces sequential app-layer inserts across 4 tables.
-- All 4 inserts commit together or roll back together.
-- Called via serviceClient.rpc('register_group_transaction', payload)
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.register_group_transaction(
  p_schedule_id   UUID,
  p_registrations JSONB,  -- [{player_id, registered_by, preferred_position, team_preference, registration_note}]
  p_team          JSONB,  -- {name}
  p_team_members  JSONB,  -- [{player_id, position}]
  p_payment       JSONB   -- {payer_id, required_amount, payment_status, payment_proof_url, payment_channel_id, registration_type, extraction_status}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg_record       JSONB;
  v_member_record    JSONB;
  v_reg_id           UUID;
  v_player_id        UUID;
  v_team_id          UUID;
  v_payment_id       UUID;
  v_reg_map          JSONB := '{}';
  v_registration_ids UUID[] := '{}';
BEGIN
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

  -- 3. Insert team members using the player_id → registration_id map
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
