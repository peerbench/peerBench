# User Score System - Version 0002

## Overview

The **User Score** is a comprehensive metric that measures a user's overall contribution and engagement in the PeerBench community. Unlike the contributor and reviewer leaderboards (scores0001), which rank specific activities, the User Score combines multiple dimensions of participation into a single holistic score.

## Philosophy

The User Score rewards:
- **Quality over quantity**: Creating good prompts that challenge AI models
- **Community engagement**: Reviewing others' work and collaborating
- **Consistency**: Sustained contributions over time
- **Diversity**: Engaging with multiple benchmarks and contributors
- **Impact**: Creating tests that reveal model weaknesses

---

## Table of Contents

1. [Scoring Formula](#scoring-formula)
2. [One-Time Bonuses](#one-time-bonuses)
3. [Continuous Point Components](#continuous-point-components)
4. [Detailed Metrics](#detailed-metrics)
5. [Default Coefficients](#default-coefficients)
6. [Example Calculations](#example-calculations)
7. [Implementation Notes](#implementation-notes)

---

## Scoring Formula

```
UserScore = Σ(OneTimeBonuses) + Σ(ContinuousPoints)

Total = affiliationBonus
      + benchmarkCreatorBonus
      + diverseFeedbackBenchmarksBonus
      + diverseFeedbackUsersBonus
      + qualityPromptsBonus
      + difficultPromptsBonus
      + sotaDifficultPromptsBonus
      + hIndexScore
      + qualityPromptsScore
      + feedbackActivityScore
      + collaborationScore
      + (optional: diversityBonus, consistencyBonus, etc.)
```

---

## One-Time Bonuses

### 1. Affiliation Bonus
**Condition**: User has university or research organization affiliation
**Check**: Entry exists in `org_to_people` table
**Default Points**: **50**

**Rationale**: Verified affiliations provide credibility and reduce spam/sockpuppet accounts.

---

### 2. Benchmark Creator Bonus
**Condition**: User has created a prompt_set (benchmark) with 3+ different contributors
**Check**:
- User is owner of at least one prompt_set
- That prompt_set has prompts from ≥3 distinct uploaders

**Default Points**: **100**

**Rationale**: Creating a collaborative benchmark requires organizational skills and community building.

---

### 3. Diverse Feedback (Benchmarks) Bonus
**Condition**: User has given feedback on prompts in 3+ different prompt_sets
**Check**: User's quick_feedbacks span ≥3 distinct prompt_sets
**Default Points**: **30**

**Rationale**: Engaging across multiple benchmarks shows broad community participation.

---

### 4. Diverse Feedback (Users) Bonus
**Condition**: User has given feedback on prompts from 5+ different users
**Check**: User's quick_feedbacks cover prompts from ≥5 distinct creators
**Default Points**: **40**

**Rationale**: Reviewing diverse contributors helps the entire ecosystem.

---

### 5. Quality Prompts Bonus
**Condition**: User has created 3 prompts that each have ≥3 positive feedbacks
**Check**:
- User has ≥3 prompts
- Each has ≥3 feedbacks with `opinion = 'positive'`

**Default Points**: **75**

**Rationale**: Consistently creating well-received prompts demonstrates quality.

---

### 6. Difficult Prompts Bonus
**Condition**: User has created 3 prompts with:
- ≥3 positive feedbacks each
- ≥3 AI models scored <0.5 (wrong answer)

**Check**:
- User has ≥3 prompts meeting criteria
- For each prompt: count responses with score <0.5
- Must have ≥3 such responses per prompt

**Default Points**: **100**

**Rationale**: Creating challenging prompts that reveal model weaknesses is valuable.

---

### 7. SOTA Difficult Prompts Bonus
**Condition**: User has created 3 prompts with:
- ≥3 positive feedbacks each
- ≥3 **state-of-the-art** models scored <0.5

**SOTA Models (Default List)**:
- Claude Sonnet 4.5
- GPT-4o
- GPT-o1
- Gemini 2.0 Flash
- Gemini 2.0 Pro (when available)
- DeepSeek V3

**Default Points**: **150**

**Rationale**: Challenging the best models is especially impactful for advancing AI evaluation.

---

## Continuous Point Components

### 8. H-Index Score
**Formula**: `hIndexScore = h² × coefficient`

**H-Index Definition**:
A user has an h-index of `h` if they have created `h` prompts that have each received at least `h` positive feedbacks.

**Example**:
- User has 10 prompts
- Positive feedback counts: [15, 12, 8, 6, 5, 4, 3, 2, 1, 0]
- H-index = 5 (5 prompts with ≥5 positive feedbacks)
- Score = 5² × 2 = 50 points

**Default Coefficient**: **2** (quadratic scaling rewards sustained quality)

**Rationale**: Adapted from academic h-index, rewards both quantity and quality.

---

### 9. Quality Prompts Score
**Formula**: `qualityPromptsScore = count × coefficient`

**Definition**: Number of prompts with ≥3 positive feedbacks

**Default Coefficient**: **5** points per prompt

**Rationale**: Linear scaling for reaching quality threshold.

---

### 10. Feedback Activity Score
**Formula**: `feedbackActivityScore = totalFeedbacks × coefficient`

**Definition**: Total number of quick_feedbacks given by user

**Default Coefficient**: **0.5** points per feedback

**Rationale**: Encourages community participation but prevents gaming through spam.

---

### 11. Collaboration Score
**Formula**: `collaborationScore = collaboratorCount × coefficient`

**Definition**:
- Count unique users who contributed prompts to benchmarks where this user is owner/admin
- Includes co-authors via `user_role_on_prompt_set`

**Default Coefficient**: **10** points per collaborator

**Rationale**: Building collaborative benchmarks strengthens the ecosystem.

---

## Additional Proposed Metrics

### 12. Diversity Bonus (Optional)
**Formula**: `diversityScore = categoriesCount × coefficient`

**Definition**: Number of distinct categories user has contributed prompts to

**Default Coefficient**: **8** points per category

**Rationale**: Breadth of expertise adds value.

---

### 13. Consistency Bonus (Optional)
**Formula**: `consistencyScore = activeMonths × coefficient`

**Definition**: Number of months with at least one contribution (prompt or feedback)

**Default Coefficient**: **3** points per month

**Rationale**: Sustained engagement over time.

---

### 14. Comment Engagement (Optional)
**Formula**: `commentScore = commentCount × coefficient`

**Definition**: Number of comments made on prompts/responses/scores

**Default Coefficient**: **1** point per comment

**Rationale**: Discussion improves prompt quality through iteration.

---

### 15. Cross-Review Quality (Optional)
**Integration**: Use reviewer Pearson correlation from scores0001

**Formula**: `reviewQualityBonus = pearsonCorrelation × coefficient`

**Default Coefficient**: **50** (if correlation ≥ 0.7)

**Rationale**: Good reviewers get bonus points on their user score.

---

## Default Coefficients

```typescript
const DEFAULT_USER_SCORE_CONFIG = {
  // One-time bonuses
  affiliationBonus: 50,
  benchmarkCreatorBonus: 100,
  diverseFeedbackBenchmarksBonus: 30,
  diverseFeedbackUsersBonus: 40,
  qualityPromptsBonus: 75,
  difficultPromptsBonus: 100,
  sotaDifficultPromptsBonus: 150,

  // Continuous components coefficients
  hIndexCoefficient: 2,
  qualityPromptsCoefficient: 5,
  feedbackActivityCoefficient: 0.5,
  collaborationCoefficient: 10,

  // Optional bonuses
  diversityCoefficient: 8,
  consistencyCoefficient: 3,
  commentCoefficient: 1,
  reviewQualityCoefficient: 50,

  // Thresholds
  minPositiveFeedbacks: 3,
  minBenchmarkContributors: 3,
  minFeedbackBenchmarks: 3,
  minFeedbackUsers: 5,
  minQualityPrompts: 3,
  minDifficultPrompts: 3,
  wrongAnswerThreshold: 0.5,

  // SOTA model list (configurable)
  sotaModels: [
    'claude-sonnet-4.5',
    'gpt-4o',
    'gpt-o1',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'deepseek-v3'
  ]
}
```

---

## Example Calculations

### Example 1: Active Contributor

**User Profile**:
- Has university affiliation ✓
- Created 1 benchmark with 5 contributors ✓
- Given feedback in 4 different benchmarks ✓
- Reviewed prompts from 8 different users ✓
- Created 20 prompts total
  - 12 have ≥3 positive feedbacks
  - 5 have ≥3 positive feedbacks AND stumped ≥3 models
  - 2 have ≥3 positive feedbacks AND stumped ≥3 SOTA models
- Given 150 feedbacks total
- Has 4 collaborators on owned benchmarks
- H-index: 7 (7 prompts with 7+ positive feedbacks)

**Score Calculation**:

```
One-Time Bonuses:
  affiliationBonus              = 50
  benchmarkCreatorBonus         = 100
  diverseFeedbackBenchmarksBonus = 30
  diverseFeedbackUsersBonus     = 40
  qualityPromptsBonus           = 75  (has ≥3)
  difficultPromptsBonus         = 100 (has ≥3)
  sotaDifficultPromptsBonus     = 0   (only has 2, needs 3)

  Subtotal = 395 points

Continuous Components:
  hIndexScore        = 7² × 2    = 98
  qualityPromptsScore = 12 × 5   = 60
  feedbackActivityScore = 150 × 0.5 = 75
  collaborationScore = 4 × 10    = 40

  Subtotal = 273 points

TOTAL = 395 + 273 = 668 points
```

---

### Example 2: Casual Contributor

**User Profile**:
- No affiliation
- Never created a benchmark
- Given feedback in 2 benchmarks
- Reviewed prompts from 3 users
- Created 5 prompts
  - 2 have ≥3 positive feedbacks
  - 0 difficult prompts
- Given 20 feedbacks
- No collaborations
- H-index: 2

**Score Calculation**:

```
One-Time Bonuses:
  All = 0 (doesn't meet any thresholds)

Continuous Components:
  hIndexScore        = 2² × 2    = 8
  qualityPromptsScore = 2 × 5    = 10
  feedbackActivityScore = 20 × 0.5 = 10
  collaborationScore = 0         = 0

  Subtotal = 28 points

TOTAL = 0 + 28 = 28 points
```

---

### Example 3: Elite Contributor

**User Profile**:
- Has affiliation ✓
- Created 3 benchmarks with 5+ contributors each ✓
- Feedback in 10 benchmarks ✓
- Reviewed prompts from 25 users ✓
- Created 50 prompts
  - 40 have ≥3 positive feedbacks
  - 20 difficult prompts
  - 8 SOTA difficult prompts
- Given 500 feedbacks
- 15 collaborators
- H-index: 15

**Score Calculation**:

```
One-Time Bonuses:
  affiliationBonus              = 50
  benchmarkCreatorBonus         = 100
  diverseFeedbackBenchmarksBonus = 30
  diverseFeedbackUsersBonus     = 40
  qualityPromptsBonus           = 75
  difficultPromptsBonus         = 100
  sotaDifficultPromptsBonus     = 150

  Subtotal = 545 points

Continuous Components:
  hIndexScore        = 15² × 2   = 450
  qualityPromptsScore = 40 × 5   = 200
  feedbackActivityScore = 500 × 0.5 = 250
  collaborationScore = 15 × 10   = 150

  Subtotal = 1,050 points

TOTAL = 545 + 1,050 = 1,595 points
```

---

## Implementation Notes

### Data Requirements

**Existing Tables Used**:
- `auth.users` - User identification
- `org_to_people` - Affiliation verification
- `prompt_sets` - Benchmark ownership
- `prompts` - Prompt creation
- `quick_feedbacks` - Feedback activity
- `responses` - Model responses
- `scores` - Model scores on prompts
- `hash_registrations` - Prompt creators
- `user_role_on_prompt_set` - Collaborators
- `prompt_set_prompts` - Benchmark membership

**No New Tables Required**: All data comes from existing schema.

---

### Calculation Steps

1. **For each user**:
   - Check affiliation (one query)
   - Get owned benchmarks and count unique contributors (one query)
   - Get feedback activity across benchmarks/users (one query)
   - Get created prompts with feedback counts (one query)
   - Get created prompts with model scores (one query)
   - Calculate H-index from feedback distribution
   - Sum all bonuses and continuous components

2. **Optimization**:
   - Batch queries where possible
   - Cache model classifications (SOTA vs non-SOTA)
   - Pre-compute aggregates for large datasets

---

### Edge Cases

1. **User with no activity**: Score = 0
2. **User with only feedbacks, no prompts**: Gets feedback activity score only
3. **User with only prompts, no feedbacks**: Gets prompt-based scores only
4. **SOTA model list changes**: Recalculation may change scores (document version)
5. **Threshold gaming**: Monitor for suspicious patterns (e.g., exactly 3 prompts with exactly 3 feedbacks)

---

### Version Tracking

- **Algorithm Version**: scores0002-v1
- **SOTA Model List Version**: 2025-01-04
- **Last Updated**: 2025-01-04

When SOTA models or coefficients change, document in changelog.

---

## Comparison to Other Systems

### vs. Contributor Leaderboard (scores0001)
- **Contributor**: Focuses on prompt quality via weighted reviews
- **User Score**: Holistic measure including engagement, collaboration, impact

### vs. Reviewer Leaderboard (scores0001)
- **Reviewer**: Measures alignment with consensus (Pearson correlation)
- **User Score**: Includes review activity but not quality (optional integration)

### Combined View
A user could rank:
- High on User Score (broad engagement)
- High on Contributor (quality prompts)
- High on Reviewer (good judgment)

Or specialize in one dimension.

---

## Future Enhancements

1. **Time Decay**: Recent activity weighted higher
2. **Penalty System**: Subtract points for flagged content
3. **Reputation Tiers**: Bronze/Silver/Gold based on score ranges
4. **Achievement System**: Badges for specific milestones
5. **Cross-Validation**: Compare scores against external reputation systems
6. **Dynamic SOTA List**: Auto-update from overall model rankings
7. **Peer Nominations**: Bonus for community-recognized contributions
8. **Impact Factor**: Weight by downstream usage of benchmarks

---

## References

- **H-Index**: Hirsch, J.E. (2005). "An index to quantify an individual's scientific research output"
- **PeerBench Paper**: Section 4 - Leaderboards and Reputation
- **scores0001**: Contributor and Reviewer algorithms
- **Implementation**: `/src/lib/userScore/`

---

*Document Version: 0002-v1*
*Last Updated: 2025-01-04*
*Algorithm Status: Experimental - Client-side only*
