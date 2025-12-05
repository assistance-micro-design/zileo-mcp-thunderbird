# Workflow de Build Orchestrated - Thunderbird MCP

## Objectif
Orchestrer le workflow complet de build du projet en utilisant des sub-agents intelligemment distribues (parallele/sequentiel) selon les dependances. Generer toute la documentation, analyser, implementer et valider chaque phase.

---

## Variables de Configuration

### Entrees Principales
```
USER_PROMPT: $ARGUMENTS

BUILD_MODE: [full|docs|extension|server|test|package]
  - full: Build complet (docs + extension + server + tests + package)
  - docs: Generation documentation uniquement
  - extension: Build extension Thunderbird uniquement
  - server: Build serveur MCP uniquement
  - test: Execution tests uniquement
  - package: Packaging distribution uniquement

EXECUTION_STRATEGY: [auto|parallel|sequential]
  - auto: Detection intelligente selon dependances (RECOMMANDE)
  - parallel: Force execution parallele (agents independants)
  - sequential: Force execution sequentielle (dependances strictes)

DOCUMENTATION_SCOPE: [minimal|standard|comprehensive]
  - minimal: README + CHANGELOG
  - standard: + API docs + Architecture
  - comprehensive: + Cahier des charges + Specs techniques + Guides

OUTPUT_DIRECTORY: './docs'
BUILD_OUTPUT: './dist'
REPORTS_DIRECTORY: './docs/reports'
```

### Configuration Projet Thunderbird-MCP
```
PROJECT_NAME: 'thunderbird-mcp'
ORGANIZATION: 'Assistance Micro Design'
REPOSITORY: 'https://github.com/assistance-micro-design/thunderbird-mcp'
EXTENSION_ID: 'thunderbird-mcp@assistance-micro-design.com'

EXTENSION_DIR: './extension'
SERVER_DIR: './server'
DOCS_DIR: './docs'
TYPES_DIR: './src/types'

MANIFEST_VERSION: 'V3'
NODE_VERSION: '20+'
TYPESCRIPT_VERSION: '5.5+'
```

---

## Principes d'Orchestration

### Strategie de Parallelisation
```
REGLE 1: Agents PARALLELES si:
  - Aucune dependance de donnees entre eux
  - Travaillent sur des fichiers/modules distincts
  - Output d'un agent non requis par un autre

REGLE 2: Agents SEQUENTIELS si:
  - Output d'un agent = Input d'un autre
  - Modification du meme fichier/ressource
  - Validation requise avant etape suivante

REGLE 3: HYBRIDE (Pipeline):
  - Grouper agents independants en parallele
  - Enchainer groupes sequentiellement
```

### Matrice de Dependances Projet
```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDANCE MATRIX                        │
├─────────────────────────────────────────────────────────────┤
│ Phase              │ Depend de        │ Mode          │
├────────────────────┼──────────────────┼───────────────┤
│ Discovery          │ -                │ PARALLEL      │
│ Documentation      │ Discovery        │ PARALLEL      │
│ Types/Schemas      │ Documentation    │ SEQUENTIAL    │
│ Extension Build    │ Types            │ PARALLEL*     │
│ Server Build       │ Types            │ PARALLEL*     │
│ Integration        │ Ext + Server     │ SEQUENTIAL    │
│ Tests              │ Integration      │ PARALLEL      │
│ Package            │ Tests (pass)     │ SEQUENTIAL    │
└─────────────────────────────────────────────────────────────┘
* Extension et Server peuvent etre paralleles car independants
```

---

## Architecture des Sub-Agents

### Agent Types et Responsabilites

