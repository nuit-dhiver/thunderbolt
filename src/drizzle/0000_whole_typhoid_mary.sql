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
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_id_unique` ON `contacts` (`id`);--> statement-breakpoint
CREATE TABLE `email_addresses` (
	`address` text PRIMARY KEY NOT NULL,
	`name` text,
	`contact_id` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `email_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`imap_id` text NOT NULL,
	`html_body` text NOT NULL,
	`text_body` text NOT NULL,
	`parts` text,
	`subject` text,
	`sent_at` integer NOT NULL,
	`from_address` text NOT NULL,
	`email_thread_id` text NOT NULL,
	`mailbox` text NOT NULL,
	`references` text,
	FOREIGN KEY (`from_address`) REFERENCES `email_addresses`(`address`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`email_thread_id`) REFERENCES `email_threads`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_messages_id_unique` ON `email_messages` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `email_messages_imap_id_unique` ON `email_messages` (`imap_id`);--> statement-breakpoint
CREATE TABLE `email_messages_to_addresses` (
	`email_message_id` text NOT NULL,
	`email_address_id` text NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`email_message_id`, `email_address_id`),
	FOREIGN KEY (`email_message_id`) REFERENCES `email_messages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`email_address_id`) REFERENCES `email_addresses`(`address`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `email_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`root_imap_id` text,
	`first_message_at` integer NOT NULL,
	`last_message_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_threads_id_unique` ON `email_threads` (`id`);--> statement-breakpoint
CREATE TABLE `embeddings` (
	`id` text PRIMARY KEY NOT NULL,
	`email_message_id` text,
	`email_thread_id` text,
	`embedding` F32_BLOB(384),
	`as_text` text,
	FOREIGN KEY (`email_message_id`) REFERENCES `email_messages`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`email_thread_id`) REFERENCES `email_threads`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `embeddings_id_unique` ON `embeddings` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `embeddings_email_message_id_unique` ON `embeddings` (`email_message_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `embeddings_email_thread_id_unique` ON `embeddings` (`email_thread_id`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`url` text,
	`api_key` text,
	`is_system` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_id_unique` ON `models` (`id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`email_message_id` text,
	FOREIGN KEY (`email_message_id`) REFERENCES `email_messages`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `todos_id_unique` ON `todos` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `todos_email_message_id_unique` ON `todos` (`email_message_id`);