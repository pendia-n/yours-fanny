ALTER TABLE purchases ADD COLUMN prepared_upload_ids TEXT;
ALTER TABLE purchases ADD COLUMN prepared_text TEXT;
ALTER TABLE generations ADD COLUMN funding_micros INTEGER NOT NULL DEFAULT 0;
ALTER TABLE generations ADD COLUMN funding_release_at INTEGER;
ALTER TABLE generations ADD COLUMN funding_attempt INTEGER NOT NULL DEFAULT 0;

CREATE INDEX generations_funding_queue ON generations(status,created_at,id);
CREATE INDEX generations_funding_holds ON generations(funding_release_at) WHERE funding_micros > 0;
CREATE INDEX purchases_prepared ON purchases(status) WHERE prepared_upload_ids IS NOT NULL;

CREATE TRIGGER clear_materials_after_submission AFTER INSERT ON generations BEGIN
  UPDATE purchases SET prepared_upload_ids=NULL, prepared_text=NULL WHERE id=NEW.purchase_id;
END;

CREATE TRIGGER clear_materials_after_purchase_close AFTER UPDATE OF status ON purchases
WHEN NEW.status IN ('expired','refunded','service_failed') AND NEW.prepared_upload_ids IS NOT NULL
BEGIN
  UPDATE purchases SET prepared_upload_ids=NULL, prepared_text=NULL WHERE id=NEW.id;
END;
