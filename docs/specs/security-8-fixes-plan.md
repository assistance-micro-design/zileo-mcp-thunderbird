# Plan: 8 Security Fixes - Thunderbird-MCP

**Date:** 2026-02-27
**Source:** Review de securite `/Review_Thunderbird` - Score: 72/100 (B-)
**Scope:** server + extension + bridge

## Context

La review de securite a identifie 8 vulnerabilites classees de CRITICAL a LOW. Le serveur fonctionne en local (meme machine que Thunderbird). Ce plan implemente les 8 correctifs dans un ordre de dependances optimal.

## Score actuel et cible

| Categorie | Actuel | Cible |
|-----------|--------|-------|
| Input Validation | 88/100 | 95/100 |
| WebSocket Security | 55/100 | 90/100 |
| Error Info Leakage | 60/100 | 95/100 |
| Authorization & Access Control | 50/100 | 90/100 |
| Credential & Data Handling | 82/100 | 92/100 |
| MCP Protocol Robustness | 85/100 | 88/100 |
| Docker Security | 92/100 | 92/100 |
| **GLOBAL** | **72/100** | **~92/100** |

## Ordre d'implementation

```
Fixes rapides (independants, ~1-2 lignes chacun):  [DONE]
  Fix 3: Remove error.stack from extension          [DONE]
  Fix 4: Sanitize nativeErrorToJsonRpc              [DONE]
  Fix 5: Set maxPayload on WebSocket servers        [DONE]
  Fix 7: Move sensitive logging to DEBUG            [DONE]

Schema hardening:                                    [DONE]
  Fix 8: Add .max() and .datetime() to Zod schemas   [DONE]

Bridge security:
  Fix 6: Origin validation on WebSocket upgrade

Auth + Authorization (dependants):
  Fix 2: WebSocket authentication (shared secret)
  Fix 1: Tool authorization tiers + extension options UI
```

---

## Fix 3: Remove error.stack [HIGH] - 1 fichier

**Fichier:** `extension/background.js` ~ligne 149
**Finding:** SEC-ERR-001

