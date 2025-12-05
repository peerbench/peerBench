
-- Function to compute all rankings using trust propagation algorithm
CREATE OR REPLACE FUNCTION compute_rankings(
  p_reviews_for_consensus_prompt INTEGER DEFAULT 3,
  p_account_age_days INTEGER DEFAULT 7,
  p_k INTEGER DEFAULT 250,
  p_min_review_percentage REAL DEFAULT 0.1,
  p_max_trust_cap REAL DEFAULT 0.75,
  p_percentile_trust_for_reviewers REAL DEFAULT 0.5,
  p_quality_threshold_prompt REAL DEFAULT 0.5,
  p_reviews_for_quality_prompt INTEGER DEFAULT 1,
  p_min_prompts_for_model_ranking INTEGER DEFAULT 25
) RETURNS INTEGER AS $$
DECLARE
  v_computation_id INTEGER;
  v_trust_threshold REAL;
  v_total_prompts_in_consensus INTEGER;
BEGIN
  -- Create new computation record
  INSERT INTO ranking_computations (parameters)
  VALUES (jsonb_build_object(
    'reviewsForConsensusPrompt', p_reviews_for_consensus_prompt,
    'accountAgeDays', p_account_age_days,
    'k', p_k,
    'minReviewPercentage', p_min_review_percentage,
    'maxTrustCap', p_max_trust_cap,
    'trustPercentile', p_percentile_trust_for_reviewers,
    'qualityThreshold', p_quality_threshold_prompt,
    'reviewsForQualityPrompt', p_reviews_for_quality_prompt,
    'minPromptsForModelRanking', p_min_prompts_for_model_ranking
  ))
  RETURNING id INTO v_computation_id;

  -- ============================================
  -- STEP 1: COMPUTE REVIEWER TRUST
  -- ============================================
  
  -- Check if this is first run (no previous computations exist)
  IF NOT EXISTS (
    SELECT 1 FROM ranking_reviewer_trust 
    LIMIT 1
  ) THEN
    -- FIRST RUN: Initialize trust based on verified org affiliation and account age
    INSERT INTO ranking_reviewer_trust (computation_id, user_id, trust_score)
    SELECT 
      v_computation_id,
      u.id,
      CASE 
        WHEN otp.user_id IS NOT NULL 
          AND u.created_at <= NOW() - INTERVAL '1 day' * p_account_age_days
        THEN 0.5
        ELSE 0.0
      END AS trust_score
    FROM auth.users u
    LEFT JOIN org_to_people otp ON otp.user_id = u.id
    GROUP BY u.id, otp.user_id, u.created_at;
  ELSE
    -- SUBSEQUENT RUNS: Copy previous trust scores and run single iteration
    INSERT INTO ranking_reviewer_trust (computation_id, user_id, trust_score)
    SELECT 
      v_computation_id,
      rrt.user_id,
      rrt.trust_score
    FROM ranking_reviewer_trust rrt
    INNER JOIN (
      SELECT id 
      FROM ranking_computations 
      WHERE id != v_computation_id
      ORDER BY computed_at DESC 
      LIMIT 1
    ) latest ON rrt.computation_id = latest.id;
    
    -- Run single trust propagation iteration
    -- Compute trust threshold (percentile with minimum of 0.5)
    SELECT GREATEST(
      PERCENTILE_CONT(p_percentile_trust_for_reviewers) WITHIN GROUP (ORDER BY trust_score),
      0.5
    )
    INTO v_trust_threshold
    FROM ranking_reviewer_trust
    WHERE computation_id = v_computation_id;

    -- Create temp table for all reviewer opinions
    CREATE TEMP TABLE temp_reviewer_opinions AS
    SELECT 
      qf.user_id,
      qf.prompt_id,
      CASE 
        WHEN qf.opinion = 'positive' THEN 1
        WHEN qf.opinion = 'negative' THEN -1
        ELSE 0
      END AS opinion_value
    FROM quick_feedbacks qf
    WHERE qf.prompt_id IS NOT NULL;

    -- Create temp table for prompt consensus (trust-weighted)
    CREATE TEMP TABLE temp_prompt_consensus AS
    SELECT 
      ro.prompt_id,
      SUM(rrt.trust_score * ro.opinion_value) / NULLIF(SUM(rrt.trust_score), 0) AS consensus
    FROM temp_reviewer_opinions ro
    INNER JOIN prompts p ON p.id = ro.prompt_id
    INNER JOIN prompt_set_prompts psp ON psp.prompt_id = p.id
    INNER JOIN prompt_sets ps ON ps.id = psp.prompt_set_id
    INNER JOIN ranking_reviewer_trust rrt 
      ON rrt.user_id = ro.user_id 
      AND rrt.computation_id = v_computation_id
      AND rrt.trust_score >= v_trust_threshold
    WHERE ps.is_public = true
    GROUP BY ro.prompt_id
    HAVING COUNT(*) >= p_reviews_for_consensus_prompt;

    -- Calculate total prompts in consensus for later use
    SELECT COUNT(DISTINCT prompt_id)
    INTO v_total_prompts_in_consensus
    FROM temp_prompt_consensus;

    -- Create temporary table for new trust scores
    CREATE TEMP TABLE temp_new_trust AS
    WITH user_alignment AS (
      SELECT 
        ro.user_id,
        COUNT(*) AS review_count,
        SUM(
          CASE 
            WHEN SIGN(ro.opinion_value) = SIGN(pc.consensus) THEN 1
            ELSE 0
          END
        )::REAL / NULLIF(COUNT(*), 0) AS alignment_rate
      FROM temp_reviewer_opinions ro
      INNER JOIN temp_prompt_consensus pc ON pc.prompt_id = ro.prompt_id
      WHERE pc.consensus IS NOT NULL
      GROUP BY ro.user_id
    )
    SELECT 
      u.id AS user_id,
      CASE
        WHEN ua.review_count IS NULL THEN rrt.trust_score
        ELSE
          -- Calculate alpha (confidence weight based on sample size)
          LEAST(1, GREATEST(0,
            rrt.trust_score + 
            (ua.review_count::REAL / (ua.review_count + p_k)) * 
            (ua.alignment_rate - rrt.trust_score)
          ))
      END AS new_trust_score,
      ua.review_count
    FROM auth.users u
    LEFT JOIN user_alignment ua ON ua.user_id = u.id
    INNER JOIN ranking_reviewer_trust rrt 
      ON rrt.user_id = u.id 
      AND rrt.computation_id = v_computation_id;

    -- Update trust scores with cap for low-volume reviewers
    UPDATE ranking_reviewer_trust rrt
    SET trust_score = CASE
      WHEN tnt.review_count < (v_total_prompts_in_consensus * p_min_review_percentage)
      THEN LEAST(tnt.new_trust_score, p_max_trust_cap)
      ELSE tnt.new_trust_score
    END
    FROM temp_new_trust tnt
    WHERE rrt.user_id = tnt.user_id 
      AND rrt.computation_id = v_computation_id;

    DROP TABLE temp_new_trust;
    DROP TABLE temp_prompt_consensus;
    DROP TABLE temp_reviewer_opinions;
  END IF;

  -- Compute final threshold for use in quality calculations
  SELECT GREATEST(
    PERCENTILE_CONT(p_percentile_trust_for_reviewers) WITHIN GROUP (ORDER BY trust_score),
    0.5
  )
  INTO v_trust_threshold
  FROM ranking_reviewer_trust
  WHERE computation_id = v_computation_id;

  -- ============================================
  -- STEP 2: COMPUTE PROMPT QUALITY
  -- ============================================
  
  INSERT INTO ranking_prompt_quality (computation_id, prompt_id, quality_score, review_count)
  SELECT 
    v_computation_id,
    qf.prompt_id,
    -- Normalize to [0, 1]
    (
      SUM(
        rrt.trust_score * 
        CASE 
          WHEN qf.opinion = 'positive' THEN 1
          WHEN qf.opinion = 'negative' THEN -1
          ELSE 0
        END
      ) / NULLIF(SUM(rrt.trust_score), 0) + 1
    ) / 2.0 AS quality_score,
    COUNT(*) AS review_count
  FROM quick_feedbacks qf
  INNER JOIN ranking_reviewer_trust rrt 
    ON rrt.user_id = qf.user_id 
    AND rrt.computation_id = v_computation_id
    AND rrt.trust_score >= v_trust_threshold
  WHERE qf.prompt_id IS NOT NULL
  GROUP BY qf.prompt_id
  HAVING COUNT(*) >= p_reviews_for_quality_prompt;

  -- ============================================
  -- STEP 3: COMPUTE BENCHMARK QUALITY
  -- ============================================
  
  INSERT INTO ranking_benchmark_quality (computation_id, prompt_set_id, quality_score)
  SELECT 
    v_computation_id,
    psp.prompt_set_id,
    AVG(rpq.quality_score) AS quality_score
  FROM prompt_set_prompts psp
  INNER JOIN ranking_prompt_quality rpq 
    ON rpq.prompt_id = psp.prompt_id 
    AND rpq.computation_id = v_computation_id
  WHERE psp.status = 'included'
  GROUP BY psp.prompt_set_id
  HAVING COUNT(*) > 0;

  -- ============================================
  -- STEP 4: COMPUTE MODEL PERFORMANCE
  -- ============================================
  
  INSERT INTO ranking_model_performance (computation_id, provider_model_id, score, prompts_tested_count)
  WITH model_prompt_scores AS (
    -- Aggregate multiple responses per model-prompt pair
    SELECT 
      pm.id AS provider_model_id,
      r.prompt_id,
      AVG(s.score) AS avg_score,
      rpq.quality_score,
      rpq.review_count
    FROM responses r
    INNER JOIN scores s ON s.response_id = r.id
    INNER JOIN provider_models pm ON pm.id = r.model_id
    INNER JOIN ranking_prompt_quality rpq 
      ON rpq.prompt_id = r.prompt_id 
      AND rpq.computation_id = v_computation_id
    WHERE rpq.quality_score >= p_quality_threshold_prompt -- Only quality prompts
    GROUP BY pm.id, r.prompt_id, rpq.quality_score, rpq.review_count
  ),
  model_scores AS (
    SELECT 
      provider_model_id,
      prompt_id,
      avg_score AS response_score,
      quality_score * (1 + LN(5.0 * review_count) - LN(5.0)) AS prompt_weight
    FROM model_prompt_scores
  )
  SELECT 
    v_computation_id,
    provider_model_id,
    SUM(response_score * prompt_weight) / NULLIF(SUM(prompt_weight), 0) AS score,
    COUNT(DISTINCT prompt_id) AS prompts_tested_count
  FROM model_scores
  GROUP BY provider_model_id
  HAVING COUNT(*) >= p_min_prompts_for_model_ranking;

  -- ============================================
  -- STEP 5: COMPUTE CONTRIBUTOR SCORES
  -- ============================================
  
  WITH contributor_prompts AS (
    SELECT 
      hr.uploader_id AS user_id,
      COUNT(DISTINCT p.id) AS prompt_count,
      SUM(rpq.quality_score) AS total_prompt_quality
    FROM prompts p
    INNER JOIN hash_registrations hr 
      ON hr.cid = p.hash_cid_registration 
      AND hr.sha256 = p.hash_sha256_registration
    INNER JOIN ranking_prompt_quality rpq 
      ON rpq.prompt_id = p.id 
      AND rpq.computation_id = v_computation_id
    WHERE rpq.quality_score >= p_quality_threshold_prompt
    GROUP BY hr.uploader_id
  ),
  contributor_reviews AS (
    SELECT 
      qf.user_id,
      COUNT(*) AS aligned_review_count
    FROM quick_feedbacks qf
    INNER JOIN ranking_prompt_quality rpq 
      ON rpq.prompt_id = qf.prompt_id 
      AND rpq.computation_id = v_computation_id
    WHERE 
      (qf.opinion = 'positive' AND rpq.quality_score >= p_quality_threshold_prompt) OR
      (qf.opinion = 'negative' AND rpq.quality_score < p_quality_threshold_prompt)
    GROUP BY qf.user_id
  ),
  contributor_comments AS (
    SELECT user_id, COUNT(*) AS comment_count
    FROM (
      SELECT user_id FROM prompt_comments
      UNION ALL
      SELECT user_id FROM response_comments
      UNION ALL
      SELECT user_id FROM score_comments
    ) all_comments
    GROUP BY user_id
  ),
  max_values AS (
    SELECT 
      MAX(COALESCE(cp.total_prompt_quality, 0)) AS max_prompt_quality,
      MAX(COALESCE(cr.aligned_review_count, 0)) AS max_review_count,
      MAX(COALESCE(cc.comment_count, 0)) AS max_comment_count
    FROM auth.users u
    LEFT JOIN contributor_prompts cp ON cp.user_id = u.id
    LEFT JOIN contributor_reviews cr ON cr.user_id = u.id
    LEFT JOIN contributor_comments cc ON cc.user_id = u.id
  )
  INSERT INTO ranking_contributor_score 
    (computation_id, user_id, score, prompt_count, aligned_review_count, comment_count)
  SELECT 
    v_computation_id,
    u.id,
    COALESCE(
      0.7 * COALESCE(cp.total_prompt_quality, 0) / NULLIF(mv.max_prompt_quality, 0),
      0
    ) +
    COALESCE(
      0.2 * COALESCE(cr.aligned_review_count, 0) / NULLIF(mv.max_review_count, 0),
      0
    ) +
    COALESCE(
      0.1 * COALESCE(cc.comment_count, 0) / NULLIF(mv.max_comment_count, 0),
      0
    ) AS score,
    COALESCE(cp.prompt_count, 0),
    COALESCE(cr.aligned_review_count, 0),
    COALESCE(cc.comment_count, 0)
  FROM auth.users u
  CROSS JOIN max_values mv
  LEFT JOIN contributor_prompts cp ON cp.user_id = u.id
  LEFT JOIN contributor_reviews cr ON cr.user_id = u.id
  LEFT JOIN contributor_comments cc ON cc.user_id = u.id
  WHERE 
    cp.user_id IS NOT NULL OR 
    cr.user_id IS NOT NULL OR 
    cc.user_id IS NOT NULL;

  -- ============================================
  -- CLEANUP: Remove old computations (keep last 30 days)
  -- ============================================
  
  DELETE FROM ranking_computations
  WHERE computed_at < NOW() - INTERVAL '30 days'
    AND id != v_computation_id;

  RETURN v_computation_id;
