# Contributing to VerseBattles

Thank you for your interest in contributing to VerseBattles: Demon Chase!

## Dual License

This project uses a dual license model:

| Use Case | License |
|----------|---------|
| Non-commercial, open source | **GNU AGPL v3** (see [LICENSE](LICENSE)) |
| Commercial use, proprietary mods | **Commercial license required** (see [LICENSE.COMMERCIAL](LICENSE.COMMERCIAL)) |

## Contributor License Agreement (CLA)

Before your first contribution can be accepted, you must agree to our CLA.

### How It Works

When you open your first pull request, the CLAassistant bot will:

1. Post a comment with a link to sign the CLA
2. Ask you to sign in with GitHub and click "I agree"
3. Mark your PR as CLA-compliant

This is a **one-time process per contributor**. Once you've signed, all future contributions are covered.

### Why a CLA?

The CLA allows us to:
- Offer the code under AGPL v3 for the community
- Offer commercial licenses to organizations that need them
- Ensure all contributors agree to this dual-licensing model

You retain copyright to your contributions - the CLA just grants us the right to license them.

See [CLA.md](CLA.md) for the full agreement text.

## How to Contribute

### Reporting Issues

- Use GitHub Issues for bugs and feature requests
- Include steps to reproduce for bugs
- Describe the expected vs actual behavior

### Submitting Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test thoroughly (see below)
5. Submit a pull request

### Running Locally

```bash
npm install
node server.js
```

Then visit http://localhost:3500

### Code Style

- Follow the existing code patterns in the project
- JavaScript uses ES5 syntax (no arrow functions, const/let, etc.)
- No comments unless explicitly requested by maintainers
- Test your changes in both solo and multiplayer modes

### File Organization

```
src/
  client/   - Browser-only code (Renderer, Input, Network, etc.)
  server/   - Node.js-only code (Game, RoomManager, entity managers)
  shared/   - Code that runs in both environments
```

## Your Rights as a Contributor

You retain copyright to your contributions. The CLA grants the project maintainer the right to:

- Use your code under the GNU AGPL v3 license
- License your code commercially to organizations that need it

Contributors are credited in the project documentation.

## What You Can Do With This Project

Under the AGPL v3, you are free to:

- **Self-host** - Run your own server independently
- **Translate** - Create your own language files
- **Customize** - Add your own verses, quiz content, monsters
- **Modify** - Change the codebase to suit your needs
- **Share** - Distribute copies to others

If you modify and publicly host the software, AGPL v3 requires you to share your source code modifications with users.

## Questions?

- **General inquiries:** michaelfackerell@gmail.com
- **Commercial licensing:** michaelfackerell@gmail.com

---

Thank you for helping make VerseBattles better!
