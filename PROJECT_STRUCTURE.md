# ChatSDK Project Structure

## 📁 Clean Production Structure

After running `./cleanup-project.sh`, your project will look like this:

```
ChatSDK/
├── .archive/                    # Development artifacts (gitignored)
│   ├── development-notes/      # Status tracking, planning docs
│   ├── reference-code/         # Reference implementations
│   └── old-builds/             # Old tar.gz packages
│
├── packages/                    # Core SDK packages
│   ├── api/                    # REST API server
│   ├── core/                   # Core SDK with sync engine
│   ├── react/                  # React hooks & components
│   └── react-native/           # React Native components
│
├── delivery-package/            # ⭐ What clients get
│   ├── docs/                   # Client-facing documentation
│   ├── scripts/                # Setup & validation scripts
│   ├── docker/                 # Production Docker configs
│   ├── examples/               # Integration examples
│   ├── START_HERE.md          # ← Clients start here
│   └── start.sh               # Interactive setup wizard
│
├── examples/                    # Example applications
│   ├── react-chat-huly/        # Full-featured React demo
│   └── integrations/           # NextAuth, Auth0 examples
│
├── docker/                      # Development Docker configs
├── docs/                        # Development documentation
├── tests/                       # Test suites
│
├── RELEASE_NOTES.md            # Client-facing release notes
├── CRITICAL_FIXES.md           # Technical fix documentation
├── create-delivery-package.sh  # Package build script
└── cleanup-project.sh          # This cleanup script
```

---

## 🎯 What Goes Where

### Root Directory (Keep Clean!)

**Essential Files Only:**
- `CLAUDE.md` - Project instructions for AI
- `RELEASE_NOTES.md` - Client-facing documentation
- `CRITICAL_FIXES.md` - Technical documentation
- `README.md` - Project overview (if you create one)
- Build/config: `package.json`, `tsconfig.json`, `.gitignore`
- Scripts: `create-delivery-package.sh`, `cleanup-project.sh`

**❌ Don't Put Here:**
- Development notes → `.archive/development-notes/`
- Status tracking → `.archive/development-notes/`
- Reference code → `.archive/reference-code/`
- Old builds → `.archive/old-builds/`

---

### `.archive/` (Gitignored)

**Purpose:** Historical reference, not needed for production

**When to Archive:**
- ✅ Development status docs
- ✅ Planning documents
- ✅ Reference implementations
- ✅ Old build artifacts
- ✅ Temporary notes

**When NOT to Archive:**
- ❌ Active source code
- ❌ Client documentation
- ❌ Production configs
- ❌ Test suites

---

### `delivery-package/`

**Purpose:** Everything clients need, nothing they don't

**What's Included:**
- ✅ Built SDK packages (`packages/*/dist`)
- ✅ Docker configs
- ✅ Setup scripts (bootstrap, validate, health-check)
- ✅ Client documentation
- ✅ Integration examples
- ✅ Interactive setup wizard

**What's Excluded:**
- ❌ Source code
- ❌ Development notes
- ❌ Test files
- ❌ Build tools

---

## 🏆 Best Practices for Large Projects

### 1. **Separate Concerns**

```
source/          # What you develop
build/           # What you build (gitignored)
dist/            # What you ship
docs/            # What you document
tests/           # What you test
.archive/        # What you keep for reference
```

### 2. **Keep Root Clean**

**Good Root:**
```
ChatSDK/
├── src/                 # Clear purpose
├── docs/                # Clear purpose
├── README.md            # Essential
├── package.json         # Essential
└── .gitignore           # Essential
```

**Bad Root:**
```
ChatSDK/
├── STATUS_UPDATE_DEC_27.md       # ❌ Clutters root
├── MEETING_NOTES_JAN_3.md        # ❌ Clutters root
├── TODO_BEFORE_DEMO.md           # ❌ Clutters root
├── backup_old.tar.gz             # ❌ Clutters root
└── random_test.js                # ❌ Clutters root
```

### 3. **Use .gitignore Effectively**

