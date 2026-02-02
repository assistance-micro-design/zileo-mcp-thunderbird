# Plan de Préparation pour Push GitHub

**Date:** 2026-02-01
**Version:** 1.2.0
**Branche:** main
**Statut:** En attente d'exécution

---

## Résumé Exécutif

Audit complet du projet Thunderbird-MCP avant publication sur GitHub. Ce document détaille les corrections requises, classées par priorité.

### État Actuel

| Métrique             | Valeur                     |
| -------------------- | -------------------------- |
| Sécurité des secrets | ✅ Aucun secret exposé     |
| Build TypeScript     | ✅ Compilation réussie     |
| Tests                | ❌ Aucun fichier de test   |
| Linting              | ❌ Configuration manquante |
| Documentation        | ✅ 95% complète            |
| Conformité GitHub    | ⚠️ Fichiers manquants      |

---

## Phase 1: Corrections Critiques (Bloquantes)

### 1.1 Vulnérabilités des Dépendances

**Priorité:** CRITIQUE
**Effort estimé:** 15 minutes

#### Problème

Deux vulnérabilités de sévérité HIGH détectées:

| Package                   | Vulnérabilité         | CVE/GHSA            | Version Affectée | Version Corrigée |
| ------------------------- | --------------------- | ------------------- | ---------------- | ---------------- |
| @modelcontextprotocol/sdk | ReDoS                 | GHSA-8r9q-7v3j-jr4g | < 1.25.2         | >= 1.25.2        |
| qs (via vitest)           | Memory Exhaustion DoS | GHSA-6rw7-vpxm-498p | < 6.13.0         | >= 6.13.0        |

#### Actions

```bash
# Mettre à jour le SDK MCP
cd server && npm update @modelcontextprotocol/sdk

# Mettre à jour vitest (corrige qs, esbuild, vite)
cd server && npm update vitest

# Vérifier les corrections
npm audit
```

#### Critères de Succès

- [ ] `npm audit` ne rapporte aucune vulnérabilité HIGH
- [ ] Build réussit après mise à jour
- [ ] Tests passent (si existants)

---

### 1.2 Configuration ESLint Manquante

**Priorité:** CRITIQUE
**Effort estimé:** 30 minutes

#### Problème

ESLint 9.x requiert un fichier `eslint.config.js` (flat config) qui n'existe pas.

**Erreur actuelle:**

```
ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
```

#### Actions

Créer `/eslint.config.js` avec la configuration suivante:

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ["./server/tsconfig.json"],
      },
    },
    rules: {
      // Interdire console.log/error (utiliser logger)
      "no-console": "error",

      // Interdire any
      "@typescript-eslint/no-explicit-any": "error",

      // Interdire @ts-ignore
      "@typescript-eslint/ban-ts-comment": "error",

      // Exiger types de retour explicites
      "@typescript-eslint/explicit-function-return-type": "warn",
    },
  },
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.js"],
  },
);
```

#### Dépendances Requises

```bash
npm install -D @eslint/js typescript-eslint globals
```

#### Critères de Succès

- [ ] `npm run lint` s'exécute sans erreur de configuration
- [ ] Les violations de code standards sont détectées
- [ ] Build continue de fonctionner

---

### 1.3 Remplacement console.error par logger.error

**Priorité:** HAUTE
**Effort estimé:** 10 minutes

#### Problème

Deux fichiers utilisent `console.error` au lieu de `logger.error`, violant les standards du projet.

#### Fichiers Affectés

**1. server/src/index.ts:57**

```typescript
// AVANT
console.error("Fatal error:", error);

// APRÈS
logger.error("Fatal error:", {
  error: error instanceof Error ? error.message : String(error),
});
```

**2. server/src/bridge-standalone.ts:87**

```typescript
// AVANT
console.error("Fatal error:", error);

// APRÈS
logger.error("Fatal error:", {
  error: error instanceof Error ? error.message : String(error),
});
```

#### Critères de Succès

- [ ] Aucun `console.log` ou `console.error` dans le code source
- [ ] `grep -r "console\." server/src/` ne retourne rien
- [ ] Build réussit

---

### 1.4 Version Dockerfile Incorrecte

**Priorité:** MOYENNE
**Effort estimé:** 5 minutes

#### Problème

Le label de version dans Dockerfile indique 1.1.0 alors que package.json indique 1.2.0.

**Fichier:** `Dockerfile:33`

#### Action

```dockerfile
# AVANT
LABEL org.opencontainers.image.version="1.1.0"

