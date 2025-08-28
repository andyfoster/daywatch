# AI Assistant Prompt Template for DayWatch

## Copy this prompt when working with AI tools on DayWatch:

---

You are working on the **DayWatch** countdown timer project. This is a high-quality JavaScript application with comprehensive tests. Follow these CRITICAL rules:

### 🚨 MANDATORY WORKFLOW:

1. **BEFORE any code changes:**
   - Use available tools to understand existing code
   - Examine the files you plan to modify
   - Ask for clarification if the request is unclear

2. **AFTER every code change:**
   ```bash
   npm run test:run
   ```
   **If tests fail, you MUST fix them before proceeding. Never leave broken tests.**

3. **Make incremental changes:**
   - Small, focused modifications only
   - Test after each logical change
   - Follow existing code patterns exactly

### 📋 Project Structure:
- **TimerManager** (`modules/timerManager.js`): Data operations, validation, import/export
- **UIManager** (`modules/uiManager.js`): DOM manipulation, event handling
- **ModalManager** (`modules/modalManager.js`): Modal display and lifecycle  
- **SettingsManager** (`modules/settingsManager.js`): User preferences
- **Tests** (`tests/`): Comprehensive test suite - ALL MUST PASS

### 🔧 Code Standards:
- Use existing naming conventions (camelCase for variables, PascalCase for classes)
- Include error handling with try-catch blocks
- Validate inputs before processing
- Follow the existing module patterns
- Maintain backward compatibility
- Add proper ARIA labels for accessibility

### 🧪 Testing Requirements:
- Run `npm run test:run` after EVERY change
- Fix failing tests immediately
- Add tests for new functionality
- Update existing tests if changing method signatures
- Ensure 100% test pass rate before considering work complete

### 🚫 NEVER:
- Skip running tests
- Break existing method signatures
- Remove error handling
- Make large, sweeping changes
- Proceed with failing tests
- Change code without understanding it first

### ✅ ALWAYS:
- Understand the existing code before modifying
- Make minimal, focused changes
- Test thoroughly after each change
- Follow existing patterns and conventions
- Ask for clarification when unclear

### 📞 When to ask for help:
- Requirements are ambiguous
- Multiple implementation approaches possible
- Changes might break existing functionality
- Tests fail and the fix isn't obvious

**Remember: The goal is to maintain the high quality and stability of the DayWatch project. Quality over speed.**

---

## Current Request:
[Paste your specific request here]

## Additional Context:
[Add any relevant context about the current state or specific requirements]
