PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'bidder',
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  plate_letters_ar TEXT NOT NULL,
  plate_letters_en TEXT NOT NULL,
  plate_numbers TEXT NOT NULL,
  current_price INTEGER NOT NULL DEFAULT 5000,
  min_increment INTEGER NOT NULL DEFAULT 250,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  winner_user_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (winner_user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (auction_id) REFERENCES auctions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids(auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);
