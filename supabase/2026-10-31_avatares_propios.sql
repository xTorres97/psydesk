-- PsyDesk · Fotos de perfil: cada profesional solo puede subir o cambiar la suya
-- Antes, cualquier usuario con sesión podía sobrescribir la foto de otro (no se comprobaba la ruta).
-- La app guarda la foto en profiles/avatars/{auth.uid()}.jpg

drop policy if exists upload_own_avatar on storage.objects;
drop policy if exists update_own_avatar on storage.objects;

create policy upload_own_avatar on storage.objects for insert to authenticated
  with check (bucket_id = 'profiles' and name = 'avatars/' || auth.uid()::text || '.jpg');

create policy update_own_avatar on storage.objects for update to authenticated
  using      (bucket_id = 'profiles' and name = 'avatars/' || auth.uid()::text || '.jpg')
  with check (bucket_id = 'profiles' and name = 'avatars/' || auth.uid()::text || '.jpg');
