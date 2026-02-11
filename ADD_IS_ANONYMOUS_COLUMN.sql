-- Выполни этот SQL через Gateway API или напрямую в БД:
-- POST https://api.zooplatforma.ru/api/gateway/db/exec
-- Body: {"query": "ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false"}

ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