# APRÈS
LABEL org.opencontainers.image.version="1.2.0"
```

#### Critères de Succès

- [ ] Version Dockerfile = Version package.json
- [ ] `docker build` réussit

---

## Phase 2: Conformité GitHub (Recommandé)

### 2.1 Créer CONTRIBUTING.md

**Priorité:** MOYENNE
**Effort estimé:** 30 minutes

#### Contenu Proposé

```markdown
# Contributing to Thunderbird-MCP

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Thunderbird 128.x or higher

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Run tests: `npm test`

## Code Standards

See `.claude/rules/code-standards.md` for detailed requirements:

- No `any` types
- No `console.log/error` (use logger)
- No `@ts-ignore` or `@ts-expect-error`
- All functions must have explicit types

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint && npm run build && npm test`
5. Submit a pull request

## Reporting Issues

Use GitHub Issues with appropriate labels:

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
```

---

### 2.2 Créer SECURITY.md

**Priorité:** MOYENNE
**Effort estimé:** 20 minutes

#### Contenu Proposé

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities by email to [security contact].

Do NOT open public issues for security vulnerabilities.

## Security Considerations

### Destructive Operations

This tool can perform destructive operations on your Thunderbird data:

- Delete emails permanently
- Modify contacts and calendars
- Send emails on your behalf

Always verify operations before execution.

### Data Privacy

- No email content is sent to external servers
- All operations are local to your Thunderbird instance
- Logs may contain email metadata (not content)
```

---

### 2.3 Créer Templates GitHub

**Priorité:** BASSE
**Effort estimé:** 30 minutes

#### Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
└── pull_request_template.md
```

---

## Phase 3: Tests (Optionnel)

### 3.1 Créer Tests de Base

**Priorité:** BASSE (mais recommandé pour maintenabilité)
**Effort estimé:** 2-4 heures

#### Tests Suggérés

| Catégorie   | Fichier                  | Description                     |
| ----------- | ------------------------ | ------------------------------- |
| Unit        | `tools/messages.test.ts` | Test des handlers de messages   |
| Unit        | `tools/folders.test.ts`  | Test des handlers de dossiers   |
| Unit        | `utils/errors.test.ts`   | Test de la conversion d'erreurs |
| Integration | `bridge.test.ts`         | Test de la connexion WebSocket  |

#### Structure de Test

```typescript
import { describe, it, expect, vi } from "vitest";
import { handleMessagesList } from "../tools/messages";

describe("messages.list", () => {
  it("should return error for missing folderId", async () => {
    const result = await handleMessagesList({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("folderId");
  });
});
```

---

## Checklist de Validation Finale

### Avant Push

- [ ] **Sécurité**
  - [ ] `npm audit` sans vulnérabilités HIGH
  - [ ] Pas de secrets dans le code
  - [ ] .gitignore complet

- [ ] **Build**
  - [ ] `npm run build` réussit
  - [ ] `npm run lint` réussit
  - [ ] `npm test` réussit (ou skip si pas de tests)

- [ ] **Documentation**
  - [ ] README.md à jour
  - [ ] CHANGELOG.md à jour
  - [ ] Version cohérente partout

- [ ] **GitHub**
  - [ ] LICENSE présent
  - [ ] CONTRIBUTING.md présent
  - [ ] SECURITY.md présent

### Commandes de Vérification

```bash
# Audit de sécurité
npm audit

# Build complet
npm run build

# Linting
npm run lint

# Tests
npm test

# Vérifier les secrets
grep -r "password\|secret\|api_key\|token" --include="*.ts" server/src/

# Vérifier console.log
grep -r "console\." --include="*.ts" server/src/

# Vérifier la version
grep -r "1.2.0" package.json Dockerfile README.md
```

---

## Ordre d'Exécution Recommandé

1. **Phase 1.1** - Mettre à jour les dépendances vulnérables
2. **Phase 1.2** - Créer eslint.config.js
3. **Phase 1.3** - Remplacer console.error
4. **Phase 1.4** - Corriger version Dockerfile
5. **Phase 2.1** - Créer CONTRIBUTING.md
6. **Phase 2.2** - Créer SECURITY.md
7. **Validation** - Exécuter la checklist complète
8. **Commit** - Créer le commit avec tous les changements
9. **Push** - Pousser vers GitHub

---

## Notes

- Les corrections de Phase 1 sont **bloquantes** pour un push propre
- Les éléments de Phase 2 sont **fortement recommandés** pour un projet open source
- Les tests (Phase 3) peuvent être ajoutés ultérieurement mais sont recommandés

**Auteur:** Claude Code
**Généré:** 2026-02-01
