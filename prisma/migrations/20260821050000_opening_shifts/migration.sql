
-- CreateTable
CREATE TABLE `OpeningShift` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `site` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OpeningShift_date_idx`(`date`),
    UNIQUE INDEX `OpeningShift_date_site_periode_key`(`date`, `site`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpeningShiftAssignee` (
    `id` VARCHAR(191) NOT NULL,
    `shiftId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    INDEX `OpeningShiftAssignee_userId_idx`(`userId`),
    UNIQUE INDEX `OpeningShiftAssignee_shiftId_userId_key`(`shiftId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OpeningShiftAssignee` ADD CONSTRAINT `OpeningShiftAssignee_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `OpeningShift`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpeningShiftAssignee` ADD CONSTRAINT `OpeningShiftAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

