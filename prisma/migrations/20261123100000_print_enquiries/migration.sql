-- AlterEnum
ALTER TYPE "EnquiryKind" ADD VALUE 'PRINT';

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN "printCategoryId" TEXT,
ADD COLUMN "printMediaId" TEXT;

-- CreateIndex
CREATE INDEX "Enquiry_printCategoryId_idx" ON "Enquiry"("printCategoryId");

-- CreateIndex
CREATE INDEX "Enquiry_printMediaId_idx" ON "Enquiry"("printMediaId");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_printCategoryId_fkey" FOREIGN KEY ("printCategoryId") REFERENCES "PrintCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_printMediaId_fkey" FOREIGN KEY ("printMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
