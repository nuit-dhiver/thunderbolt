/**
 * This file is auto-generated. Do not edit directly.
 * Generated on: 2025-03-10T21:32:46.308Z
 */

export interface Migration {
  hash: string;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    "hash": "0000_messy_the_hunter",
    "name": "0000_messy_the_hunter.sql",
    "sql": `CREATE TABLE \`setting\` (
\t\`id\` integer PRIMARY KEY NOT NULL,
\t\`value\` text,
\t\`updated_at\` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX \`setting_id_unique\` ON \`setting\` (\`id\`);`
  },
  {
    "hash": "0001_lonely_fallen_one",
    "name": "0001_lonely_fallen_one.sql",
    "sql": `ALTER TABLE \`setting\` ADD \`embedding\` text;`
  }
];
