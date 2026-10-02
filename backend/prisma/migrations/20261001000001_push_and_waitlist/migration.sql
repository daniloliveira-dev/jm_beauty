-- Add push outbox and idempotency keys for scheduled jobs.
CREATE TABLE `push_queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notification_id` INTEGER NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `next_attempt` DATETIME(3) NULL,
    `ticket_id` VARCHAR(100) NULL,
    `sent_at` DATETIME(3) NULL,
    `error` TEXT NULL,
    INDEX `push_queue_status_next_attempt_attempts_idx`(`status`, `next_attempt`, `attempts`),
    UNIQUE INDEX `push_queue_notification_id_token_key`(`notification_id`, `token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `job_keys` (
    `key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `services` DROP INDEX `services_name_key`;
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `push_queue` ADD CONSTRAINT `push_queue_notification_id_fkey` FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `push_queue` ADD CONSTRAINT `push_queue_token_fkey` FOREIGN KEY (`token`) REFERENCES `push_devices`(`token`) ON DELETE CASCADE ON UPDATE CASCADE;