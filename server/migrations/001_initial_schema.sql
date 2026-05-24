CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  notes text NOT NULL DEFAULT '',
  coolers_issued integer NOT NULL DEFAULT 0 CHECK (coolers_issued >= 0),
  coolers_returned integer NOT NULL DEFAULT 0 CHECK (coolers_returned >= 0),
  bottles_issued integer NOT NULL DEFAULT 0 CHECK (bottles_issued >= 0),
  bottles_returned integer NOT NULL DEFAULT 0 CHECK (bottles_returned >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  CONSTRAINT deliveries_returned_coolers_not_gt_issued CHECK (coolers_returned <= coolers_issued),
  CONSTRAINT deliveries_returned_bottles_not_gt_issued CHECK (bottles_returned <= bottles_issued)
);

CREATE INDEX IF NOT EXISTS deliveries_deleted_at_idx ON deliveries (deleted_at);
CREATE INDEX IF NOT EXISTS deliveries_phone_number_idx ON deliveries (phone_number);
CREATE INDEX IF NOT EXISTS deliveries_customer_name_idx ON deliveries (customer_name);
CREATE INDEX IF NOT EXISTS deliveries_created_at_idx ON deliveries (created_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_updated_at_idx ON deliveries (updated_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_last_action_at_idx ON deliveries (last_action_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_completed_at_idx ON deliveries (completed_at DESC);