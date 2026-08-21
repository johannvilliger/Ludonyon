
-- AlterTable
ALTER TABLE `Event` ADD COLUMN `agenda` TEXT NULL,
    ADD COLUMN `audience` VARCHAR(191) NOT NULL DEFAULT 'ALL',
    ADD COLUMN `recordingPath` VARCHAR(191) NULL;

