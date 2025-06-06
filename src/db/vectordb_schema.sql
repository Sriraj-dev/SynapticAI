
--TODO: Add created_at and updated_at columns
CREATE EXTENSION if not exists vector;

CREATE TABLE if not exists semantic_notes (
  user_id TEXT NOT NULL references users(uid) ON DELETE CASCADE,
  note_id UUID NOT NULL references notes(uid) ON DELETE CASCADE,
  content TEXT,
  chunk_index integer,
  total_chunks integer,
  embedding vector(768),
  embedding_v2 vector(1536)
) PARTITION BY HASH (user_id);

ALTER TABLE semantic_notes ADD PRIMARY KEY (user_id, note_id, chunk_index);

DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 0..24 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS semantic_notes_p%s PARTITION OF semantic_notes FOR VALUES WITH (modulus 25, remainder %s);', i, i
    );
  END LOOP;
END$$;

DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 0..24 LOOP
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS semantic_notes_p%s_embedding_idx ON semantic_notes_p%s USING hnsw (embedding vector_cosine_ops);', i, i
    );
  END LOOP;
END$$;

-- Enables filter-aware ANN search, better for WHERE user_id = '...'
-- But consumes little more time, set it back to strict_order if latency increases a lot
SET hnsw.iterative_scan = relaxed_order;



