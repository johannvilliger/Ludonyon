-- AlterTable
ALTER TABLE `Event` ADD COLUMN `eventTemplateId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `reminderDaysBefore` INTEGER NULL,
    ADD COLUMN `reminderSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `EventTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventTaskTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `eventTemplateId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `daysBeforeEvent` INTEGER NOT NULL,
    `reminderDaysBefore` INTEGER NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_eventTemplateId_fkey` FOREIGN KEY (`eventTemplateId`) REFERENCES `EventTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventTaskTemplate` ADD CONSTRAINT `EventTaskTemplate_eventTemplateId_fkey` FOREIGN KEY (`eventTemplateId`) REFERENCES `EventTemplate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
