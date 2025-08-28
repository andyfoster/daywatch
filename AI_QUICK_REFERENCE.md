# AI Quick Reference - DayWatch Project

## 🚨 CRITICAL WORKFLOW

### Before ANY Code Changes:
1. **Understand the request** - Ask for clarification if unclear
2. **Examine existing code** - Use `codebase-retrieval` and `view` tools
3. **Plan minimal changes** - Identify exactly what needs to change

### After EVERY Code Change:
```bash
npm run test:run
```
**If tests fail → FIX THEM immediately. Never proceed with broken tests.**

## 🔧 Essential Commands

```bash
# Always run after changes
npm run test:run

# Run specific test file
npm run test:run -- tests/filename.test.js

# Run specific test
npm run test:run -- -t "test description"
```

## 📋 Change Checklist

- [ ] Used `codebase-retrieval` to understand context
- [ ] Used `view` to examine files before editing
- [ ] Made minimal, focused changes
- [ ] Followed existing code patterns
- [ ] Added error handling for new functionality
- [ ] Validated inputs appropriately
- [ ] Updated tests if needed
- [ ] **RAN TESTS AND ALL PASS**
- [ ] Verified functionality works in browser

## 🚫 Never Do This

- ❌ Skip running tests after changes
- ❌ Break existing method signatures
- ❌ Remove error handling
- ❌ Ignore input validation
- ❌ Make large, sweeping changes
- ❌ Proceed with failing tests
- ❌ Change code without understanding it

## ✅ Always Do This

- ✅ Run `npm run test:run` after every change
- ✅ Use `codebase-retrieval` before making changes
- ✅ Follow existing patterns and naming conventions
- ✅ Add proper error handling and input validation
- ✅ Make incremental, testable changes
- ✅ Ask for clarification when requirements are unclear

## 🎯 DayWatch Module Structure

- **TimerManager**: Data operations, validation, import/export
- **UIManager**: DOM manipulation, event handling
- **ModalManager**: Modal display and lifecycle
- **SettingsManager**: User preferences

## 🧪 Test Debugging

If tests fail:
1. Read error message carefully
2. Check what you just changed
3. Fix the root cause (don't just make tests pass)
4. Run tests again until all pass

## 📞 When to Ask for Help

- Requirements are unclear or ambiguous
- Multiple approaches are possible
- Changes might break existing functionality
- Tests fail and fix isn't obvious
- Unsure about intended behavior

---

## 🎯 Remember: Quality > Speed

Take time to understand the code, make thoughtful changes, and always test thoroughly. This prevents bugs and maintains the high quality of the DayWatch project.
