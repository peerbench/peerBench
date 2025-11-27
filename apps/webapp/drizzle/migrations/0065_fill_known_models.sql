-- Populate known_models with distinct name/owner pairs from provider_models
INSERT INTO known_models ("name", "owner")
SELECT DISTINCT 
  name, 
  owner
FROM provider_models
WHERE 
  name IS NOT NULL 
  AND owner IS NOT NULL;

-- Link provider_models to their corresponding known_models
UPDATE provider_models
SET known_model_id = known_models.id
FROM known_models
WHERE 
  provider_models.name = known_models.name 
  AND provider_models.owner = known_models.owner
  AND provider_models.known_model_id IS NULL;