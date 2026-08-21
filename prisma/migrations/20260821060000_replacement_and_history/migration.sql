
-- AlterTable
ALTER TABLE `OpeningShiftAssignee` ADD COLUMN `replacementRequestedAt` DATETIME(3) NULL,
    ADD COLUMN `seekingReplacement` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `VolunteerAvailability` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `slotKey` VARCHAR(191) NOT NULL,

    INDEX `VolunteerAvailability_slotKey_idx`(`slotKey`),
    UNIQUE INDEX `VolunteerAvailability_userId_slotKey_key`(`userId`, `slotKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PushNotificationLog` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `recipients` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PushNotificationLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VolunteerAvailability` ADD CONSTRAINT `VolunteerAvailability_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

