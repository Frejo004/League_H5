[
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.add_match_event_v2(p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/add_match_event_v2`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "add_match_event_v2",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_add_match_event_v2_p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.claim_player_invite(p_token text, p_user_id uuid)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/claim_player_invite`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "claim_player_invite",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_token text, p_user_id uuid",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_claim_player_invite_p_token text, p_user_id uuid"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.get_invite_player(p_token text)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/get_invite_player`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "get_invite_player",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_token text",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_get_invite_player_p_token text"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.get_user_conversation_ids()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/get_user_conversation_ids`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "get_user_conversation_ids",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_get_user_conversation_ids_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.handle_new_profile_spectator()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_profile_spectator`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_profile_spectator",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_handle_new_profile_spectator_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.handle_new_season()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_season`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_season",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_handle_new_season_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.handle_new_user()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_user",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_handle_new_user_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.handle_new_user_notification_preferences()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user_notification_preferences`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_user_notification_preferences",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_handle_new_user_notification_preferences_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.handle_red_card_suspension()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_red_card_suspension`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "handle_red_card_suspension",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_handle_red_card_suspension_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/resolve_bet_slips_for_poll`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "resolve_bet_slips_for_poll",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_poll_id uuid, p_correct_idx integer",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_resolve_bet_slips_for_poll_p_poll_id uuid, p_correct_idx integer"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.resolve_match_polls(p_match_id uuid)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/resolve_match_polls`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "resolve_match_polls",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_match_id uuid",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_resolve_match_polls_p_match_id uuid"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.sync_captain_on_claim()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/sync_captain_on_claim`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "sync_captain_on_claim",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_sync_captain_on_claim_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.sync_player_identity_from_profile()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/sync_player_identity_from_profile`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "sync_player_identity_from_profile",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_sync_player_identity_from_profile_"
  },
  {
    "name": "anon_security_definer_function_executable",
    "title": "Public Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.",
    "detail": "Function `public.try_resolve_slip(p_slip_id uuid)` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/try_resolve_slip`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    "metadata": {
      "name": "try_resolve_slip",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_slip_id uuid",
      "security_definer": true
    },
    "cache_key": "anon_security_definer_function_executable_public_try_resolve_slip_p_slip_id uuid"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.add_match_event_v2(p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/add_match_event_v2`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "add_match_event_v2",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_add_match_event_v2_p_match_id uuid, p_type text, p_minute integer, p_period integer, p_team_id uuid, p_player_id uuid, p_player2_id uuid, p_description text"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.claim_player_invite(p_token text, p_user_id uuid)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/claim_player_invite`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "claim_player_invite",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_token text, p_user_id uuid",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_claim_player_invite_p_token text, p_user_id uuid"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.get_invite_player(p_token text)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/get_invite_player`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "get_invite_player",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_token text",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_get_invite_player_p_token text"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.get_user_conversation_ids()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/get_user_conversation_ids`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "get_user_conversation_ids",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_get_user_conversation_ids_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.handle_new_profile_spectator()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_profile_spectator`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_profile_spectator",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_handle_new_profile_spectator_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.handle_new_season()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_season`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_season",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_handle_new_season_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.handle_new_user()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_user",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_handle_new_user_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.handle_new_user_notification_preferences()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_new_user_notification_preferences`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "handle_new_user_notification_preferences",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_handle_new_user_notification_preferences_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.handle_red_card_suspension()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/handle_red_card_suspension`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "handle_red_card_suspension",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_handle_red_card_suspension_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.resolve_bet_slips_for_poll(p_poll_id uuid, p_correct_idx integer)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/resolve_bet_slips_for_poll`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "resolve_bet_slips_for_poll",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_poll_id uuid, p_correct_idx integer",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_resolve_bet_slips_for_poll_p_poll_id uuid, p_correct_idx integer"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.resolve_match_polls(p_match_id uuid)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/resolve_match_polls`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "resolve_match_polls",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_match_id uuid",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_resolve_match_polls_p_match_id uuid"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.sync_captain_on_claim()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/sync_captain_on_claim`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "sync_captain_on_claim",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_sync_captain_on_claim_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.sync_player_identity_from_profile()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/sync_player_identity_from_profile`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "sync_player_identity_from_profile",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_sync_player_identity_from_profile_"
  },
  {
    "name": "authenticated_security_definer_function_executable",
    "title": "Signed-In Users Can Execute SECURITY DEFINER Function",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it.",
    "detail": "Function `public.try_resolve_slip(p_slip_id uuid)` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/try_resolve_slip`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable",
    "metadata": {
      "name": "try_resolve_slip",
      "schema": "public",
      "language": "plpgsql",
      "arguments": "p_slip_id uuid",
      "security_definer": true
    },
    "cache_key": "authenticated_security_definer_function_executable_public_try_resolve_slip_p_slip_id uuid"
  },
  {
    "name": "auth_leaked_password_protection",
    "title": "Leaked Password Protection Disabled",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "SECURITY"
    ],
    "description": "Leaked password protection is currently disabled.",
    "detail": "Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.",
    "cache_key": "auth_leaked_password_protection",
    "remediation": "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
    "metadata": {
      "type": "auth",
      "entity": "Auth"
    }
  }
]
[
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.chat_participants\\` has a row level security policy \\`chat_part_insert\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "chat_participants",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_chat_participants_chat_part_insert"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.chat_messages\\` has a row level security policy \\`chat_msg_insert_v2\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "chat_messages",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_chat_messages_chat_msg_insert_v2"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.chat_messages\\` has a row level security policy \\`chat_msg_select_v2\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "chat_messages",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_chat_messages_chat_msg_select_v2"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.global_channels\\` has a row level security policy \\`global_channels: admin update\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "global_channels",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_global_channels_global_channels: admin update"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.notifications\\` has a row level security policy \\`notif_select_policy\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "notifications",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_notifications_notif_select_policy"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.notifications\\` has a row level security policy \\`notif_update_policy\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "notifications",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_notifications_notif_update_policy"
  },
  {
    "name": "auth_rls_initplan",
    "title": "Auth RLS Initialization Plan",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if calls to \\`current_setting()\\` and \\`auth.<function>()\\` in RLS policies are being unnecessarily re-evaluated for each row",
    "detail": "Table \\`public.potw_votes\\` has a row level security policy \\`votes_insert_policy\\` that re-evaluates current_setting() or auth.<function>() for each row. This produces suboptimal query performance at scale. Resolve the issue by replacing \\`auth.<function>()\\` with \\`(select auth.<function>())\\`. See [docs](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select) for more info.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan",
    "metadata": {
      "name": "potw_votes",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "auth_rls_init_plan_public_potw_votes_votes_insert_policy"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.assists\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"assists: admin insert\",\"assists: authenticated insert\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "assists",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_assists_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.channel_messages\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"channel_messages: insert captains\",\"channel_messages: insert general\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "channel_messages",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_channel_messages_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.chat_participants\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{chat_part_select,chat_part_select_v2}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "chat_participants",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_chat_participants_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.goals\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"goals: admin insert\",\"goals: authenticated insert\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "goals",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_goals_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.match_events\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"match_events: admin insert\",\"match_events: admin or reporter insert\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "match_events",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_match_events_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.match_lineups\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"match_lineups: admin manage\",\"match_lineups: captain manage\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "match_lineups",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_match_lineups_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.matches\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"matches: admin update\",\"matches: reporter update\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "matches",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_matches_authenticated_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.players\\` has multiple permissive policies for role \\`authenticated\\` for action \\`DELETE\\`. Policies include \\`{\"Admins can delete players\",\"players: admin delete\",\"players: captain manage own team\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "players",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_players_authenticated_DELETE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.players\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"players: admin insert\",\"players: captain manage own team\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "players",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_players_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.players\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{\"players: captain manage own team\",\"players: public read\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "players",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_players_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.players\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"players: admin update\",\"players: captain manage own team\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "players",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_players_authenticated_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.polls\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{\"polls: admin create/update/delete\",\"polls: authenticated read\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "polls",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_polls_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.profiles\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"profiles: admin update\",\"profiles: own update\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "profiles",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_profiles_authenticated_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.spectators\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{\"spectators: admin read\",\"spectators: own read\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "spectators",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_spectators_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.suspensions\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{\"Suspensions consultables par tous\",\"Suspensions gérables par les admins\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "suspensions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_suspensions_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.teams\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"teams: admin update\",\"teams: captain update logo and name\",\"teams: captain update own\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "teams",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_teams_authenticated_UPDATE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.transfers\\` has multiple permissive policies for role \\`authenticated\\` for action \\`DELETE\\`. Policies include \\`{\"Admin can delete\",\"transfers: delete\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_transfers_authenticated_DELETE"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.transfers\\` has multiple permissive policies for role \\`authenticated\\` for action \\`INSERT\\`. Policies include \\`{\"Admin can insert\",\"transfers: create\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_transfers_authenticated_INSERT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.transfers\\` has multiple permissive policies for role \\`authenticated\\` for action \\`SELECT\\`. Policies include \\`{\"Admin can select\",\"transfers: authenticated read\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_transfers_authenticated_SELECT"
  },
  {
    "name": "multiple_permissive_policies",
    "title": "Multiple Permissive Policies",
    "level": "WARN",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if multiple permissive row level security policies are present on a table for the same \\`role\\` and \\`action\\` (e.g. insert). Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.",
    "detail": "Table \\`public.transfers\\` has multiple permissive policies for role \\`authenticated\\` for action \\`UPDATE\\`. Policies include \\`{\"Admin can update\",\"transfers: update\"}\\`",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "multiple_permissive_policies_public_transfers_authenticated_UPDATE"
  }
]
[
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.channel_message_reactions\\` has a foreign key \\`channel_message_reactions_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "channel_message_reactions",
      "type": "table",
      "schema": "public",
      "fkey_name": "channel_message_reactions_user_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_channel_message_reactions_channel_message_reactions_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.channel_messages\\` has a foreign key \\`channel_messages_reply_to_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "channel_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "channel_messages_reply_to_id_fkey",
      "fkey_columns": [
        5
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_channel_messages_channel_messages_reply_to_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.channel_read_receipts\\` has a foreign key \\`channel_read_receipts_channel_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "channel_read_receipts",
      "type": "table",
      "schema": "public",
      "fkey_name": "channel_read_receipts_channel_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_channel_read_receipts_channel_read_receipts_channel_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.channel_read_receipts\\` has a foreign key \\`channel_read_receipts_last_read_msg_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "channel_read_receipts",
      "type": "table",
      "schema": "public",
      "fkey_name": "channel_read_receipts_last_read_msg_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_channel_read_receipts_channel_read_receipts_last_read_msg_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_conversations\\` has a foreign key \\`chat_conversations_team_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_conversations",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_conversations_team_id_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_conversations_chat_conversations_team_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_mentions\\` has a foreign key \\`chat_mentions_mentioned_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_mentions",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_mentions_mentioned_by_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_mentions_chat_mentions_mentioned_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_messages\\` has a foreign key \\`chat_messages_conversation_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_messages_conversation_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_messages_chat_messages_conversation_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_messages\\` has a foreign key \\`chat_messages_sender_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_messages_sender_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_messages_chat_messages_sender_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_participants\\` has a foreign key \\`chat_participants_profile_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_participants",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_participants_profile_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_participants_chat_participants_profile_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.chat_read_receipts\\` has a foreign key \\`chat_read_receipts_last_read_msg_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "chat_read_receipts",
      "type": "table",
      "schema": "public",
      "fkey_name": "chat_read_receipts_last_read_msg_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_chat_read_receipts_chat_read_receipts_last_read_msg_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.dm_message_reactions\\` has a foreign key \\`dm_message_reactions_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "dm_message_reactions",
      "type": "table",
      "schema": "public",
      "fkey_name": "dm_message_reactions_user_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_dm_message_reactions_dm_message_reactions_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.dm_messages\\` has a foreign key \\`dm_messages_reply_to_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "dm_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "dm_messages_reply_to_id_fkey",
      "fkey_columns": [
        5
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_dm_messages_dm_messages_reply_to_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.dm_read_receipts\\` has a foreign key \\`dm_read_receipts_conversation_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "dm_read_receipts",
      "type": "table",
      "schema": "public",
      "fkey_name": "dm_read_receipts_conversation_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_dm_read_receipts_dm_read_receipts_conversation_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.dm_read_receipts\\` has a foreign key \\`dm_read_receipts_last_read_msg_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "dm_read_receipts",
      "type": "table",
      "schema": "public",
      "fkey_name": "dm_read_receipts_last_read_msg_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_dm_read_receipts_dm_read_receipts_last_read_msg_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.goals\\` has a foreign key \\`goals_match_event_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "goals",
      "type": "table",
      "schema": "public",
      "fkey_name": "goals_match_event_id_fkey",
      "fkey_columns": [
        8
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_goals_goals_match_event_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.live_reactions\\` has a foreign key \\`live_reactions_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "live_reactions",
      "type": "table",
      "schema": "public",
      "fkey_name": "live_reactions_user_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_live_reactions_live_reactions_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.match_events\\` has a foreign key \\`match_events_created_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "match_events",
      "type": "table",
      "schema": "public",
      "fkey_name": "match_events_created_by_fkey",
      "fkey_columns": [
        11
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_match_events_match_events_created_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.match_events\\` has a foreign key \\`match_events_player2_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "match_events",
      "type": "table",
      "schema": "public",
      "fkey_name": "match_events_player2_id_fkey",
      "fkey_columns": [
        8
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_match_events_match_events_player2_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.match_events\\` has a foreign key \\`match_events_player_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "match_events",
      "type": "table",
      "schema": "public",
      "fkey_name": "match_events_player_id_fkey",
      "fkey_columns": [
        7
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_match_events_match_events_player_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.match_events\\` has a foreign key \\`match_events_team_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "match_events",
      "type": "table",
      "schema": "public",
      "fkey_name": "match_events_team_id_fkey",
      "fkey_columns": [
        6
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_match_events_match_events_team_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.match_lineups\\` has a foreign key \\`match_lineups_player_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "match_lineups",
      "type": "table",
      "schema": "public",
      "fkey_name": "match_lineups_player_id_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_match_lineups_match_lineups_player_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.matches\\` has a foreign key \\`matches_events_reporter_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "matches",
      "type": "table",
      "schema": "public",
      "fkey_name": "matches_events_reporter_id_fkey",
      "fkey_columns": [
        23
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_matches_matches_events_reporter_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.matches\\` has a foreign key \\`matches_video_reporter_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "matches",
      "type": "table",
      "schema": "public",
      "fkey_name": "matches_video_reporter_id_fkey",
      "fkey_columns": [
        24
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_matches_matches_video_reporter_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.news_posts\\` has a foreign key \\`news_posts_author_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "news_posts",
      "type": "table",
      "schema": "public",
      "fkey_name": "news_posts_author_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_news_posts_news_posts_author_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.notifications\\` has a foreign key \\`notifications_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "notifications",
      "type": "table",
      "schema": "public",
      "fkey_name": "notifications_user_id_fkey",
      "fkey_columns": [
        2
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_notifications_notifications_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.player_invites\\` has a foreign key \\`player_invites_created_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "player_invites",
      "type": "table",
      "schema": "public",
      "fkey_name": "player_invites_created_by_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_player_invites_player_invites_created_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.polls\\` has a foreign key \\`polls_created_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "polls",
      "type": "table",
      "schema": "public",
      "fkey_name": "polls_created_by_fkey",
      "fkey_columns": [
        9
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_polls_polls_created_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.potw_votes\\` has a foreign key \\`potw_votes_player_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "potw_votes",
      "type": "table",
      "schema": "public",
      "fkey_name": "potw_votes_player_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_potw_votes_potw_votes_player_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.spectators\\` has a foreign key \\`spectators_reviewed_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "spectators",
      "type": "table",
      "schema": "public",
      "fkey_name": "spectators_reviewed_by_fkey",
      "fkey_columns": [
        7
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_spectators_spectators_reviewed_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.suspensions\\` has a foreign key \\`suspensions_match_id_trigger_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "suspensions",
      "type": "table",
      "schema": "public",
      "fkey_name": "suspensions_match_id_trigger_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_suspensions_suspensions_match_id_trigger_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.suspensions\\` has a foreign key \\`suspensions_season_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "suspensions",
      "type": "table",
      "schema": "public",
      "fkey_name": "suspensions_season_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_suspensions_suspensions_season_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.team_message_reactions\\` has a foreign key \\`team_message_reactions_user_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "team_message_reactions",
      "type": "table",
      "schema": "public",
      "fkey_name": "team_message_reactions_user_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_team_message_reactions_team_message_reactions_user_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.team_pinned_messages\\` has a foreign key \\`team_pinned_messages_message_id_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "team_pinned_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "team_pinned_messages_message_id_fkey",
      "fkey_columns": [
        3
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_team_pinned_messages_team_pinned_messages_message_id_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.team_pinned_messages\\` has a foreign key \\`team_pinned_messages_pinned_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "team_pinned_messages",
      "type": "table",
      "schema": "public",
      "fkey_name": "team_pinned_messages_pinned_by_fkey",
      "fkey_columns": [
        4
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_team_pinned_messages_team_pinned_messages_pinned_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transfers\\` has a foreign key \\`transfers_admin_approved_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public",
      "fkey_name": "transfers_admin_approved_by_fkey",
      "fkey_columns": [
        16
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transfers_transfers_admin_approved_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transfers\\` has a foreign key \\`transfers_away_captain_approved_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public",
      "fkey_name": "transfers_away_captain_approved_by_fkey",
      "fkey_columns": [
        18
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transfers_transfers_away_captain_approved_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transfers\\` has a foreign key \\`transfers_decided_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public",
      "fkey_name": "transfers_decided_by_fkey",
      "fkey_columns": [
        11
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transfers_transfers_decided_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transfers\\` has a foreign key \\`transfers_home_captain_approved_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public",
      "fkey_name": "transfers_home_captain_approved_by_fkey",
      "fkey_columns": [
        14
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transfers_transfers_home_captain_approved_by_fkey"
  },
  {
    "name": "unindexed_foreign_keys",
    "title": "Unindexed foreign keys",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Identifies foreign key constraints without a covering index, which can impact database performance.",
    "detail": "Table \\`public.transfers\\` has a foreign key \\`transfers_requested_by_fkey\\` without a covering index. This can lead to suboptimal query performance.",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public",
      "fkey_name": "transfers_requested_by_fkey",
      "fkey_columns": [
        6
      ]
    },
    "cache_key": "unindexed_foreign_keys_public_transfers_transfers_requested_by_fkey"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`spectators_status_idx\\` on table \\`public.spectators\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "spectators",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_spectators_spectators_status_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`teams_season_idx\\` on table \\`public.teams\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "teams",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_teams_teams_season_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`teams_captain_idx\\` on table \\`public.teams\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "teams",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_teams_teams_captain_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`matches_season_idx\\` on table \\`public.matches\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "matches",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_matches_matches_season_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`teams_captain_player_idx\\` on table \\`public.teams\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "teams",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_teams_teams_captain_player_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`polls_status_idx\\` on table \\`public.polls\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "polls",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_polls_polls_status_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`transfers_from_team_idx\\` on table \\`public.transfers\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_transfers_transfers_from_team_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`transfers_to_team_idx\\` on table \\`public.transfers\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_transfers_transfers_to_team_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`transfers_status_idx\\` on table \\`public.transfers\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "transfers",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_transfers_transfers_status_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`predictions_is_correct_idx\\` on table \\`public.predictions\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "predictions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_predictions_predictions_is_correct_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`predictions_points_idx\\` on table \\`public.predictions\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "predictions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_predictions_predictions_points_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`team_messages_sender_idx\\` on table \\`public.team_messages\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "team_messages",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_team_messages_team_messages_sender_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`user_presence_last_seen_idx\\` on table \\`public.user_presence\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "user_presence",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_user_presence_user_presence_last_seen_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`bet_slips_season_idx\\` on table \\`public.bet_slips\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "bet_slips",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_bet_slips_bet_slips_season_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_news_posts_season_id\\` on table \\`public.news_posts\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "news_posts",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_news_posts_idx_news_posts_season_id"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_suspensions_active\\` on table \\`public.suspensions\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "suspensions",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_suspensions_idx_suspensions_active"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`teams_slug_idx\\` on table \\`public.teams\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "teams",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_teams_teams_slug_idx"
  },
  {
    "name": "unused_index",
    "title": "Unused Index",
    "level": "INFO",
    "facing": "EXTERNAL",
    "categories": [
      "PERFORMANCE"
    ],
    "description": "Detects if an index has never been used and may be a candidate for removal.",
    "detail": "Index \\`idx_match_feedback_team_id\\` on table \\`public.match_feedback\\` has not been used",
    "remediation": "https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index",
    "metadata": {
      "name": "match_feedback",
      "type": "table",
      "schema": "public"
    },
    "cache_key": "unused_index_public_match_feedback_idx_match_feedback_team_id"
  }
]