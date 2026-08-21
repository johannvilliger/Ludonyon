-- Alerte "créneau à risque" pour les responsables/comité
ALTER TABLE `OpeningShiftAssignee` ADD COLUMN `problemAlertSentAt` DATETIME(3) NULL;
