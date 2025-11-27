-- Insert Owner role for existing Prompt Sets based on their owners
INSERT INTO
    "user_role_on_prompt_set" ("user_id", "prompt_set_id", "role")
SELECT
    "prompt_sets"."owner_id" AS "user_id",
    "prompt_sets"."id" AS "prompt_set_id",
    'owner' AS "role"
FROM
    "prompt_sets"