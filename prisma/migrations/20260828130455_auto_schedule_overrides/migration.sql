-- CreateTable
CREATE TABLE `AutoScheduleOverride` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `site` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `userIds` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AutoScheduleOverride_date_idx`(`date`),
    UNIQUE INDEX `AutoScheduleOverride_date_site_periode_key`(`date`, `site`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