```yaml
DISCOVERY_AGENTS: (PARALLEL - Aucune dependance)
  - codebase-analyzer:
      role: "Analyser structure existante du projet"
      tools: [Glob, Grep, Read, mcp__serena__*]
      output: "Rapport structure et patterns"

  - api-researcher:
      role: "Rechercher APIs Thunderbird et MCP"
      tools: [WebSearch, WebFetch, mcp__context7__*]
      output: "Documentation APIs consolidee"

  - dependency-scanner:
      role: "Scanner dependances et compatibilites"
      tools: [Read, Bash(npm/yarn)]
      output: "Rapport dependances"

DOCUMENTATION_AGENTS: (PARALLEL - Apres Discovery)
  - spec-writer:
      role: "Generer cahier des charges complet"
      tools: [Write, mcp__sequential-thinking__*]
      output: "CAHIER_DES_CHARGES.md"

  - api-documenter:
      role: "Documenter toutes les APIs MCP"
      tools: [Write, Read]
      output: "docs/api/*.md"

  - architecture-designer:
      role: "Creer diagrammes et specs architecture"
      tools: [Write, mcp__sequential-thinking__*]
      output: "docs/architecture/*.md + Mermaid"

IMPLEMENTATION_AGENTS: (MIXED - Selon module)
  - types-generator:
      role: "Generer types TypeScript"
      depends_on: [spec-writer]
      mode: SEQUENTIAL
      tools: [Write, Edit]
      output: "src/types/*.ts"

  - extension-builder:
      role: "Implementer extension Thunderbird"
      depends_on: [types-generator]
      mode: PARALLEL_WITH(server-builder)
      tools: [Write, Edit, Bash]
      output: "extension/*"

  - server-builder:
      role: "Implementer serveur MCP"
      depends_on: [types-generator]
      mode: PARALLEL_WITH(extension-builder)
      tools: [Write, Edit, Bash]
      output: "server/*"

VALIDATION_AGENTS: (SEQUENTIAL - Apres Implementation)
  - integration-tester:
      role: "Tester integration Extension <-> Server"
      depends_on: [extension-builder, server-builder]
      tools: [Bash, Read]
      output: "Rapport integration"

  - quality-checker:
      role: "Lint, TypeCheck, Security audit"
      depends_on: [integration-tester]
      tools: [Bash]
      output: "Rapport qualite"

PACKAGING_AGENTS: (SEQUENTIAL - Final)
  - packager:
      role: "Creer packages distribution"
      depends_on: [quality-checker (PASS)]
      tools: [Bash, Write]
      output: "dist/*.xpi, dist/*.tgz"
```

---

## Workflow d'Execution

### Phase 0: Initialisation et Analyse

```
STEP 0.1: Validation Context
├─ Verifier USER_PROMPT / ARGUMENTS
├─ Detecter BUILD_MODE depuis arguments ou defaut 'full'
├─ Charger configuration projet
└─ Initialiser TodoWrite pour tracking

STEP 0.2: Pre-flight Checks
├─ Git status (working tree clean?)
├─ Node/npm version check
├─ Dependances installees?
└─ Thunderbird disponible (pour tests)?

STEP 0.3: Determiner Execution Strategy
├─ Parser dependances depuis matrice
├─ Construire DAG (Directed Acyclic Graph) des phases
├─ Identifier groupes parallelisables
└─ Generer execution plan
```

### Phase 1: Discovery (PARALLEL AGENTS)

```
LANCER EN PARALLELE (meme message, multiple Task calls):

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH 1: DISCOVERY                                 │
├─────────────────────────────────────────────────────────────┤

Agent 1: Codebase Analyzer
Task(subagent_type="Explore", prompt="""
Analyser la structure complete du projet Thunderbird-MCP:

OBJECTIF: Cartographier le code existant et identifier patterns

ACTIONS:
1. Scanner structure directories (extension/, server/, docs/)
2. Identifier fichiers cles et leur role
3. Detecter patterns architecturaux utilises
4. Lister APIs Thunderbird deja implementees
5. Identifier gaps vs cahier des charges

OUTPUT ATTENDU (JSON structure):
{
  "project_structure": {...},
  "existing_files": [...],
  "patterns_found": [...],
  "implemented_apis": [...],
  "gaps": [...]
}
""")

Agent 2: API Documentation Researcher
Task(subagent_type="Explore", prompt="""
Rechercher documentation complete APIs:

OBJECTIF: Consolider documentation Thunderbird + MCP

ACTIONS:
1. WebSearch: "Thunderbird WebExtension API 2025"
2. WebFetch: webextension-api.thunderbird.net APIs
3. WebSearch: "MCP Model Context Protocol specification"
4. Identifier toutes les methodes requises
5. Mapper APIs Thunderbird -> Tools MCP

OUTPUT ATTENDU:
{
  "thunderbird_apis": {
    "messages": [...methods],
    "folders": [...methods],
    "contacts": [...methods],
    "calendar": [...methods]
  },
  "mcp_requirements": {
    "tools": [...],
    "resources": [...],
    "protocol": {...}
  }
}
""")

Agent 3: Dependency & Compatibility Scanner
Task(subagent_type="Explore", prompt="""
Scanner dependances et compatibilite:

OBJECTIF: Valider stack technique et dependances

ACTIONS:
1. Analyser package.json existants
2. Verifier versions Node/TypeScript requises
3. Scanner vulnerabilites (npm audit concept)
4. Valider compatibilite Thunderbird versions
5. Lister dependances manquantes

OUTPUT ATTENDU:
{
  "current_deps": {...},
  "required_deps": {...},
  "missing_deps": [...],
  "version_compatibility": {...},
  "security_notes": [...]
}
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Tous les agents Discovery termines
MERGE: Consolider outputs en discovery_report
```

