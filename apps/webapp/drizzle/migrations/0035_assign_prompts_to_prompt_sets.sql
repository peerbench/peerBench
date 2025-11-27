-- Assign all the Prompts to their Prompt Sets
INSERT INTO
    "prompt_set_prompts" ("prompt_set_id", "prompt_id", "status")
SELECT
    "prompts"."prompt_set_id" AS "prompt_set_id",
    "prompts"."id" AS "prompt_id",
    'included' AS "status"
FROM
    "prompts";