```gitignore
# Build outputs (don't commit)
dist/
build/
*.log

# Development artifacts (don't commit)
.archive/
node_modules/

# Environment files (don't commit secrets!)
.env
.env.local
.env.production  # Only .env.production.example should be committed
```

### 4. **Archive, Don't Delete**

When in doubt:
- ✅ Move to `.archive/`
- ❌ Delete permanently

You can always delete later, but you can't recover deleted files.

### 5. **Monorepo Structure**

For SDKs with multiple packages:

```
packages/
├── core/                # Shared core
├── react/               # React bindings
├── react-native/        # React Native bindings
├── vue/                 # Vue bindings (future)
└── angular/             # Angular bindings (future)
```

Each package has:
```
package/
├── src/                 # Source TypeScript
├── dist/                # Built JavaScript (gitignored)
├── tests/               # Unit tests
├── package.json         # Package config
└── README.md            # Package docs
```

### 6. **Documentation Hierarchy**

```
docs/
├── README.md            # Overview
├── getting-started/     # For beginners
├── guides/              # How-to guides
├── api/                 # API reference
└── architecture/        # For contributors
```

**Client-facing docs** go in `delivery-package/docs/`
**Developer docs** stay in root `docs/`

### 7. **Version Your Deliverables**

```
releases/
├── v1.0.0/
│   └── chatsdk-v1.0.0.tar.gz
├── v1.0.1/
│   └── chatsdk-v1.0.1.tar.gz
└── latest -> v1.0.1/
```

Or use Git tags:
```bash
git tag -a v1.0.1 -m "Release v1.0.1 - Critical bug fixes"
git push origin v1.0.1
```

---

## 🧹 When to Run Cleanup

**Weekly/Monthly:**
- Move completed status docs to `.archive/development-notes/`
- Remove old build artifacts
- Update `.gitignore` if needed

**Before Major Releases:**
- Full cleanup with `./cleanup-project.sh`
- Review what's in `.archive/`
- Ensure `delivery-package/` is pristine

**Before Sharing Code:**
- Clean root directory
- Remove sensitive files
- Check `.gitignore` is working

---

## 📊 Project Size Management

### Current State (Before Cleanup):
```
Total: ~2GB
├── assets/         1.5GB  (reference code)
├── research/       106MB  (research)
├── node_modules/   ~200MB (dependencies)
├── packages/       ~50MB  (source + builds)
└── delivery-package/ ~20MB (client package)
```

### After Cleanup:
```
Total: ~300MB (archived: 1.6GB)
├── node_modules/   ~200MB (dependencies)
├── packages/       ~50MB  (source + builds)
├── delivery-package/ ~20MB (client package)
└── .archive/       1.6GB  (gitignored)
```

### Git Repository:
```
Total: ~50MB (everything else gitignored)
├── packages/src/   ~30MB  (source code)
├── docs/           ~1MB   (documentation)
└── delivery-package/ ~20MB (client package)
```

---

## 🚀 After Cleanup

Your workflow becomes:

### Development:
```bash
cd packages/api
npm run dev           # Develop
npm run build         # Build
npm run test          # Test
```

### Client Delivery:
```bash
./create-delivery-package.sh  # Creates delivery-package/
cd delivery-package/
./start.sh                     # Test client experience
```

### Maintenance:
```bash
git status            # Clean, relevant files only
npm run test          # Fast, no cruft
./cleanup-project.sh  # When cruft accumulates again
```

---

## 💡 Pro Tips

1. **Name things clearly:** `development-notes/` not `stuff/`
2. **Date your archives:** `development-notes/2026-01-status.md`
3. **README everything:** Every directory should have a README
4. **Use .gitkeep:** For empty directories you want to keep in git
5. **Review quarterly:** What can be archived? What can be deleted?

---

## 🎓 Learning Resources

- [Monorepo Best Practices](https://monorepo.tools/)
- [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [The Twelve-Factor App](https://12factor.net/) - Config, dependencies, build
- [Semantic Versioning](https://semver.org/) - Version your releases properly

---

## Questions?

Run the cleanup and see the difference:
```bash
./cleanup-project.sh
```

Undo if needed (archive is preserved):
```bash
git status  # See what changed
git checkout .  # Undo if you don't like it
```
