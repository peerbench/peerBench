INSERT INTO
  "prompt_sets"
VALUES
  (
    0,
    'Default Unassigned',
    'Catchall prompt set for all public prompts ',
    'c9439eab-d850-46bd-8ae1-211216395732', -- peerBench admin user ID
    DEFAULT,
    DEFAULT,
    true,
    true,
    '',
    'Default',
    'cc-by-4.0',
    null
  ) ON CONFLICT ("id") DO NOTHING;