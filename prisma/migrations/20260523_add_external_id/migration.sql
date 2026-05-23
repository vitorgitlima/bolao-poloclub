ALTER TABLE "Match" ADD COLUMN "externalId" INTEGER;
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");
