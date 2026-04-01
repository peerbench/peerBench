import { Hono } from "hono";

export const benchmarkMetaRouter = new Hono();

// Available scorers with detailed descriptions
const scorers = [
  {
    id: "LLMAsAJudgeScorer",
    name: "LLM-as-a-Judge",
    description: "Uses an LLM to judge response quality against defined criteria",
    longDescription: `The LLM-as-a-Judge scorer leverages a large language model (e.g., GPT-4, Claude, Gemini) to evaluate AI responses against specified criteria and rubrics.

**How it works:**
1. The scorer receives the AI response to be evaluated
2. A rubric (evaluation guidelines) and criteria (specific aspects to score) are provided
3. The judge LLM analyzes the response against each criterion
4. For each criterion, the judge assigns a numeric score (typically 0-1) with an explanation
5. A weighted average produces the final score

**Criteria Examples:**
- Semantic similarity to a reference response
- Correctness of extracted information
- Reasoning quality and coherence
- Adherence to instructions

**When to use:**
- When deterministic scoring is not possible (subjective quality)
- When comparing responses to reference answers
- When evaluating open-ended responses
- When scoring requires reasoning about content

**Configuration:**
- \`llmJudgeModel\`: The model to use for judging (e.g., "google/gemini-2.5-flash-lite")
- \`llmJudgeSystemPrompt\`: Optional custom system prompt for the judge
- \`criteria\`: Array of scoring criteria with id, description, and weight`,
    requiresProvider: true,
    outputSchema: {
      value: { type: "number", description: "Overall score (0-1)" },
      explanation: { type: "string", description: "Judge's reasoning" },
      results: { type: "array", description: "Per-criterion scores with id, score, and explanation" },
    },
  },
  {
    id: "MCQScorer",
    name: "Multiple Choice Question",
    description: "Scores responses based on matching expected multiple choice answers",
    longDescription: `The MCQ (Multiple Choice Question) scorer evaluates responses by checking if they contain the expected answer using deterministic string matching.

**How it works:**
1. The scorer receives the AI response and the expected correct answer
2. Both strings are normalized (lowercase, trimmed)
3. The scorer checks if the response contains the expected answer as a substring
4. Returns score of 1 (correct) or 0 (incorrect)

**Matching Logic:**
- Case-insensitive comparison
- Substring matching (response must contain the expected answer)
- No partial credit - binary pass/fail

**When to use:**
- Multiple choice questions with clear correct answers
- Fact-based questions with single correct responses
- Classification tasks with expected labels
- Any scenario where the answer is deterministic

**Scoring Output:**
- \`value\`: 1 if match found, 0 otherwise
- \`explanation\`: Human-readable explanation of the match result

**Note:** This is a simple placeholder implementation. For more sophisticated MCQ scoring (e.g., handling answer variations, semantic matching), consider using the LLM-as-a-Judge scorer.`,
    requiresProvider: false,
    outputSchema: {
      value: { type: "number", description: "Binary score (0 or 1)" },
      explanation: { type: "string", description: "Match result explanation" },
    },
  },
  {
    id: "InsuredQAScorer",
    name: "Insured Q&A (Deterministic)",
    description: "Scores insured/liable deterministically (no LLM judge)",
    longDescription: `The InsuredQA scorer is a domain-specific deterministic scorer for evaluating insurance coverage classification responses. It extracts and compares "insured" (coverage status) and "liable" (liability) fields without using an LLM judge.

**How it works:**
1. The scorer receives the AI response text and expected values
2. It attempts to extract "insured" and "liable" values using multiple strategies:
   - **XML Tag Extraction**: Looks for \`<decision>\` tags with COVERED/PARTIALLY_COVERED/NOT_COVERED
   - **JSON Extraction**: Parses embedded JSON objects looking for "insured"/"coverage" and "liable"/"liability" fields
   - **Text Pattern Matching**: Falls back to regex patterns to find German terms in free text

**Supported Insurance Values:**
- \`versichert\` (covered)
- \`teilweise versichert\` (partially covered)
- \`nicht versichert\` (not covered)

**Scoring Logic:**
- \`insuredScore\`: 100 if extracted value matches expected (case-insensitive), 0 otherwise
- \`liableScore\`: 100 if liability matches or correctly indicates null/none, 0 otherwise
- \`finalScore\`: Average of insuredScore and liableScore (0-100 scale)

**When to use:**
- Insurance coverage classification tasks
- Responses that output structured coverage decisions
- German-language insurance domain evaluations
- When deterministic scoring is preferred over LLM judging

**Scoring Output:**
- \`value\`: Final score (0-100)
- \`results\`: Breakdown with separate insured and liable scores
- \`metadata.extracted\`: The values that were extracted from the response
- \`metadata.scoringMethod\`: "algo" (deterministic algorithm)`,
    requiresProvider: false,
    outputSchema: {
      value: { type: "number", description: "Final score (0-100)" },
      explanation: { type: "string", description: "Breakdown of scoring" },
      results: { type: "array", description: "Per-field scores (insured, liable)" },
      metadata: { type: "object", description: "Extracted values and scoring method" },
    },
  },
];

