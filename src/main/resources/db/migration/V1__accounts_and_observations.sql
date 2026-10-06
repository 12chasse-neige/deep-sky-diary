CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,32}$'),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_expiration_idx ON sessions(expires_at);
CREATE TABLE observations (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  object VARCHAR(100) NOT NULL CHECK (length(btrim(object)) > 0),
  kind TEXT NOT NULL CHECK (kind IN ('nebula', 'galaxy', 'cluster', 'other')),
  date DATE NOT NULL,
  location VARCHAR(120) NOT NULL,
  equipment VARCHAR(160) NOT NULL,
  sky TEXT NOT NULL CHECK (sky IN ('通透', '轻霾', '薄云', '多云', '未记录')),
  text TEXT NOT NULL CHECK (length(btrim(text)) > 0 AND length(text) <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX observations_owner_created_idx ON observations(owner_id, created_at DESC, id DESC);