### Phase 2: Documentation Generation (PARALLEL AGENTS)

```
CONDITION: Discovery complete
DEPENDS_ON: Phase 1 outputs

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH 2: DOCUMENTATION                             │
├─────────────────────────────────────────────────────────────┤

Agent 4: Specification Writer
Task(subagent_type="technical-writer", prompt="""
Generer/Mettre a jour le Cahier des Charges complet.

CONTEXT: {discovery_report}

OBJECTIF: Document CAHIER_DES_CHARGES.md exhaustif

TEMPLATE A SUIVRE:
- Voir @CAHIER_DES_CHARGES.md existant comme reference
- Mettre a jour avec nouvelles decouvertes
- Ajouter sections manquantes

SECTIONS REQUISES:
1. Contexte et Objectifs
2. Architecture Technique (avec diagrammes Mermaid)
3. Specifications Fonctionnelles (tous modules)
4. Ressources MCP
5. Protocole JSON-RPC 2.0
6. Stack Technique
7. Securite
8. Gestion des Erreurs
9. Tests
10. Phases de Developpement
11. References

OUTPUT: Fichier CAHIER_DES_CHARGES.md complet
""")

Agent 5: API Documentation Generator
Task(subagent_type="technical-writer", prompt="""
Generer documentation API complete.

CONTEXT: {discovery_report.thunderbird_apis, discovery_report.mcp_requirements}

OBJECTIF: Documentation API pour developpeurs

FICHIERS A GENERER:
1. docs/api/messages-api.md - Toutes operations emails
2. docs/api/folders-api.md - Operations dossiers
3. docs/api/contacts-api.md - Operations contacts
4. docs/api/calendar-api.md - Operations calendrier
5. docs/api/mcp-protocol.md - Protocol MCP JSON-RPC

POUR CHAQUE API:
- Description methode
- Parametres (types TypeScript)
- Response format
- Exemple request/response
- Codes erreur possibles

OUTPUT: Fichiers markdown dans docs/api/
""")

Agent 6: Architecture Designer
Task(subagent_type="system-architect", prompt="""
Concevoir et documenter architecture systeme.

CONTEXT: {discovery_report}

OBJECTIF: Documentation architecture complete

LIVRABLES:
1. docs/architecture/overview.md
   - Vue globale systeme
   - Diagramme composants (Mermaid)

2. docs/architecture/extension.md
   - Architecture extension Thunderbird
   - Manifest V3 structure
   - Communication Native Messaging

3. docs/architecture/server.md
   - Architecture serveur MCP
   - Handlers et routing
   - Transport stdio/HTTP

4. docs/architecture/data-flow.md
   - Diagrammes sequence (Mermaid)
   - Flux donnees complets

OUTPUT: Fichiers markdown avec diagrammes Mermaid
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Tous les agents Documentation termines
MERGE: Valider coherence documentation
```

### Phase 3: Types & Schemas (SEQUENTIAL)

```
CONDITION: Documentation complete
DEPENDS_ON: Phase 2 outputs (specs finalisees)
MODE: SEQUENTIAL (types = fondation pour implementation)

┌─────────────────────────────────────────────────────────────┐
│ SEQUENTIAL: TYPES GENERATION                                │
├─────────────────────────────────────────────────────────────┤

Agent 7: TypeScript Types Generator
Task(subagent_type="python-expert", prompt="""
Generer tous les types TypeScript du projet.

CONTEXT:
- Specifications: {phase2_outputs.specifications}
- APIs: {discovery_report.thunderbird_apis}

OBJECTIF: Types complets et coherents

FICHIERS A GENERER:

1. src/types/thunderbird.ts
   - Types pour APIs Thunderbird (Message, Folder, Contact, etc.)
   - Enums pour statuts et options

2. src/types/mcp.ts
   - Types protocol MCP (Request, Response, Error)
   - Types Tools et Resources

3. src/types/native-messaging.ts
   - Types communication Native Messaging
   - Message formats

4. src/types/calendar.ts (experimental)
   - Types Calendar, Event, Task
   - Types recurrence

5. src/types/index.ts
   - Export centralise

STANDARDS:
- JSDoc sur chaque type
- Strict TypeScript
- Zod schemas associes si validation requise

OUTPUT: Fichiers .ts dans src/types/
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Types generes et valides
CHECKPOINT: TypeScript compile sans erreur
```