- Supprimer `data: { stack: error.stack }` du message d'erreur WebSocket
- Garder un `console.warn("[MCP] Request error:", error.stack)` local pour debug
- Impact: aucun breaking change (le champ `data` n'est pas contractuel)

---

## Fix 4: Sanitize nativeErrorToJsonRpc [HIGH] - 1 fichier

**Fichier:** `server/src/utils/errors.ts` lignes 134-137
**Finding:** SEC-ERR-002

- Le default path passe `nativeError` complet (avec `.stack`) comme `details`
- Changer pour ne passer que le message string:
  ```typescript
  return createInternalError(
    nativeError instanceof Error ? nativeError.message : "Unknown error",
  );
  ```
- Impact: le champ `data` des erreurs JSON-RPC sera `undefined` au lieu de contenir l'objet erreur complet

---

## Fix 5: maxPayload WebSocket [MEDIUM] - 1 fichier

**Fichier:** `server/src/websocket/bridge.ts` lignes ~102, ~108
**Finding:** SEC-WS-002

- Ajouter constante `MAX_WS_PAYLOAD = 5 * 1024 * 1024` (5 MiB)
- Passer `{ noServer: true, maxPayload: MAX_WS_PAYLOAD }` aux deux `new WebSocketServer()`
- La lib `ws` fermera avec code 1009 les messages trop gros

---

## Fix 7: Logging sensible [MEDIUM] - 3 fichiers

**Findings:** SEC-DATA-001, SEC-DATA-002

Changer `logger.info` en `logger.debug` pour les parametres contenant des donnees utilisateur:

| Fichier | Ligne | Contenu sensible |
|---------|-------|-----------------|
| `server/src/tools/messages.ts` | ~96 | `JSON.stringify(params)` (from, to, subject, body) |
| `server/src/tools/contacts.ts` | ~82 | `params.query` (noms, emails) |
| `server/src/tools/calendar.ts` | ~177 | `params.query` (titres evenements) |
| `server/src/tools/calendar.ts` | ~287 | `params.title` (titre evenement) |

Garder en `logger.info` les logs non-sensibles (IDs, counts, folder names).

---

## Fix 8: Zod schemas [LOW] - 5 fichiers

**Findings:** SEC-INPUT-001, SEC-INPUT-002

Ajouter `.max()` aux champs string non bornes et `.datetime({ offset: true })` aux champs date.

**`messages.ts`:** `subject.max(1000)`, `from.max(500)`, `to.max(500)`, `body.max(10000)`, `dateFrom/dateTo.datetime({ offset: true })`, `folderId.max(500)`, `accountId.max(200)`

**`contacts.ts`:** `query.max(500)`, `contactId.max(200)`, `addressBookId.max(200)`, `vCard.max(50000)`, `properties` values `.max(5000)`

**`calendar.ts`:** tous les champs `start/end/dateFrom/dateTo/newStart/newEnd` -> `.datetime({ offset: true })`, `description.max(10000)`, `eventId/calendarId.max(200)`, `recurrence.until.datetime({ offset: true })`

**`compose.ts`:** `subject.max(1000)`, `body.max(500000)`, recipient arrays `.max(200)`, `identityId.max(200)`

**`tasks.ts`:** `dueBefore/dueAfter/dueDate` -> `.datetime({ offset: true })`, `description.max(10000)`, `taskId/calendarId.max(200)`

Note: `.datetime({ offset: true })` accepte les formats ISO 8601 avec timezone offsets (+02:00, Z, etc.)

---

## Fix 6: Origin validation [MEDIUM] - 1 fichier

**Fichier:** `server/src/websocket/bridge.ts` - upgrade handler
**Finding:** SEC-WS-003

Ajouter une fonction `isAllowedOrigin(origin)` qui accepte:
- `undefined/null` (CLI, docker exec, native)
- `localhost`, `127.0.0.1`, `::1` (connexions locales)
- `moz-extension://...` (extension Thunderbird)

Rejeter les autres avec `HTTP 403 Forbidden` + `socket.destroy()`.

---

## Fix 2: WebSocket Authentication [HIGH] - 3 fichiers

**Finding:** SEC-WS-001
**Mecanisme:** Token genere par le bridge au demarrage, servi via HTTP, valide sur upgrade WebSocket.

### bridge.ts
- Ajouter `private authToken: string` genere avec `crypto.randomBytes(32).toString('hex')`
- Ajouter endpoint HTTP `GET /auth/token` qui retourne le token (uniquement si `remoteAddress` = localhost)
- Valider le token dans le upgrade handler via query param `?token=xxx`
- Rejeter avec `HTTP 401 Unauthorized` si token invalide

### extension/background.js
- Ajouter `async function fetchAuthToken()` qui fait `fetch(`http://localhost:${WS_PORT}/auth/token`)`
- Modifier `connectWebSocket()` pour devenir async: fetch token puis connecter avec `ws://localhost:${WS_PORT}?token=${token}`
- Si token fetch echoue -> `scheduleReconnect()` (le retry existant gere la resilience)

### extension/manifest.json
- Mettre a jour CSP pour autoriser `http://localhost:9876` dans `connect-src`

### bridge-client.ts
- Ajouter `fetchBridgeToken(port)` via `http.get`
- Modifier `connect()` pour fetch token avant la connexion WebSocket

---

## Fix 1: Tool Authorization Tiers [CRITICAL] - 7 fichiers (2 nouveaux)

**Finding:** SEC-AUTH-001, SEC-AUTH-002

### 1a. Nouveau fichier: `server/src/tools/tool-permissions.ts`

- `ToolTier` type: `'read' | 'modify' | 'destructive'`
- `TOOL_TIERS: Record<string, ToolTier>` - classification des 56 tools:
  - **read** (24 tools): tous les `_list`, `_get`, `_search`, `compose_get_details`
  - **modify** (22 tools): `_create`, `_update`, `_move`, `_copy`, `_archive`, `_mark_read`, `_rename`, `_complete`, `compose_begin_*`, `compose_set_details`, `compose_save_*`
  - **destructive** (10 tools): `_delete` (7), `compose_send` (1), `addressbooks_delete` (1), `folders_delete` (1)
- `getDefaultPermissions()` -> read + modify ON, destructive OFF
- `isToolAllowed(name, permissions)` -> boolean

### 1b. Manifest: `extension/manifest.json`

- Ajouter `"storage"` aux permissions
- Ajouter `"options_ui": { "page": "options.html", "browser_style": true }`

### 1c. Nouveaux fichiers extension: `options.html` + `options.js`

- Table HTML des 56 tools groupes par domaine (Messages, Folders, Contacts, Tags, Accounts, Calendar, Tasks, Compose)
- Badge couleur par tier (vert=read, orange=modify, rouge=destructive)
- Checkbox toggle par tool
- Boutons bulk: "Enable All", "Read Only", "Read + Modify", "Disable Destructive"
- Persistence via `browser.storage.local.set({ toolPermissions: {...} })`

### 1d. Extension: `background.js`

- Dans `handleOpen()`: charger `toolPermissions` depuis `browser.storage.local` et l'envoyer dans la notification `ready` (`data.toolPermissions`)
- Ajouter listener `browser.storage.onChanged` pour envoyer une notification `permissionsUpdated` au bridge quand l'utilisateur modifie les toggles

### 1e. Bridge: `bridge.ts`

- Ajouter `private toolPermissions: Record<string, boolean> = {}`
- Dans `handleThunderbirdMessage`, capturer `toolPermissions` depuis les notifications `ready` et `permissionsUpdated`
- Ajouter `getToolPermissions()` a la classe et a `BridgeInterface`

### 1f. Bridge client: `bridge-client.ts`

- Ajouter `toolPermissions` field et `getToolPermissions()` methode

### 1g. Server: `server.ts`

- Dans `ListToolsRequestSchema` handler: filtrer `allTools` par permissions (ne lister que les tools autorises)
- Dans `CallToolRequestSchema` handler: verifier `isToolAllowed(name, permissions)` avant execution. Si refuse -> retourner erreur avec message clair indiquant le tier et comment activer dans les options

---

## Fichiers modifies (resume)

| Fichier | Fixes | Type |
|---------|-------|------|
| `server/src/tools/tool-permissions.ts` | 1 | NOUVEAU |
| `extension/options.html` | 1 | NOUVEAU |
| `extension/options.js` | 1 | NOUVEAU |
| `server/src/websocket/bridge.ts` | 1, 2, 5, 6 | Modifie |
| `server/src/websocket/bridge-client.ts` | 1, 2 | Modifie |
| `server/src/server.ts` | 1 | Modifie |
| `extension/background.js` | 1, 2, 3 | Modifie |
| `extension/manifest.json` | 1, 2 | Modifie |
| `server/src/utils/errors.ts` | 4 | Modifie |
| `server/src/tools/messages.ts` | 7, 8 | Modifie |
| `server/src/tools/contacts.ts` | 7, 8 | Modifie |
| `server/src/tools/calendar.ts` | 7, 8 | Modifie |
| `server/src/tools/compose.ts` | 8 | Modifie |
| `server/src/tools/tasks.ts` | 8 | Modifie |

**Total: 14 fichiers (3 nouveaux, 11 modifies)**

---

## Verification

### Build
```bash
cd server && npm run build   # TypeScript compile
npm run lint                 # ESLint
```

### Tests unitaires (a creer)
- `server/src/__tests__/utils/errors.test.ts` - nativeErrorToJsonRpc ne leak pas le stack
- `server/src/__tests__/tools/tool-permissions.test.ts` - classification tiers, isToolAllowed, defaults

### Tests manuels
1. Demarrer le bridge: `docker compose up -d`
2. Verifier `/health`: `curl http://localhost:9876/health`
3. Verifier `/auth/token`: `curl http://localhost:9876/auth/token` (doit retourner un token)
4. Connecter l'extension Thunderbird -> doit s'authentifier automatiquement
5. Ouvrir les options de l'extension -> page de permissions visible
6. Desactiver un tool destructif -> verifier qu'il n'apparait plus dans `tools/list` MCP
7. Tenter d'appeler un tool desactive -> verifier le message d'erreur
8. Envoyer un message WebSocket > 5 MiB -> connexion doit etre fermee
