-- ============================================================
-- Drop ALL policies on chat_participants, chat_conversations, etc.
-- because these tables either don't exist or have infinite recursion!
-- ============================================================

-- Drop any existing policies on chat_participants
DROP POLICY IF EXISTS "chat_part_select" ON public.chat_participants;
DROP POLICY IF EXISTS "chat_part_select_v2" ON public.chat_participants;
DROP POLICY IF EXISTS "chat_part_insert" ON public.chat_participants;

-- Drop any existing policies on chat_conversations
DROP POLICY IF EXISTS "chat_conv_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conv_select_v2" ON public.chat_conversations;

-- Drop any existing policies on chat_messages
DROP POLICY IF EXISTS "chat_msg_select_v2" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_msg_insert_v2" ON public.chat_messages;