### Phase 4: Implementation (PARALLEL - Extension & Server)

```
CONDITION: Types compiles sans erreur
DEPENDS_ON: Phase 3 (types disponibles)
MODE: PARALLEL (Extension et Server independants)

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH 3: IMPLEMENTATION                            │
├─────────────────────────────────────────────────────────────┤

Agent 8: Extension Builder
Task(subagent_type="frontend-architect", prompt="""
Implementer l'extension Thunderbird MailExtension.

CONTEXT:
- Types: {src/types/*}
- Specs: {CAHIER_DES_CHARGES.md - Section Extension}
- Architecture: {docs/architecture/extension.md}

OBJECTIF: Extension Thunderbird fonctionnelle

STRUCTURE A CREER:
extension/
├── manifest.json (Manifest V3)
├── background.js (Service Worker)
├── api/
│   ├── messages.js
│   ├── folders.js
│   ├── contacts.js
│   ├── accounts.js
│   └── tags.js
├── experiments/
│   └── calendar/ (API experimentale)
├── native-messaging/
│   └── handler.js
└── _locales/
    └── en/messages.json

IMPLEMENTATION:
1. Manifest avec toutes permissions requises
2. Background script avec event listeners
3. Wrappers pour chaque API Thunderbird
4. Handler Native Messaging bidirectionnel
5. Experiment API pour calendrier

OUTPUT: Extension complete dans extension/
""")

Agent 9: MCP Server Builder
Task(subagent_type="backend-architect", prompt="""
Implementer le serveur MCP Node.js/TypeScript.

CONTEXT:
- Types: {src/types/*}
- Specs: {CAHIER_DES_CHARGES.md - Section Serveur}
- Architecture: {docs/architecture/server.md}

OBJECTIF: Serveur MCP complet

STRUCTURE A CREER:
server/
├── src/
│   ├── index.ts (Entry point)
│   ├── server.ts (MCP Server config)
│   ├── tools/
│   │   ├── index.ts
│   │   ├── messages.ts
│   │   ├── folders.ts
│   │   ├── contacts.ts
│   │   ├── calendar.ts
│   │   └── tags.ts
│   ├── resources/
│   │   ├── index.ts
│   │   └── handlers.ts
│   ├── native-messaging/
│   │   ├── client.ts
│   │   └── protocol.ts
│   └── utils/
│       ├── logger.ts
│       └── errors.ts
├── package.json
├── tsconfig.json
└── native-host.json

IMPLEMENTATION:
1. Configuration @modelcontextprotocol/sdk
2. Tous les tools MCP (47 outils)
3. Resources MCP (8 ressources)
4. Client Native Messaging
5. Gestion erreurs JSON-RPC

OUTPUT: Serveur complet dans server/
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Les deux implementations terminees
CHECKPOINT: npm run build success pour les deux
```

### Phase 5: Integration & Tests (MIXED)

```
CONDITION: Extension ET Server buildes
DEPENDS_ON: Phase 4 (les deux modules)
MODE: SEQUENTIAL puis PARALLEL

┌─────────────────────────────────────────────────────────────┐
│ SEQUENTIAL: INTEGRATION                                     │
├─────────────────────────────────────────────────────────────┤

Agent 10: Integration Specialist
Task(subagent_type="quality-engineer", prompt="""
Integrer et tester communication Extension <-> Server.

CONTEXT:
- Extension: {extension/*}
- Server: {server/*}

OBJECTIF: Integration fonctionnelle validee

TACHES:
1. Configurer Native Messaging manifest
2. Tester connexion bidirectionnelle
3. Valider format messages JSON-RPC
4. Tester cycle complet tool call
5. Documenter setup integration

TESTS INTEGRATION:
- Ping/Pong Native Messaging
- tools/list response
- tools/call simple (messages_list)
- Error handling

OUTPUT:
- Configuration Native Messaging
- Rapport integration
- Scripts de test
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Integration validee

┌─────────────────────────────────────────────────────────────┐
│ PARALLEL BATCH 4: TESTS                                     │
├─────────────────────────────────────────────────────────────┤

Agent 11: Unit Test Writer
Task(subagent_type="quality-engineer", prompt="""
Ecrire tests unitaires complets.

SCOPE: server/src/**/*.ts

FRAMEWORK: Vitest

COVERAGE CIBLE: >80%

TESTS A CREER:
- tests/unit/tools/*.test.ts
- tests/unit/resources/*.test.ts
- tests/unit/native-messaging/*.test.ts
- tests/unit/utils/*.test.ts

OUTPUT: Tests dans tests/unit/
""")

Agent 12: E2E Test Writer
Task(subagent_type="quality-engineer", prompt="""
Ecrire tests End-to-End.

SCOPE: Integration complete

SCENARIOS:
1. Demarrage serveur MCP
2. Connexion client test
3. Liste des outils
4. Recherche messages
5. CRUD contacts
6. Operations calendrier

OUTPUT: Tests dans tests/e2e/
""")

└─────────────────────────────────────────────────────────────┘
WAIT: Tous les tests ecrits
RUN: npm test
GATE: Tests PASS requis pour continuer
```

