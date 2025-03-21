CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`attachments` text,
	`role` text NOT NULL,
	`annotations` text,
	`parts` text,
	`chat_thread_id` text NOT NULL,
	FOREIGN KEY (`chat_thread_id`) REFERENCES `chat_threads`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_messages_id_unique` ON `chat_messages` (`id`);--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_threads_id_unique` ON `chat_threads` (`id`);--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`html_body` text NOT NULL,
	`text_body` text NOT NULL,
	`parts` text NOT NULL,
	`subject` text,
	`date` text NOT NULL,
	`from` text NOT NULL,
	`in_reply_to` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_messages_id_unique` ON `email_messages` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_messages_message_id_unique` ON `email_messages` (`message_id`);--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`email_message_id` text,
	`embedding` F32_BLOB(384),
	FOREIGN KEY (`email_message_id`) REFERENCES `email_messages`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `embeddings_id_unique` ON `embeddings` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `embeddings_email_message_id_unique` ON `embeddings` (`email_message_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text DEFAULT (CURRENT_DATE)
);
