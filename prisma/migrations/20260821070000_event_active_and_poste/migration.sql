
-- AlterTable
ALTER TABLE `Event` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `poste` VARCHAR(191) NULL;

