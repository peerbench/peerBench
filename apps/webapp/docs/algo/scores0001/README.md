# Leaderboard Scoring Algorithms - Version 0001

## Overview

This document describes the scoring algorithms used to rank **Data Contributors** and **Reviewers** in the PeerBench platform. These algorithms are based on the PeerBench paper but adapted for the current system constraints.

## Table of Contents

1. [Contributor Scoring Algorithm](#contributor-scoring-algorithm)
2. [Reviewer Scoring Algorithm](#reviewer-scoring-algorithm)
3. [Coefficients and Configuration](#coefficients-and-configuration)
4. [Example Calculations](#example-calculations)
5. [Edge Cases](#edge-cases)
6. [Implementation Notes](#implementation-notes)
7. [Future Improvements](#future-improvements)

---

## Contributor Scoring Algorithm

### Formula

Based on the PeerBench paper formula:

```
ContributorScore(c) = Σ quality(T_i(c)) + bonuses
```

Where:
- `c` = contributor (user)
- `T_i(c)` = test/prompt i created by contributor c
- `quality(T_i(c))` = quality score for prompt i
- `bonuses` = additional points for verification (e.g., affiliation)

### Adapted Formula

```
ContributorScore(userId) = Σ WeightedQuality(prompt_i) + AffiliationBonus
```

#### Weighted Quality Calculation

For each prompt, the quality score is a weighted average of reviews:

```
quality(prompt) = Σ(opinion_j × reputation_j) / Σ(reputation_j)
```

Where:
- `opinion_j` = +1 for positive review, -1 for negative review
- `reputation_j` = reviewer j's reputation (currently fixed at 1.0 for all reviewers)
- Sum is over all reviews for that prompt

**Minimum Review Threshold**: Prompts with fewer than `minReviewsForQuality` (default: 3) reviews receive a quality score of 0.

#### Affiliation Bonus

```
AffiliationBonus = hasAffiliation ? AFFILIATION_BONUS_POINTS : 0
```

Default: **10 points** for users with an entry in the `org_to_people` table.

### Mathematical Example

**Example Prompt with 4 Reviews:**
- Review 1: positive (+1), reviewer reputation: 1.0
- Review 2: positive (+1), reviewer reputation: 1.0
- Review 3: negative (-1), reviewer reputation: 1.0
- Review 4: positive (+1), reviewer reputation: 1.0

```
quality = (1×1.0 + 1×1.0 + (-1)×1.0 + 1×1.0) / (1.0 + 1.0 + 1.0 + 1.0)
        = (1 + 1 - 1 + 1) / 4
        = 2 / 4
        = 0.5
```

**Contributor with 3 prompts:**
- Prompt A: quality = 0.5
- Prompt B: quality = 0.8
- Prompt C: quality = -0.2

```
qualityScore = 0.5 + 0.8 + (-0.2) = 1.1
affiliationBonus = 10 (has affiliation)
totalScore = 1.1 + 10 = 11.1
```

---

## Reviewer Scoring Algorithm

### Formula

Based on the PeerBench paper formula:

```
ReviewerScore(r) = Pearson({q_r(i)}, {q̄(i)})
```

Where:
- `r` = reviewer
- `q_r(i)` = reviewer r's rating for prompt i
- `q̄(i)` = consensus quality score for prompt i (excluding reviewer r)

### Pearson Correlation Coefficient

The Pearson correlation measures the linear relationship between two variables:

```
r = Σ((x_i - x̄)(y_i - ȳ)) / √(Σ(x_i - x̄)² × Σ(y_i - ȳ)²)
```

Where:
- `x_i` = reviewer's score for prompt i (+1 or -1)
- `y_i` = consensus score for prompt i (average of other reviewers)
- `x̄` = mean of reviewer's scores
- `ȳ` = mean of consensus scores

**Range**: -1 (perfect negative correlation) to +1 (perfect positive correlation)
- **+1**: Reviewer always agrees with consensus (excellent)
- **+0.7 to +1**: Strong agreement (excellent)
- **+0.3 to +0.7**: Moderate agreement (good)
- **0 to +0.3**: Weak agreement (fair)
- **Below 0**: Disagrees with consensus (poor)

### Requirements

- Only prompts with ≥3 reviews are included in consensus calculations
- When calculating consensus for a prompt, the reviewer's own review is excluded
- Reviewers must have ≥ `minReviewsRequired` (default: 5) qualifying reviews to be ranked

### Mathematical Example

**Reviewer has reviewed 5 prompts:**

| Prompt | Reviewer's Opinion | Other Reviewers' Consensus | Reviewer Score (x) | Consensus Score (y) |
|--------|-------------------|---------------------------|-------------------|---------------------|
| A      | positive          | +0.6                      | +1                | +0.6                |
| B      | positive          | +0.8                      | +1                | +0.8                |
| C      | negative          | -0.4                      | -1                | -0.4                |
| D      | positive          | +0.2                      | +1                | +0.2                |
| E      | negative          | -0.6                      | -1                | -0.6                |

**Step 1: Calculate means**
```
x̄ = (+1 + 1 - 1 + 1 - 1) / 5 = 1/5 = 0.2
ȳ = (+0.6 + 0.8 - 0.4 + 0.2 - 0.6) / 5 = 0.6/5 = 0.12
```

**Step 2: Calculate deviations and products**

| i | x_i | y_i  | (x_i - x̄) | (y_i - ȳ) | (x_i - x̄)(y_i - ȳ) | (x_i - x̄)² | (y_i - ȳ)² |
|---|-----|------|-----------|-----------|-------------------|-----------|-----------|
| A | +1  | +0.6 | +0.8      | +0.48     | +0.384            | 0.64      | 0.2304    |
| B | +1  | +0.8 | +0.8      | +0.68     | +0.544            | 0.64      | 0.4624    |
| C | -1  | -0.4 | -1.2      | -0.52     | +0.624            | 1.44      | 0.2704    |
| D | +1  | +0.2 | +0.8      | +0.08     | +0.064            | 0.64      | 0.0064    |
| E | -1  | -0.6 | -1.2      | -0.72     | +0.864            | 1.44      | 0.5184    |

**Step 3: Calculate Pearson correlation**
```
numerator = Σ(x_i - x̄)(y_i - ȳ) = 0.384 + 0.544 + 0.624 + 0.064 + 0.864 = 2.48

Σ(x_i - x̄)² = 0.64 + 0.64 + 1.44 + 0.64 + 1.44 = 4.8
Σ(y_i - ȳ)² = 0.2304 + 0.4624 + 0.2704 + 0.0064 + 0.5184 = 1.488

denominator = √(4.8 × 1.488) = √7.1424 = 2.673

r = 2.48 / 2.673 = 0.928
```

**Result**: Pearson correlation = **0.928** (excellent alignment with consensus)

---

## Coefficients and Configuration

### Contributor Coefficients

| Coefficient | Default Value | Description |
|------------|---------------|-------------|
| `affiliationBonusPoints` | 10 | Bonus points for having organizational affiliation |
| `qualityWeight` | 0.7 | Weight for prompt quality (from paper, for future use) |
| `reputationWeight` | 0.3 | Weight for contributor reputation (from paper, for future use) |
| `reputationCap` | 2 | Maximum reputation multiplier (from paper, for future use) |
| `minReviewsForQuality` | 3 | Minimum reviews needed for a prompt to have a quality score |

### Reviewer Coefficients

| Coefficient | Default Value | Description |
|------------|---------------|-------------|
| `minReviewsRequired` | 5 | Minimum reviews needed for a reviewer to be ranked |

---

## Edge Cases

### 1. Prompt with No Reviews
**Scenario**: A prompt has 0 reviews.
**Handling**: Quality score = 0. Contributes nothing to contributor's total score.

### 2. Prompt with < 3 Reviews
**Scenario**: A prompt has 1 or 2 reviews.
**Handling**: Quality score = 0 (below minimum threshold).

### 3. Reviewer with < 5 Reviews
**Scenario**: A reviewer has only 4 qualifying reviews.
**Handling**: Excluded from reviewer leaderboard entirely.

### 4. All Reviews are Positive or All Negative
**Scenario**: All reviews for a prompt are identical.
**Handling**:
- All positive: quality = +1.0
- All negative: quality = -1.0
- No issue with calculation.

### 5. Zero Variance in Reviewer Scores or Consensus
**Scenario**: Reviewer gives same opinion to all prompts (e.g., all positive).
**Handling**: Pearson correlation = 0 (standard deviation is 0, formula returns 0).

### 6. User with No Prompts
**Scenario**: A user exists but has created no prompts.
**Handling**:
- Quality score = 0
- May still get affiliation bonus
- Total score = affiliation bonus only

### 7. Two-Person Consensus
**Scenario**: A prompt has exactly 3 reviews. When calculating consensus for one reviewer, only 2 other reviews remain.
**Handling**: This is allowed (minimum 2 other reviewers for consensus).

---

## Implementation Notes

### Current Limitations

1. **No Iterative Reputation Updates**: Reviewer reputations are currently fixed at 1.0. In the full paper implementation, reviewer reputations would be calculated from previous iterations and used to weight their opinions.

2. **No Test Weight Calculation**: The paper includes a formula for weighting tests:
   ```
   w(T(c)) = max(0, 0.7 × quality(T(c)) + 0.3 × min(2, ρ_c/100))
   ```
   This is not yet implemented but coefficients are included for future use.

3. **Opinion Mapping**: Our system only supports binary feedback:
   - `positive` → +1
   - `negative` → -1

   The paper uses a scale of {-1, 0, 1, 2}, which is not available in our current schema.

4. **All Calculations Client-Side**: Currently, all calculations happen in the browser. No scores are persisted to the database.

### Deviations from Paper

| Paper Requirement | Our Implementation | Reason |
|------------------|-------------------|--------|
| Opinion scale: -1, 0, 1, 2 | Opinion scale: -1, 1 | Existing schema uses binary ENUM |
| Dynamic reviewer reputation | Fixed reputation = 1.0 | Bootstrap problem, will iterate in future |
| Test weight formula | Not yet used | Not needed for ranking contributors |
| Stored in database | Client-side only | Phase 1 is experimentation only |

---

## Example Calculations

### Full Example: Small Dataset

**Users:**
- Alice (has affiliation)
- Bob (no affiliation)
- Carol (has affiliation)

**Prompts:**
- Prompt 1: by Alice
- Prompt 2: by Alice
- Prompt 3: by Bob

**Reviews:**
- Prompt 1: +1 (Bob), +1 (Carol), -1 (Dave) → quality = 1/3 = 0.33
- Prompt 2: +1 (Bob), +1 (Carol), +1 (Dave) → quality = 3/3 = 1.0
- Prompt 3: -1 (Alice), -1 (Carol) → only 2 reviews → quality = 0 (below threshold)

**Contributor Scores:**

Alice:
```
qualityScore = 0.33 + 1.0 = 1.33
affiliationBonus = 10
totalScore = 11.33
```

Bob:
```
qualityScore = 0 (only prompt has < 3 reviews)
affiliationBonus = 0
totalScore = 0
```

**Contributor Leaderboard:**
1. Alice: 11.33
2. Bob: 0.00

**Reviewer Scores:**

Assuming all reviewers have ≥5 qualifying reviews, calculate Pearson correlation for each based on their alignment with consensus.

---

## Future Improvements

1. **Iterative Reputation Calculation**
   - Use previous leaderboard results to calculate reviewer reputations
   - Weight opinions by reviewer quality in subsequent iterations
   - Converge to stable scores

2. **Time Decay**
   - Weight recent reviews more heavily than old ones
   - Prevent stale high scores from outdated contributions

3. **Multi-Scale Opinions**
   - Support richer feedback beyond binary positive/negative
   - Align with paper's -1, 0, 1, 2 scale

4. **Test Weight Formula**
   - Implement full paper formula for weighting prompts
   - Use in model leaderboard calculations

5. **Cross-Validation**
   - Compare scores against external benchmarks
   - Adjust coefficients based on validation results

6. **Database Persistence**
   - Store calculated scores in database tables
   - Enable historical tracking and analysis
   - Support public leaderboard displays

7. **Automated Recalculation**
   - Trigger score updates when new reviews are submitted
   - Real-time or scheduled batch updates

8. **Cabal Detection**
   - Identify and penalize voting rings
   - Use graph analysis to detect suspicious patterns
   - Adjust scores or remove malicious actors

---

## References

- **PeerBench Paper**: Section 4.2 - Three Leaderboards
- **Implementation**: `/src/lib/leaderboard/`
- **Admin Interface**: `/simScores001`

---

*Document Version: 0001*
*Last Updated: 2025-01-04*
*Algorithm Status: Experimental - Client-side only*
