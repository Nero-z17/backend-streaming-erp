-- CreateTable
CREATE TABLE "Admin" (
    "id_admin" TEXT NOT NULL PRIMARY KEY,
    "username_admin" TEXT NOT NULL,
    "password_hash_admin" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Clients" (
    "id_clt" TEXT NOT NULL PRIMARY KEY,
    "name_clt" TEXT NOT NULL,
    "whatsapp_number_clt" TEXT NOT NULL,
    "note_clt" TEXT,
    "created_date_clt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_admin" TEXT NOT NULL,
    CONSTRAINT "Clients_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "Admin" ("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Accounts" (
    "id_acct" TEXT NOT NULL PRIMARY KEY,
    "platform_acct" TEXT NOT NULL,
    "email_acct" TEXT NOT NULL,
    "password_acct" TEXT NOT NULL,
    "purchase_price_acct" INTEGER NOT NULL,
    "renewal_date_acct" DATETIME NOT NULL,
    "status_acct" TEXT NOT NULL DEFAULT 'ACTIVE',
    "id_admin" TEXT NOT NULL,
    CONSTRAINT "Accounts_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "Admin" ("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profiles" (
    "id_profil" TEXT NOT NULL PRIMARY KEY,
    "id_acct" TEXT NOT NULL,
    "name_profil" TEXT NOT NULL,
    "pin_code_profil" TEXT,
    CONSTRAINT "Profiles_id_acct_fkey" FOREIGN KEY ("id_acct") REFERENCES "Accounts" ("id_acct") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscriptions" (
    "id_subs" TEXT NOT NULL PRIMARY KEY,
    "id_clt" TEXT NOT NULL,
    "id_profil" TEXT NOT NULL,
    "duration_months_subs" INTEGER NOT NULL,
    "agreed_price_subs" INTEGER NOT NULL,
    "amount_paid_subs" INTEGER NOT NULL,
    "payment_status_subs" TEXT NOT NULL,
    "start_date_subs" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date_subs" DATETIME NOT NULL,
    "status_subs" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "Subscriptions_id_clt_fkey" FOREIGN KEY ("id_clt") REFERENCES "Clients" ("id_clt") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscriptions_id_profil_fkey" FOREIGN KEY ("id_profil") REFERENCES "Profiles" ("id_profil") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expenses" (
    "id_exp" TEXT NOT NULL PRIMARY KEY,
    "date_exp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_exp" TEXT NOT NULL,
    "amount_exp" INTEGER NOT NULL,
    "description_exp" TEXT,
    "id_admin" TEXT NOT NULL,
    CONSTRAINT "Expenses_id_admin_fkey" FOREIGN KEY ("id_admin") REFERENCES "Admin" ("id_admin") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_admin_key" ON "Admin"("username_admin");