### Phase 6: Packaging & Release (SEQUENTIAL)

```
CONDITION: Tous tests PASS
DEPENDS_ON: Phase 5 (validation complete)
MODE: SEQUENTIAL (ordre strict)

┌─────────────────────────────────────────────────────────────┐
│ SEQUENTIAL: PACKAGING                                       │
├─────────────────────────────────────────────────────────────┤

Agent 13: Release Packager
Task(subagent_type="devops-architect", prompt="""
Preparer packages pour distribution.

OBJECTIF: Artefacts prets pour release

TACHES SEQUENTIELLES:

1. Version bump (si applicable)
   - Mettre a jour version dans package.json
   - Mettre a jour version dans manifest.json

2. Build production
   - npm run build (server)
   - web-ext build (extension)

3. Generer artefacts
   - dist/thunderbird-mcp-server-{version}.tgz
   - dist/thunderbird-mcp-extension-{version}.xpi

4. Generer checksums
   - SHA256 pour chaque artefact

5. Preparer release notes
   - CHANGELOG.md update
   - Release notes from commits

OUTPUT:
- dist/*.tgz, dist/*.xpi
- CHANGELOG.md
- RELEASE_NOTES.md
""")

└─────────────────────────────────────────────────────────────┘
```

---

## Execution Engine

### Algorithme d'Orchestration

```python
def execute_build_workflow(user_prompt, build_mode):
    # Phase 0: Init
    config = load_config()
    dag = build_dependency_graph(build_mode)

    # Execution par niveaux (topological sort)
    for level in dag.levels():
        agents_in_level = dag.get_agents(level)

        if all_independent(agents_in_level):
            # PARALLEL: Lancer tous les agents du niveau ensemble
            results = parallel_execute(agents_in_level)
        else:
            # SEQUENTIAL: Executer un par un
            results = sequential_execute(agents_in_level)

        # Validation checkpoint
        if not validate_results(results):
            handle_failure(level, results)
            return FAILURE

        # Merge outputs pour niveau suivant
        context.update(results)

    return SUCCESS
```

### Detection Automatique Mode Execution

```
PARALLEL si:
  ├─ Agents travaillent sur fichiers differents
  ├─ Aucun agent n'attend output d'un autre du meme batch
  └─ Ressources partagees = lecture seule

SEQUENTIAL si:
  ├─ Agent B a besoin de output Agent A
  ├─ Modification du meme fichier
  ├─ Validation requise entre etapes
  └─ Ordre logique impose (types avant implementation)
```

---

## Gestion des Erreurs et Recovery

### Strategie de Retry

```yaml
RETRY_POLICY:
  max_retries: 3
  backoff: exponential

  on_agent_failure:
    - Log error details
    - Analyze failure cause
    - If transient: retry with same context
    - If persistent: escalate to user

  on_validation_failure:
    - Identify failing component
    - Re-run specific agent with adjusted prompt
    - If structural issue: rollback to checkpoint
```

### Checkpoints et Rollback

```
CHECKPOINTS:
  - After Phase 1 (Discovery): Save discovery_report
  - After Phase 2 (Docs): Save documentation state
  - After Phase 3 (Types): Save compiled types
  - After Phase 4 (Implementation): Git commit WIP
  - After Phase 5 (Tests PASS): Tag release candidate

ROLLBACK:
  - On critical failure: git reset to last checkpoint
  - On partial failure: re-run failed phase only
  - Preserve successful outputs
```

