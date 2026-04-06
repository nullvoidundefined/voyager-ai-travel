# Memory Pointer

Cross-project lessons and patterns live in the global memory index at
`~/.claude/global-memory/INDEX.md`. **Read it before starting any
substantive work in this project.**

The global index contains lessons that were expensive to learn the first
time and must not be re-learned in each new project:

- Deployment pitfalls (CORS, CSRF, cookie flags, Vercel env var baking,
  Railway service linkage, Supabase auth gotchas)
- Debugging discipline (test-first fixes, no "deploy to see if it works")
- Parallel-agent orchestration (canary before fan-out)
- Commit discipline (atomic commits, one task per commit)
- Convention files and audit role definitions under `~/.claude/`

If the global index does not exist yet, create it as a structured document
and populate it with whatever lessons you learn in the current session
before ending.

## Voyager-specific memory

Project-scoped memory for Voyager lives at:
`~/.claude/projects/-Users-iangreenough-Desktop-code-personal-production-voyager/memory/`

Read both the global index and the project-scoped memory when picking up
Voyager work.