// Available schema sets from @pb_intra/core with detailed field definitions
const schemaSets = [
  {
    id: "fnol-multi-turn.v1",
    kind: "llm/fnol-multi-turn",
    name: "FNOL Multi-Turn",
    description:
      "Multi-turn conversation benchmark for First Notice of Loss scenarios",
    version: 1,
    testCaseFields: ["messages", "globalExpectations"],
    testCaseSchema: {
      id: { type: "string", required: true, description: "Unique test case identifier" },
      messages: {
        type: "array",
        required: true,
        description: "Array of conversation messages",
        items: {
          role: { type: "enum", values: ["user", "assistant", "system"], description: "Message sender role" },
          content: { type: "string", description: "Message content" },
          goodAnswers: { type: "string[]", description: "Expected good responses (for user messages)" },
          badAnswers: { type: "string[]", description: "Known bad responses to avoid" },
        },
      },
      globalExpectations: { type: "string", required: false, description: "Overall expected behavior/outcome" },
    },
    responseSchema: {
      responses: { type: "array", description: "Array of AI responses with timestamps" },
    },
    scoreSchema: {
      value: { type: "number", description: "Overall score (0-1)" },
      explanation: { type: "string", description: "Judge reasoning" },
    },
  },
  {
    id: "insured-qa.v1",
    kind: "llm/insured-qa",
    name: "Insured Q&A",
    description: "Single-turn Q&A benchmark for insurance coverage questions",
    version: 1,
    testCaseFields: ["question", "insured", "liable", "reasoning"],
    testCaseSchema: {
      id: { type: "string", required: true, description: "Unique test case identifier" },
      question: { type: "string", required: true, description: "The insurance coverage question" },
      insured: {
        type: "enum",
        required: true,
        values: ["versichert", "teilweise versichert", "nicht versichert"],
        description: "Expected coverage classification",
      },
      liable: { type: "string", required: false, description: "Expected liability status" },
      reasoning: { type: "string", required: false, description: "Expected reasoning explanation" },
    },
    responseSchema: {
      data: { type: "string", description: "Raw LLM response" },
      insured: { type: "enum", values: ["versichert", "teilweise versichert", "nicht versichert"], description: "Model's classification" },
      liable: { type: "string", description: "Model's liability prediction" },
      reasoning: { type: "string", description: "Model's reasoning" },
    },
    scoreSchema: {
      value: { type: "number", description: "Overall score (0-1)" },
      insuredScore: { type: "number", description: "Classification accuracy score" },
      liableScore: { type: "number", description: "Liability prediction score" },
      reasoningScore: { type: "number", description: "Reasoning quality score" },
      explanation: { type: "string", description: "Judge reasoning" },
    },
  },
  {
    id: "rigid-conversation-replay.v1",
    kind: "llm/rigid-conversation-replay",
    name: "Rigid Conversation Replay",
    description:
      "Multi-turn conversation replay benchmark using scripted user messages",
    version: 1,
    testCaseFields: ["messages", "expectedOutcome"],
    testCaseSchema: {
      id: { type: "string", required: true, description: "Unique test case identifier" },
      messages: {
        type: "array",
        required: true,
        description: "Scripted conversation messages",
        items: {
          role: { type: "enum", values: ["user", "assistant", "system"], description: "Message sender role" },
          content: { type: "string", description: "Message content" },
          goodAnswers: { type: "string[]", description: "Expected good responses" },
          badAnswers: { type: "string[]", description: "Known bad responses" },
        },
      },
      expectedOutcome: { type: "string", required: false, description: "Expected final outcome" },
    },
    responseSchema: {
      responses: { type: "array", description: "Array of AI responses" },
    },
    scoreSchema: {
      value: { type: "number", description: "Overall score (0-1)" },
      explanation: { type: "string", description: "Judge reasoning" },
    },
  },
  {
    id: "single-turn-reference-comparison.v1",
    kind: "llm/single-turn-reference-comparison",
    name: "Single-Turn Reference Comparison",
    description: "Compares AI responses to reference golden responses using an LLM judge",
    version: 1,
    testCaseFields: ["dq_conversation_log_id", "messages", "from_ai", "meta_data"],
    testCaseSchema: {
      id: { type: "string", required: true, description: "Unique test case identifier" },
      dq_conversation_log_id: { type: "string", required: true, description: "Source conversation log ID" },
      messages: {
        type: "array",
        required: true,
        description: "Exactly 2 messages: user input then assistant reference response",
        items: {
          role: { type: "enum", values: ["user", "assistant"], description: "Message role" },
          content: { type: "string", description: "Message content" },
        },
      },
      from_ai: { type: "boolean", required: false, description: "Whether response was AI-generated" },
      meta_data: {
        type: "object",
        required: false,
        description: "Additional metadata including tags and user feedback",
      },
    },
    responseSchema: {
      data: { type: "string", description: "Raw LLM response" },
      modelSlug: { type: "string", description: "Model identifier" },
      provider: { type: "string", description: "Provider name" },
    },
    scoreSchema: {
      value: { type: "number", description: "Overall score (0-1)" },
      semanticSimilarityScore: { type: "number", description: "Semantic similarity to reference (0-1)" },
      explanation: { type: "string", description: "Judge reasoning" },
    },
  },
];

