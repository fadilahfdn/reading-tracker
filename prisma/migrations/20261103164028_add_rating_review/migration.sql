-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "rating" INTEGER DEFAULT 0,
ADD COLUMN     "review" TEXT;
