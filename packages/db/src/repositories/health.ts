import { sql, type SQLWrapper } from "drizzle-orm";

export interface DatabaseHealthClient {
  execute: (query: SQLWrapper) => unknown;
}

export async function checkDatabaseHealth(db: DatabaseHealthClient) {
  await db.execute(sql`select 1`);
}
