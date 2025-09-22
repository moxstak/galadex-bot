# Contributing to GalaDex TypeScript Trading Bot

Thank you for your interest in contributing to the GalaDex TypeScript Trading Bot! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Basic understanding of TypeScript and trading concepts

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/yourusername/galadex-typescript-bot.git
   cd galadex-typescript-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a development branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with test values (use DRY_RUN=true)
   ```

## 📝 Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused
- Use consistent indentation (2 spaces)

### Testing

- Always test your changes with `DRY_RUN=true`
- Add unit tests for new features when possible
- Test with small amounts in a test environment first
- Verify all trading strategies work as expected

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add new momentum trading strategy
fix: resolve balance calculation error
docs: update README with new configuration options
refactor: improve risk management logic
test: add unit tests for trading service
```

## 🎯 Areas for Contribution

### High Priority
- **Bug Fixes**: Fix any issues you encounter
- **Performance Optimization**: Improve bot efficiency
- **Risk Management**: Enhance safety features
- **Documentation**: Improve code comments and docs

### Medium Priority
- **New Trading Strategies**: Implement additional strategies
- **UI Improvements**: Enhance the web dashboard
- **Monitoring**: Add better logging and alerts
- **Testing**: Add more comprehensive tests

### Low Priority
- **Code Refactoring**: Improve code organization
- **Dependencies**: Update and optimize dependencies
- **Examples**: Add more usage examples

## 🔧 Development Workflow

### 1. Planning
- Check existing issues and discussions
- Create a new issue if needed
- Plan your approach before coding

### 2. Development
- Create a feature branch
- Make your changes
- Test thoroughly
- Update documentation if needed

### 3. Testing
```bash
# Run basic tests
npm run build
npm start  # with DRY_RUN=true

# Test specific features
npm run test-tx-dry
npm run debug-balance
```

### 4. Submission
- Push your changes to your fork
- Create a pull request
- Fill out the PR template
- Respond to feedback

## 📋 Pull Request Process

### Before Submitting
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No sensitive data is included
- [ ] Changes are tested with DRY_RUN=true

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested with DRY_RUN=true
- [ ] All existing tests pass
- [ ] New tests added (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No sensitive data included
```

## 🛡️ Security Considerations

### Sensitive Data
- **NEVER** commit private keys or wallet addresses
- **NEVER** commit `.env` files
- Use `.env.example` for configuration templates
- Test with small amounts only

### Trading Safety
- Always use `DRY_RUN=true` during development
- Test with `ENABLE_TRADING=false` initially
- Start with very small position sizes
- Monitor bot behavior closely

## 🐛 Reporting Issues

### Bug Reports
When reporting bugs, please include:

1. **Environment**: Node.js version, OS, etc.
2. **Steps to Reproduce**: Clear, numbered steps
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Logs**: Relevant error messages or logs
6. **Configuration**: Your `.env` settings (without sensitive data)

### Feature Requests
For new features, please include:

1. **Use Case**: Why is this feature needed?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Other approaches considered
4. **Additional Context**: Any other relevant information

## 📚 Resources

### Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [GalaDex Documentation](https://docs.galadex.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Trading Concepts
- [Arbitrage Trading](https://en.wikipedia.org/wiki/Arbitrage)
- [Technical Analysis](https://en.wikipedia.org/wiki/Technical_analysis)
- [Risk Management](https://en.wikipedia.org/wiki/Risk_management)

## 🤝 Community

### Getting Help
- Check existing issues and discussions
- Create a new issue for questions
- Join community discussions

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the golden rule

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to the GalaDex TypeScript Trading Bot! 🚀
