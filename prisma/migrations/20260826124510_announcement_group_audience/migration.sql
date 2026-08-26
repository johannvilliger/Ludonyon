-- AlterTable
ALTER TABLE `Announcement` ADD COLUMN `groupId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