END;
$$ LANGUAGE plpgsql;

-- Create a comment explaining the function
COMMENT ON FUNCTION compute_rankings IS 
'Computes all ranking metrics using trust propagation algorithm.
Trust propagation strategy:
- First run: Bootstrap trust from verified org affiliations (no propagation)
- Subsequent runs: Copy previous trust + single propagation iteration with Bayesian confidence weighting
Parameters:
- p_reviews_for_consensus_prompt: Minimum reviews from trusted reviewers for a prompt to be included in consensus 
- p_account_age_days: Minimum account age in days for initial trust 
- p_k: Virtual sample size for Bayesian shrinkage 
- p_min_review_percentage: Minimum % of prompts reviewed to exceed trust cap 
- p_max_trust_cap: Maximum trust for low-volume reviewers
- p_percentile_trust_for_reviewers: Percentile for trust threshold calculation (default 0.5 = median)
- p_quality_threshold_prompt: Minimum quality score for a prompt to be considered "quality" (default 0.5)
- p_reviews_for_quality_prompt: Minimum reviews needed to calculate prompt quality score
- p_min_prompts_for_model_ranking: Minimum prompts a model must be tested on to appear in rankings
Trust update formula: new_trust = old_trust + alpha * (alignment_rate - old_trust)
  where alpha = review_count / (review_count + k)
All parameters are stored as JSON in the ranking_computations table for version tracking.
Returns: computation_id of the newly created ranking computation';