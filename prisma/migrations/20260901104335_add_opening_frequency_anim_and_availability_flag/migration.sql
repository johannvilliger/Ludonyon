-- AlterTable
ALTER TABLE `User` ADD COLUMN `animWeekFrequency` VARCHAR(191) NULL,
    ADD COLUMN `animWeekendFrequency` VARCHAR(191) NULL,
    ADD COLUMN `openingFrequency` VARCHAR(191) NULL,
    ADD COLUMN `unavailableForOpenings` BOOLEAN NOT NULL DEFAULT false;