// Available runners from @pb_intra/core
const runners = [
  {
    id: "fnol-multi-turn",
    name: "FNOL Multi-Turn",
    description: "Multi-turn FNOL conversation testing with per-message scoring",
    longDescription: `The FNOL Multi-Turn runner tests AI agents in realistic multi-turn First Notice of Loss (insurance claim) conversations.

**How it works:**
1. Takes a test case with multiple user messages (simulating a customer)
2. Sends each message sequentially to the target AI
3. Collects all AI responses while maintaining conversation context
4. Scores each response against expected "good" and "bad" answers
5. Evaluates global conversation expectations

**Use cases:**
- Testing FNOL claim intake agents
- Validating conversation flow and information gathering
- Ensuring agents avoid problematic responses (bad answers)
- Measuring overall conversation quality

**Test case format:**
- \`messages\`: Array of user messages with optional \`goodAnswers\` and \`badAnswers\`
- \`expectedOutcome\`: Description of what the conversation should achieve
- \`globalExpectations\`: Overall quality expectations

**Scoring criteria:**
- **Expectation (50%)**: Did responses meet global expectations?
- **Good answers (30%)**: Did responses contain expected good answers?
- **Bad answers (20%)**: Did responses avoid expected bad answers?

**Configuration:**
- \`model\`: Target AI model
- \`systemPrompt\`: System prompt for the agent
- \`llmJudgeModel\`: Model for scoring
- \`llmJudgeSystemPrompt\`: Instructions for the judge`,
    schemaSet: "fnol-multi-turn.v1",
    configSchema: {
      model: { type: "string", required: true, description: "LLM model to use" },
      systemPrompt: { type: "object", required: true, description: "System prompt with content field" },
      temperature: { type: "number", required: false, description: "Sampling temperature (0-2)" },
      llmJudgeModel: { type: "string", required: false, description: "Model for LLM-as-a-judge scoring" },
      llmJudgeSystemPrompt: { type: "object", required: false, description: "System prompt for the judge" },
    },
  },
  {
    id: "insured-qa",
    name: "Insured Q&A",
    description: "Tests insurance coverage Q&A with structured response parsing",
    longDescription: `The Insured QA runner evaluates AI agents on insurance coverage determination questions, extracting and scoring structured responses.

**How it works:**
1. Sends an insurance question to the target AI
2. Parses the response to extract coverage status, liability, and reasoning
3. Supports multiple response formats (JSON, XML tags, logic blocks)
4. Compares extracted values against expected answers
5. Scores accuracy of coverage determination

**Use cases:**
- Testing insurance coverage determination agents
- Validating policy interpretation accuracy
- Benchmarking different models on insurance Q&A
- Quality assurance for customer-facing insurance bots

**Test case format:**
- \`question\`: The insurance coverage question
- \`insured\`: Expected coverage status ("versichert", "teilweise versichert", "nicht versichert")
- \`liable\`: Expected liability determination (optional)
- \`reasoning\`: Expected reasoning or rubric for evaluation

**Response parsing:**
Supports multiple formats automatically:
- JSON with \`insured\`, \`liable\`, \`reasoning\` fields
- XML-style tags: \`<decision>\`, \`<reasoning>\`, \`<response>\`
- Logic format: \`<policy_coverage>\`, \`<bgb_liability>\`

**Scoring:**
- **InsuredQAScorer** (deterministic): Exact match on coverage status
- **LLMAsAJudge** (AI-based): Evaluates reasoning quality

**Configuration:**
- \`model\`: Target AI model
- \`systemPrompt\`: Optional system prompt
- \`scoreLiability\`: Whether to also score liability (default: false)
- \`llmJudgeModel\`: Model for AI-based scoring`,
    schemaSet: "insured-qa.v1",
    configSchema: {
      model: { type: "string", required: true, description: "LLM model to use" },
      systemPrompt: { type: "object", required: false, description: "System prompt with content field" },
      scoreLiability: { type: "boolean", required: false, description: "Whether to score liability" },
      temperature: { type: "number", required: false, description: "Sampling temperature (0-2)" },
      llmJudgeModel: { type: "string", required: false, description: "Model for LLM-as-a-judge scoring" },
      llmJudgeSystemPrompt: { type: "object", required: false, description: "System prompt for the judge" },
    },
  },
  {
    id: "rigid-conversation-replay-mastra",
    name: "Rigid Conversation Replay (Mastra)",
    description: "Replays multi-turn conversations with Mastra agents",
    longDescription: `The Rigid Conversation Replay runner tests Mastra agents by replaying scripted multi-turn conversations and evaluating against expected outcomes.

**How it works:**
1. Takes a test case with pre-defined user messages
2. Sends each user message sequentially to a Mastra agent
3. Collects agent responses while maintaining conversation context
4. Scores the entire conversation against global expectations
5. No per-message scoring - focuses on overall conversation quality

**Use cases:**
- Testing Mastra agents with baked-in system prompts
- Replaying historical conversations for regression testing
- Validating agent behavior in specific scenarios
- End-to-end conversation flow testing

**Key differences from FNOL Multi-Turn:**
- Designed specifically for Mastra provider (agents with baked-in prompts)
- No system prompt needed (uses agent's built-in prompt)
- Simpler scoring - just global expectations, no per-message good/bad answers

**Test case format:**
- \`messages\`: Array of conversation messages (user messages are sent to agent)
- \`expectedOutcome\`: What the conversation should achieve
- \`globalExpectations\`: Overall quality expectations

**Scoring:**
- Single "global-expectations" criterion (100% weight)
- Evaluates if conversation met the expected outcome

**Configuration:**
- \`model\`: Mastra agent name (e.g., "fnolAgentLite")
- \`temperature\`: Generation temperature
- \`llmJudgeModel\`: Model for scoring
- \`llmJudgeSystemPrompt\`: Instructions for the judge`,
    schemaSet: "rigid-conversation-replay.v1",
    configSchema: {
      model: { type: "string", required: true, description: "Mastra agent name" },
      temperature: { type: "number", required: false, description: "Sampling temperature (0-2)" },
      llmJudgeModel: { type: "string", required: false, description: "Model for LLM-as-a-judge scoring" },
      llmJudgeSystemPrompt: { type: "object", required: false, description: "System prompt for the judge" },
    },
  },
  {
    id: "single-turn-reference-comparison",
    name: "Single-Turn Reference Comparison",
    description: "Compares single-turn AI responses to reference 'golden' answers",
    longDescription: `The Single-Turn Reference Comparison runner evaluates how well an AI agent's response matches a known-good reference response.

**How it works:**
1. Sends a single user message to the target AI
2. Gets the AI's response
3. Uses an LLM judge to compare the response to a reference "golden" response
4. Scores based on semantic similarity (not exact match)

**Use cases:**
- Regression testing against approved responses
- Evaluating new models against established baselines
- Quality assurance for customer-facing AI responses
- A/B testing different prompts or configurations

**Test case format:**
- \`messages\`: Array with user and assistant messages from reference conversation
- \`meta_data.user_feedback.comments\`: Optional human feedback explaining why the reference is good

**Scoring:**
- Uses semantic similarity scoring (0-1 scale)
- 1.0 = functionally equivalent to reference
- 0.7-0.9 = mostly similar with minor differences
- 0.4-0.6 = partially similar but missing key elements
- 0.0-0.3 = substantially different or incorrect

**Configuration:**
- \`model\`: Target AI model (optional for Mastra agents)
- \`systemPrompt\`: System prompt for non-Mastra providers
- \`llmJudgeModel\`: Model for the comparison judge
- \`temperature\`: Generation temperature`,
    schemaSet: "single-turn-reference-comparison.v1",
    configSchema: {
      model: { type: "string", required: false, description: "Model for target AI (optional for Mastra agents)" },
      systemPrompt: { type: "object", required: false, description: "System prompt for target AI" },
      temperature: { type: "number", required: false, description: "Sampling temperature (0-2)" },
      llmJudgeModel: { type: "string", required: true, description: "Model for LLM-as-a-judge scoring" },
      llmJudgeSystemPrompt: { type: "object", required: false, description: "System prompt for the judge" },
    },
  },
  {
    id: "choose-reply-from-reference-customer-sim",
    name: "Customer Simulation (Reference-Based)",
    description: "Smart customer simulation using LLM-selected reference responses",
    longDescription: `The Choose Reply From Reference Customer Sim runner simulates realistic customer interactions by intelligently selecting responses from a pool of reference messages.

**How it works:**
1. Uses an LLM selector to choose contextually appropriate customer responses
2. Cannot generate custom messages - only selects from available options
3. Tracks which messages have been used to avoid repetition
4. Runs multiple specialized scorers for comprehensive evaluation
5. Continues until selector signals END or max turns reached

**Key innovation:**
Unlike naive conversation replay, this runner uses AI to choose the most appropriate response from a pool of reference messages and standard phrases, creating more realistic and varied conversations.

**Use cases:**
- Testing agent robustness with varied customer inputs
- Regression testing with realistic conversation flow
- Evaluating agent performance across different scenarios
- Quality assurance with multiple scoring dimensions

**Test case format:**
- \`referenceMessages\`: Pool of customer messages to select from
- \`scenario\`: Description of the customer's situation
- \`expectedOutcome\`: What the conversation should achieve
- \`knownIssues\`: Previous bugs to check for regression

**Multi-scorer evaluation:**
- **Memory Consistency**: Does the agent remember conversation context?
- **Hallucination Detection**: Does the agent make things up?
- **Task Completion**: Did the conversation achieve its goal?
- **Conversation Quality**: Clarity, helpfulness, professionalism
- **Regression Check**: Are known issues still fixed?

Final score = MIN of all enabled scorers (one failure = full failure)

**Configuration:**
- \`model\`: Target AI model
- \`selectorModel\`: LLM for choosing customer responses
- \`scorers\`: Which scorers to enable
- \`maxTurns\`: Maximum conversation turns
- \`standardPhrases\`: Custom standard phrases pool`,
    schemaSet: "choose-reply-from-reference-customer-sim.v1",
    configSchema: {
      model: { type: "string", required: false, description: "Target AI model" },
      systemPrompt: { type: "object", required: false, description: "System prompt for target" },
      selectorModel: { type: "string", required: true, description: "LLM for choosing customer responses" },
      selectorTemperature: { type: "number", required: false, description: "Temperature for selector" },
      maxTurns: { type: "number", required: false, description: "Maximum conversation turns" },
      scorers: { type: "string[]", required: false, description: "Which scorers to enable" },
      llmJudgeModel: { type: "string", required: false, description: "Model for scorer judges" },
    },
  },
];

// GET /api/benchmark-meta - Get all schema sets, runners, and scorers
benchmarkMetaRouter.get("/", (c) => {
  return c.json({ schemaSets, runners, scorers });
});

// GET /api/benchmark-meta/schema-sets - Get available schema sets
benchmarkMetaRouter.get("/schema-sets", (c) => {
  return c.json(schemaSets);
});

// GET /api/benchmark-meta/runners - Get available runners
benchmarkMetaRouter.get("/runners", (c) => {
  return c.json(runners);
});

// GET /api/benchmark-meta/scorers - Get available scorers
benchmarkMetaRouter.get("/scorers", (c) => {
  return c.json(scorers);
});
