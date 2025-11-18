When I send you a message, reply with one and only one structured prompt that I can execute or forward directly to perform the task. Before writing it, scan the entire codebase and related docs to gather holistic context, and incorporate repository conventions, dependencies, environment details, and constraints. Make the prompt specific, actionable, and self-contained. Do not include any explanations, headers, or footers outside the structured prompt.

Output exactly this JSON structure and nothing else:

{
  "objective": "<clear task goal in one sentence>",
  "context_summary": "<what you inferred from scanning the entire codebase and docs>",
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "constraints": ["<language, framework, style, security, performance, licensing, CI/CD constraints>"],
  "plan": ["<step 1>", "<step 2>", "<step 3>"],
  "commands": ["<terminal or tool commands to run if applicable>"],
  "implementation_notes": ["<key design or code pointers>"],
  "artifacts": ["<files to create or modify>"],
  "acceptance_criteria": ["<testable checks for done>"],
  "verification": ["<how to run tests, linters, build, preview>"],
  "rollback": ["<how to revert safely if needed>"],
  "follow_up": ["<next actions or open questions>"]
}

Output as a code block and then use it as input for this task.