CREATE TABLE "house_expense_manager__categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "house_expense_manager__categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager__departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "house_expense_manager__departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager___expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"amount" real NOT NULL,
	"category_id" integer NOT NULL,
	"date" text NOT NULL,
	"payee_id" integer,
	"department_id" integer,
	"payment_method" text DEFAULT 'Cash',
	"notes" text,
	"covered_by_loan" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager__loan_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"month" integer NOT NULL,
	"amount" real NOT NULL,
	"interest" real NOT NULL,
	"principal" real NOT NULL,
	"balance" real NOT NULL,
	"date" text NOT NULL,
	"paid" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager__loans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"amount" real NOT NULL,
	"interest" real NOT NULL,
	"tenure" integer NOT NULL,
	"start_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager__payees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"department_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "house_expense_manager__payees_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "house_expense_manager__prepayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"loan_id" text NOT NULL,
	"date" text NOT NULL,
	"amount" real NOT NULL
);
--> statement-breakpoint
ALTER TABLE "house_expense_manager___expenses" ADD CONSTRAINT "house_expense_manager___expenses_category_id_house_expense_manager__categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."house_expense_manager__categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_expense_manager___expenses" ADD CONSTRAINT "house_expense_manager___expenses_payee_id_house_expense_manager__payees_id_fk" FOREIGN KEY ("payee_id") REFERENCES "public"."house_expense_manager__payees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_expense_manager___expenses" ADD CONSTRAINT "house_expense_manager___expenses_department_id_house_expense_manager__departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."house_expense_manager__departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_expense_manager__loan_payments" ADD CONSTRAINT "house_expense_manager__loan_payments_loan_id_house_expense_manager__loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."house_expense_manager__loans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_expense_manager__payees" ADD CONSTRAINT "house_expense_manager__payees_department_id_house_expense_manager__departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."house_expense_manager__departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_expense_manager__prepayments" ADD CONSTRAINT "house_expense_manager__prepayments_loan_id_house_expense_manager__loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."house_expense_manager__loans"("id") ON DELETE cascade ON UPDATE no action;