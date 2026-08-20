-- AlterTable
ALTER TABLE `Event` ADD COLUMN `paid` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `AttendanceSession` (
    `id` VARCHAR(191) NOT NULL,
    `eventSignupId` VARCHAR(191) NOT NULL,
    `arrivedAt` DATETIME(3) NOT NULL,
    `leftAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttendanceSession_eventSignupId_idx`(`eventSignupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AttendanceSession` ADD CONSTRAINT `AttendanceSession_eventSignupId_fkey` FOREIGN KEY (`eventSignupId`) REFERENCES `EventSignup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
