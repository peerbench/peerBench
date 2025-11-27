-- Create profiles for all users if they don't have yet.
-- This is for the existing users. New profiles will be
-- automatically created by the trigger from `0038_create_profile_for_user.sql`.
INSERT INTO
  "user_profile" ("user_id") (
    SELECT
      "auth"."users"."id"
    FROM
      "auth"."users"
    WHERE
      "auth"."users"."id" not in (
        SELECT
          "user_profile"."user_id"
        FROM
          "user_profile"
      )
  );