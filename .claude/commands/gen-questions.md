# Generate SBA Questions → Supabase

Generate SBA questions and insert them directly into the ammo-assess Supabase database.

## Usage
`/gen-questions [topic details]`

If the user provides topic details as arguments, use them directly. Otherwise ask:
1. **System** (e.g. Gastrointestinal, Respiratory, Cardiovascular)
2. **PBL Block** (e.g. PBL3)
3. **LO number and description** (e.g. LO4 — Describe the management of acute pancreatitis)
4. **Number of questions** (default 8)
5. **Difficulty mix** — default is a spread: ~30% difficulty-1, ~40% difficulty-2, ~30% difficulty-3

## Question generation

Generate questions as a JSON array matching this exact schema:
```json
[
  {
    "id": "q_<8-char-hex>",
    "stem": "Full clinical vignette question stem ending with a clear question",
    "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
    "answer": "A",
    "explanation": "2-3 sentence explanation of the correct answer and why the distractors are wrong",
    "tags": ["system-name", "LO-ref", "difficulty-1"],
    "dateAdded": "YYYY-MM-DD"
  }
]
```

**Rules:**
- `id`: generate as `q_` + 8 random hex chars (use `Math.random().toString(16).slice(2,10)`)
- `stem`: full clinical vignette with age, sex, presenting complaint, relevant history, examination findings, then a single-best-answer question
- `options`: exactly 5 options A–E, all plausible, one clearly correct
- `answer`: single letter A–E
- `tags`: array including the system (lowercase, hyphenated), LO reference (e.g. "PBL3-LO4"), and difficulty level ("difficulty-1", "difficulty-2", or "difficulty-3")
- `dateAdded`: today's date in YYYY-MM-DD format
- Cover a spread of examiner angles across the set: definition, pathophysiology, presentation, investigations, management, complications, distinguishing features, curveball

## Inserting into Supabase

After generating the questions, insert them one by one using curl. For each question `q`:

```bash
curl -s -X POST "https://cxvoqonhsfqemgzikwbr.supabase.co/rest/v1/questions" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dm9xb25oc2ZxZW1nemlrd2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzgxMDgsImV4cCI6MjA4OTc1NDEwOH0.59JLv6iWRSh95TNDHfNemoO5Ou4odsUm84JASMH6-mc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dm9xb25oc2ZxZW1nemlrd2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzgxMDgsImV4cCI6MjA4OTc1NDEwOH0.59JLv6iWRSh95TNDHfNemoO5Ou4odsUm84JASMH6-mc" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"data": <question_json>}'
```

Write all questions to a temp JSON file first, then use a Bash loop to insert them and report how many succeeded.

After inserting, tell the user: how many questions were added, which system/LO they cover, and their IDs.
