# AI Coding Standards for DayWatch Project

## 🎯 Overview

This document provides strict guidelines for AI assistants (Claude, GPT, Aider, Roocode, etc.) working on the DayWatch countdown timer project. Following these standards ensures code quality, prevents breaking changes, and maintains project integrity.

## 🚨 CRITICAL RULES - NEVER BREAK THESE

### 1. **ALWAYS RUN TESTS AFTER CHANGES**
```bash
# After ANY code change, run:
npm run test:run

# If tests fail, FIX THEM before proceeding
# Never leave broken tests
```

### 2. **NEVER EDIT FILES WITHOUT UNDERSTANDING**
- Use `codebase-retrieval` to understand existing code before making changes
- Use `view` tool to examine files before editing
- Ask for clarification if the request is unclear

### 3. **PRESERVE EXISTING FUNCTIONALITY**
- Never remove or break existing features
- Maintain backward compatibility
- Test all related functionality after changes

### 4. **INCREMENTAL CHANGES ONLY**
- Make small, focused changes
- One feature/fix per session when possible
- Test after each logical change

## 📋 Pre-Change Checklist

Before making ANY code changes:

1. **Understand the Request**
   - [ ] Clarify ambiguous requirements
   - [ ] Identify affected files and components
   - [ ] Check for potential breaking changes

2. **Examine Current Code**
   - [ ] Use `codebase-retrieval` for context
   - [ ] Use `view` to examine relevant files
   - [ ] Understand existing patterns and architecture

3. **Plan the Changes**
   - [ ] Identify minimal changes needed
   - [ ] Consider impact on tests
   - [ ] Plan testing strategy

## 🔧 Implementation Standards

### Code Quality Requirements

1. **Follow Existing Patterns**
   ```javascript
   // ✅ Good - follows existing class structure
   export class NewManager {
     constructor() {
       this.setupEventListeners();
     }
   }

   // ❌ Bad - different pattern
   function newManager() { ... }
   ```

2. **Maintain Consistent Naming**
   - Use camelCase for variables and functions
   - Use PascalCase for classes
   - Use kebab-case for CSS classes and IDs
   - Use descriptive, meaningful names

3. **Error Handling**
   ```javascript
   // ✅ Always include try-catch for operations that can fail
   try {
     const result = this.timerManager.importTimers(text);
     this.showNotification('Success', 'success');
   } catch (error) {
     this.showError(error.message);
   }
   ```

4. **Input Validation**
   ```javascript
   // ✅ Validate inputs before processing
   if (!text || !text.trim()) {
     throw new Error('Invalid input data');
   }
   ```

### File Organization

1. **Module Structure**
   - Keep related functionality in appropriate modules
   - Don't mix concerns (UI logic in UI modules, data logic in managers)
   - Export classes and functions properly

2. **CSS Organization**
   - Add new styles in logical sections
   - Use existing CSS patterns and naming
   - Don't override existing styles unless necessary

3. **HTML Structure**
   - Maintain semantic HTML
   - Use proper ARIA labels for accessibility
   - Follow existing ID and class naming patterns

## 🧪 Testing Requirements

### Test-Driven Development

1. **Run Tests Before Changes**
   ```bash
   npm run test:run
   # Ensure all tests pass before starting
   ```

2. **Write Tests for New Features**
   ```javascript
   // ✅ Add tests for new functionality
   describe('newFeature', () => {
     it('should handle valid input', () => {
       const result = manager.newFeature('valid input');
       expect(result.success).toBe(true);
     });

     it('should handle invalid input', () => {
       expect(() => {
         manager.newFeature('');
       }).toThrow('Invalid input');
     });
   });
   ```

3. **Update Existing Tests When Needed**
   - If changing method signatures, update tests
   - If adding new parameters, update test calls
   - Ensure test coverage remains comprehensive

4. **Test After Every Change**
   ```bash
   # After each logical change:
   npm run test:run

   # If specific test fails:
   npm run test:run -- tests/specificFile.test.js
   ```

### Test Debugging Process

If tests fail:

1. **Read the Error Message Carefully**
   - Understand what the test expects
   - Identify the actual vs expected values

2. **Check Recent Changes**
   - Review what you just modified
   - Look for typos, missing parameters, changed logic

3. **Fix the Root Cause**
   - Don't just make tests pass
   - Ensure the fix maintains intended functionality

4. **Verify All Tests Pass**
   ```bash
   npm run test:run
   # Must show: "Test Files X passed (X)"
   ```

## 🔄 Change Management Process

