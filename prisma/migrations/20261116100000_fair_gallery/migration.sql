-- CreateTable
CREATE TABLE "FairImage" (
    "id" TEXT NOT NULL,
    "fairId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FairImage_fairId_sortOrder_idx" ON "FairImage"("fairId", "sortOrder");

-- CreateIndex
CREATE INDEX "FairImage_mediaId_idx" ON "FairImage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "FairImage_fairId_mediaId_key" ON "FairImage"("fairId", "mediaId");

-- AddForeignKey
ALTER TABLE "FairImage" ADD CONSTRAINT "FairImage_fairId_fkey" FOREIGN KEY ("fairId") REFERENCES "Fair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FairImage" ADD CONSTRAINT "FairImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