---

## Output et Reporting

### Structure Rapport Final

```markdown
# Build Report - Thunderbird MCP

## Summary
- **Status**: SUCCESS | PARTIAL | FAILURE
- **Duration**: Xh Xm
- **Phases Completed**: X/6
- **Agents Executed**: X (Y parallel, Z sequential)

## Phase Results

### Phase 1: Discovery
- Status: COMPLETE
- Agents: 3 (parallel)
- Duration: Xm
- Outputs: discovery_report.json

### Phase 2: Documentation
- Status: COMPLETE
- Agents: 3 (parallel)
- Files Generated:
  - CAHIER_DES_CHARGES.md
  - docs/api/*.md (5 files)
  - docs/architecture/*.md (4 files)

### Phase 3: Types
- Status: COMPLETE
- Agents: 1 (sequential)
- Files: src/types/*.ts (5 files)
- TypeScript: COMPILES

### Phase 4: Implementation
- Status: COMPLETE
- Agents: 2 (parallel)
- Extension: extension/* (X files)
- Server: server/* (Y files)
- Build: SUCCESS

### Phase 5: Tests
- Status: COMPLETE
- Unit Tests: XX passed
- E2E Tests: XX passed
- Coverage: XX%

### Phase 6: Packaging
- Status: COMPLETE
- Artifacts:
  - dist/thunderbird-mcp-server-1.0.0.tgz
  - dist/thunderbird-mcp-extension-1.0.0.xpi

## Metrics
- Total Agents: XX
- Parallel Executions: XX
- Sequential Executions: XX
- Parallelization Efficiency: XX%

## Next Steps
1. Review generated documentation
2. Test extension in Thunderbird
3. Publish to npm/AMO
```

---

## Commandes Disponibles

### Usage

```bash
# Build complet
/build full

# Documentation uniquement
/build docs

# Extension uniquement
/build extension

# Server uniquement
/build server

# Tests uniquement
/build test

# Packaging uniquement
/build package

# Avec options
/build full --verbose --no-tests
/build docs --comprehensive
```

---

## Integration MCP Servers

### Utilisation Optimale

```yaml
Task Agents:
  - subagent_type: "Explore" pour discovery
  - subagent_type: "technical-writer" pour documentation
  - subagent_type: "system-architect" pour architecture
  - subagent_type: "backend-architect" pour server
  - subagent_type: "frontend-architect" pour extension
  - subagent_type: "quality-engineer" pour tests
  - subagent_type: "devops-architect" pour packaging

Sequential Thinking:
  - Analyse architecturale complexe
  - Resolution problemes multi-composants
  - Design decisions

Serena:
  - Exploration symbolique code existant
  - Memory pour contexte cross-session
  - find_symbol pour localisation rapide

Context7:
  - Documentation Thunderbird API
  - Documentation MCP SDK
  - Best practices frameworks
```

---

## Checklist Pre-Execution

```
[ ] USER_PROMPT ou ARGUMENTS fournis
[ ] BUILD_MODE determine (defaut: full)
[ ] Git repository clean ou stash effectue
[ ] Node.js 20+ installe
[ ] Dependances projet installees (npm install)
[ ] Thunderbird installe (pour tests E2E)
[ ] Espace disque suffisant pour builds
[ ] Connexion internet (pour Context7, WebSearch)
```

---

## Notes Implementation

### Pour Claude Code

1. **Lancer agents paralleles**: Utiliser PLUSIEURS Task calls dans le MEME message
2. **Attendre completion**: Les resultats reviennent quand tous les agents terminent
3. **Passer contexte**: Chaque agent recoit prompt auto-contenu avec tout le contexte necessaire
4. **Valider outputs**: Verifier format et completude avant phase suivante
5. **Tracker progress**: Utiliser TodoWrite pour visibilite utilisateur

### Exemple Lancement Parallel

```
// Dans un seul message Claude:
Task(subagent_type="Explore", prompt="Agent 1...")
Task(subagent_type="Explore", prompt="Agent 2...")
Task(subagent_type="Explore", prompt="Agent 3...")
// Les 3 agents s'executent en parallele
```

### Exemple Lancement Sequential

```
// Message 1:
Task(subagent_type="...", prompt="Agent A...")
// Attendre resultat A

// Message 2 (apres resultat A):
Task(subagent_type="...", prompt="Agent B avec context de A...")
// Attendre resultat B
```
