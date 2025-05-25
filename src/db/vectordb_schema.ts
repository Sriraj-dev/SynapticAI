

/*
Note: We are note generating migrations for this file using drizzle-orm,
because these changes have already beenapplied on the database as raw sql. (which will be included in the repo somewhere) 

As this table contains a lot of partitioning and create ann indexes, drizzle doesn't support it.
*/

/*
Adding this file just for type safety, so we can use it comforatbly in code when required.
*/

import { integer, pgTable, primaryKey, text, uuid, vector } from "drizzle-orm/pg-core";
import { notes, users } from "./schema";


export const semanticNotes = pgTable(
    "semantic_notes",
    {
      userId: text("user_id")
        .notNull()
        .references(() => users.uid, { onDelete: "cascade" }),
  
      noteId: uuid("note_id")
        .notNull()
        .references(() => notes.uid, { onDelete: "cascade" }),
  
      content: text("content"),
  
      totalChunks: integer("total_chunks"),
  
      chunkIndex: integer("chunk_index"),
  
      embedding: vector("embedding", { dimensions: 768 }),
  
      embeddingV2: vector("embedding_v2", { dimensions: 1536 }),
    },
    (table) => ([
        primaryKey({ columns: [table.userId, table.noteId, table.chunkIndex] }),
    ])
);