-- Keep linked player identity in sync when a user edits their profile.
-- Many screens read names/photos from players, while chat/header read profiles.

create or replace function public.sync_player_identity_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  name_parts text[];
  next_first_name text;
  next_last_name text;
begin
  if new.full_name is not distinct from old.full_name
     and new.avatar_url is not distinct from old.avatar_url then
    return new;
  end if;

  clean_name := nullif(btrim(coalesce(new.full_name, '')), '');

  if clean_name is not null then
    name_parts := regexp_split_to_array(clean_name, '\s+');
    next_first_name := name_parts[1];

    if array_length(name_parts, 1) > 1 then
      next_last_name := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
    else
      next_last_name := name_parts[1];
    end if;

    update public.players
    set
      first_name = next_first_name,
      last_name = next_last_name,
      avatar_url = new.avatar_url,
      updated_at = now()
    where user_id = new.id;
  else
    update public.players
    set
      avatar_url = new.avatar_url,
      updated_at = now()
    where user_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_player_identity_from_profile_trigger on public.profiles;

create trigger sync_player_identity_from_profile_trigger
after update of full_name, avatar_url on public.profiles
for each row
execute function public.sync_player_identity_from_profile();