### Step-by-Step Workflow

1. **Information Gathering**
   ```bash
   # Use these tools to understand the codebase:
   codebase-retrieval: "Find information about [feature/component]"
   view: "path/to/relevant/file.js"
   ```

2. **Make Incremental Changes**
   ```bash
   # Edit files using str-replace-editor
   # Make small, focused changes
   # One logical change at a time
   ```

3. **Test Immediately**
   ```bash
   npm run test:run
   # Fix any failures before proceeding
   ```

4. **Verify Functionality**
   - Test the specific feature you changed
   - Check related functionality
   - Ensure no regressions

### Git Best Practices

- Make atomic commits (one logical change per commit)
- Write descriptive commit messages
- Don't commit broken code
- Test before committing

## 🚫 Common Mistakes to Avoid

### Code Mistakes

1. **Don't Break Existing APIs**
   ```javascript
   // ❌ Bad - changes existing method signature
   editTimer(index, name, date) { ... }

   // ✅ Good - maintains backward compatibility
   editTimer(index, name, date, color, showOnMainScreen, time, location, link) { ... }
   ```

2. **Don't Ignore Error Handling**
   ```javascript
   // ❌ Bad - no error handling
   const result = JSON.parse(text);

   // ✅ Good - proper error handling
   try {
     const result = JSON.parse(text);
   } catch (error) {
     throw new Error(`Invalid JSON: ${error.message}`);
   }
   ```

3. **Don't Skip Input Validation**
   ```javascript
   // ❌ Bad - assumes input is valid
   const timer = timers[index];

   // ✅ Good - validates input
   if (index < 0 || index >= timers.length) {
     throw new Error('Invalid timer index');
   }
   ```

### Testing Mistakes

1. **Don't Skip Tests**
   - Always run tests after changes
   - Don't assume "small changes" don't need testing

2. **Don't Ignore Test Failures**
   - Fix failing tests immediately
   - Understand why tests are failing

3. **Don't Break Test Setup**
   - Maintain test DOM structure
   - Keep mock objects consistent
   - Don't remove test dependencies

## 📚 Project-Specific Guidelines

### DayWatch Architecture

1. **Module Responsibilities**
   - `TimerManager`: Data operations, validation, import/export
   - `UIManager`: DOM manipulation, event handling, user interactions
   - `ModalManager`: Modal display and lifecycle
   - `SettingsManager`: User preferences and configuration

2. **Data Flow**
   ```
   User Input → UIManager → TimerManager → Storage
   Storage → TimerManager → UIManager → DOM Update
   ```

3. **Event Handling**
   - Use event listeners in UIManager
   - Emit events from managers when appropriate
   - Handle errors gracefully with user feedback

### CSS Guidelines

1. **Use Existing Classes**
   - Leverage existing utility classes
   - Follow BEM-like naming conventions
   - Maintain responsive design patterns

2. **Color Scheme**
   - Use CSS custom properties (variables)
   - Maintain accessibility contrast ratios
   - Follow existing color patterns

### Accessibility Requirements

1. **ARIA Labels**
   - Add proper labels for interactive elements
   - Use semantic HTML elements
   - Maintain keyboard navigation

2. **Screen Reader Support**
   - Use descriptive text for buttons
   - Provide context for dynamic content
   - Test with screen readers when possible

## 🔍 Code Review Checklist

Before considering changes complete:

- [ ] All tests pass (`npm run test:run`)
- [ ] No console errors in browser
- [ ] Functionality works as expected
- [ ] Code follows existing patterns
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Documentation is updated if needed
- [ ] No breaking changes introduced
- [ ] Performance is not degraded
- [ ] Accessibility is maintained

## 📞 When to Ask for Help

Ask the user for clarification when:

- Requirements are ambiguous or unclear
- Multiple implementation approaches are possible
- Changes might break existing functionality
- You're unsure about the intended behavior
- Tests are failing and the fix isn't obvious

## 🎯 Success Metrics

A successful change should:

1. **Pass All Tests** - No broken functionality
2. **Maintain Performance** - No significant slowdowns
3. **Follow Patterns** - Consistent with existing code
4. **Handle Errors** - Graceful failure modes
5. **Be Testable** - Easy to verify functionality
6. **Be Maintainable** - Clear, readable code

---

## 📝 Final Reminder

**ALWAYS RUN TESTS AFTER CHANGES**

```bash
npm run test:run
```

If tests fail, fix them before proceeding. No exceptions.

This ensures the DayWatch project remains stable, maintainable, and high-quality.
