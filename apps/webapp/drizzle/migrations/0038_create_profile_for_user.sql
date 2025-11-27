CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"()
RETURNS trigger -- Only used by triggers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO "public"."user_profile" ("user_id") VALUES (NEW."id");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "create_profile_from_auth"
  AFTER INSERT ON "auth"."users"
  FOR EACH ROW EXECUTE FUNCTION "public"."create_profile_for_user"();