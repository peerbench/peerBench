UPDATE "prompts"
SET
  "uploader_id" = "hash_registrations"."uploader_id"
FROM
  "hash_registrations"
WHERE
  "hash_registrations"."cid" = "prompts"."hash_cid_registration"
  AND "hash_registrations"."sha256" = "prompts"."hash_sha256_registration"