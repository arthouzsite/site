-- CreateTable
CREATE TABLE "PrintCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintImage" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrintImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintCategory_slug_key" ON "PrintCategory"("slug");

-- CreateIndex
CREATE INDEX "PrintImage_categoryId_sortOrder_idx" ON "PrintImage"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "PrintImage_mediaId_idx" ON "PrintImage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "PrintImage_categoryId_mediaId_key" ON "PrintImage"("categoryId", "mediaId");

-- AddForeignKey
ALTER TABLE "PrintImage" ADD CONSTRAINT "PrintImage_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PrintCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintImage" ADD CONSTRAINT "PrintImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
