-- CreateTable
CREATE TABLE "tst_dummy_delete_me" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_dummy_delete_me_pkey" PRIMARY KEY ("id")
);
