-- CreateTable
CREATE TABLE "AkaziListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posterId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'job',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "categorySlug" TEXT NOT NULL,
    "employment" TEXT NOT NULL DEFAULT 'flexible',
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "payPeriod" TEXT NOT NULL DEFAULT 'negotiable',
    "payMin" INTEGER,
    "payMax" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "neighborhoodSlug" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "applicationCount" INTEGER NOT NULL DEFAULT 0,
    "bumpedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "AkaziListing_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AkaziBookmark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "akaziId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AkaziBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AkaziBookmark_akaziId_fkey" FOREIGN KEY ("akaziId") REFERENCES "AkaziListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AkaziApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "akaziId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AkaziApplication_akaziId_fkey" FOREIGN KEY ("akaziId") REFERENCES "AkaziListing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AkaziApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Image" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "listingId" TEXT,
    "postId" TEXT,
    "akaziId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Image_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Image_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Image_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Image_akaziId_fkey" FOREIGN KEY ("akaziId") REFERENCES "AkaziListing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Image" ("createdAt", "height", "id", "key", "listingId", "mime", "ownerId", "position", "postId", "size", "url", "width") SELECT "createdAt", "height", "id", "key", "listingId", "mime", "ownerId", "position", "postId", "size", "url", "width" FROM "Image";
DROP TABLE "Image";
ALTER TABLE "new_Image" RENAME TO "Image";
CREATE INDEX "Image_listingId_idx" ON "Image"("listingId");
CREATE INDEX "Image_postId_idx" ON "Image"("postId");
CREATE INDEX "Image_akaziId_idx" ON "Image"("akaziId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "AkaziListing_status_kind_idx" ON "AkaziListing"("status", "kind");

-- CreateIndex
CREATE INDEX "AkaziListing_categorySlug_idx" ON "AkaziListing"("categorySlug");

-- CreateIndex
CREATE INDEX "AkaziListing_neighborhoodSlug_idx" ON "AkaziListing"("neighborhoodSlug");

-- CreateIndex
CREATE INDEX "AkaziListing_posterId_idx" ON "AkaziListing"("posterId");

-- CreateIndex
CREATE INDEX "AkaziListing_bumpedAt_idx" ON "AkaziListing"("bumpedAt");

-- CreateIndex
CREATE INDEX "AkaziBookmark_akaziId_idx" ON "AkaziBookmark"("akaziId");

-- CreateIndex
CREATE UNIQUE INDEX "AkaziBookmark_userId_akaziId_key" ON "AkaziBookmark"("userId", "akaziId");

-- CreateIndex
CREATE INDEX "AkaziApplication_akaziId_status_idx" ON "AkaziApplication"("akaziId", "status");

-- CreateIndex
CREATE INDEX "AkaziApplication_applicantId_createdAt_idx" ON "AkaziApplication"("applicantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AkaziApplication_akaziId_applicantId_key" ON "AkaziApplication"("akaziId", "applicantId");
