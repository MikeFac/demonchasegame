# Content Generation Guide

Generate Bible verse content for custom game topics using AI.

## Prerequisites

- **Node.js** 18+ (uses native `fetch`)
- **OpenRouter API key** — get one at [openrouter.ai/keys](https://openrouter.ai/keys)

## Quick Start

```bash
# Set your API key
export OPENROUTER_API_KEY=sk-or-v1-...

# Generate 10 verses each for two topics
node scripts/generate_content.js --topics "anxiety,marriage"

# Output to a file instead of stdout
node scripts/generate_content.js --topics "finances,parenting" --output my-verses.csv
```

## Options

| Flag                 | Default                       | Description                                           |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| `--topics`           | _(required)_                  | Comma-separated list of categories to generate        |
| `--count N`          | `10`                          | Number of verses per topic                            |
| `--format csv\|json` | `csv`                         | Output format                                         |
| `--output path`      | stdout                        | Write to file instead of printing                     |
| `--seed path`        | —                             | CSV/JSON of existing verses to show as style examples |
| `--model NAME`       | `google/gemini-2.0-flash-001` | OpenRouter model ID                                   |
| `--dry-run`          | —                             | Show prompts without calling the API                  |

## Examples

### Generate JSON for a single topic

```bash
node scripts/generate_content.js \
  --topics "grief" \
  --count 15 \
  --format json \
  --output grief-verses.json
```

### Use existing verses as style reference

```bash
node scripts/generate_content.js \
  --topics "patience,gratitude" \
  --seed data/verses.csv \
  --output new-verses.csv
```

The seed file provides example verses so the AI matches the format and translation style.

### Dry run (preview prompts, no API calls)

```bash
node scripts/generate_content.js --topics "anger,jealousy" --dry-run
```

### Use a different model

```bash
node scripts/generate_content.js \
  --topics "peace" \
  --model anthropic/claude-3.5-sonnet
```

## Output Format

### CSV (default)

```csv
Reference,Text,Category
John 14:27,"Peace I leave with you, my peace I give unto you...",peace
```

### JSON

```json
[
  {
    "Reference": "John 14:27",
    "Text": "Peace I leave with you, my peace I give unto you...",
    "Category": "peace"
  }
]
```

## Notes

- The script uses **real Bible verses** (KJV/NKJV/NIV) — the AI is prompted not to fabricate
- Progress and errors are printed to **stderr**, verse data goes to **stdout** (so piping works cleanly)
- A 1-second delay is added between topics to stay within rate limits
- If a topic fails, the script continues with the remaining topics
