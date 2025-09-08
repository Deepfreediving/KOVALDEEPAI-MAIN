## DATABASE ENUM CONSTRAINTS ARE THE PROBLEM

**Issue**: Your Supabase database has enum type constraints that prevent free text input.

**Current Error**:

```
invalid input value for enum dive_discipline: "Constant Weight with bifins - modified technique"
```

**Root Cause**: The database schema defines these fields as ENUMs:

- `dive_discipline` (probably has values like 'CWT', 'CNF', 'FIM')
- `surface_protocol` (unknown values)
- `exit_protocol` (unknown values)

**Why This Is Wrong for Freediving**:

1. ❌ Users can't describe their technique naturally
2. ❌ New disciplines/techniques can't be added
3. ❌ Personal variations are impossible
4. ❌ Cultural/regional differences ignored
5. ❌ OpenAI can't process rich descriptions

**What Users SHOULD Be Able To Write**:

- "Constant Weight with bifins and advanced mouthfill technique"
- "Modified CNF with equalization focus training"
- "Good surface protocol with 30-second recovery, felt strong"
- "Clean exit but rushed final 10 meters due to equalization issues"
- "Competition prep dive with focus on descent rate consistency"

**Solution**:

1. **Remove enum constraints** from the database (run the SQL in fix-database-enums.sql)
2. **Let OpenAI extract structured data** from natural language
3. **Allow personal expression** while maintaining data usefulness

**OpenAI Can Handle This!**:
OpenAI can easily extract:

- Discipline: "CWT" from "Constant Weight with bifins"
- Safety level: "good" from "Good surface protocol with strong recovery"
- Issues: "equalization" from "some equalization problems at 60m"

**The database should store the rich text, OpenAI should extract the insights.**
