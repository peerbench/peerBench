UPDATE "responses"
SET
  "uploader_id" = "hash_registrations"."uploader_id"
FROM
  "hash_registrations"
WHERE
  "hash_registrations"."cid" = "responses"."hash_cid_registration"
  AND "hash_registrations"."sha256" = "responses"."hash_sha256_registration";

UPDATE "scores"
SET
  "uploader_id" = "hash_registrations"."uploader_id"
FROM
  "hash_registrations"
WHERE
  "hash_registrations"."cid" = "scores"."hash_cid_registration"
  AND "hash_registrations"."sha256" = "scores"."hash_sha256_registration";