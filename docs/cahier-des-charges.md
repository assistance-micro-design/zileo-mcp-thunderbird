# Cahier des Charges - Thunderbird MCP Server

**Projet**: thunderbird-mcp
**Entreprise**: Assistance Micro Design
**Repository**: https://github.com/assistance-micro-design/thunderbird-mcp
**Version**: 1.3.1
**Date**: Décembre 2025
**Statut**: ✅ Implémenté

---

## 1. Contexte et Objectifs

### 1.1 Vision du Projet

Développer un serveur MCP (Model Context Protocol) permettant aux LLMs d'interagir avec l'application Thunderbird pour automatiser la gestion des emails, contacts, calendriers et tâches.

### 1.2 Objectifs Principaux

- Exposer les fonctionnalités Thunderbird via le protocole MCP (JSON-RPC 2.0)
- Permettre la recherche et manipulation d'emails
- Gérer les contacts et carnets d'adresses
- Interagir avec les calendriers et rendez-vous
- Fournir un système CRUD complet sur toutes les entités

### 1.3 Cas d'Usage Cibles

- **Assistants IA**: Recherche contextuelle d'emails, résumé de conversations
- **Automatisation**: Tri automatique, archivage intelligent, gestion de tags
- **Productivité**: Création de rendez-vous par commande vocale/textuelle
- **CRM léger**: Recherche et mise à jour de contacts

---

## 2. Architecture Technique

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT MCP                               │
│              (Claude, GPT, Assistant IA, etc.)                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ JSON-RPC 2.0 (stdio)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVEUR MCP                                  │
│                  (Node.js/TypeScript)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Tools     │ │  Resources  │ │   Prompts   │               │
│  │  Handler    │ │   Handler   │ │   Handler   │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         └────────────────┼───────────────┘                      │
│                          ▼                                      │
│              ┌───────────────────────┐                          │
│              │   WebSocket Bridge    │                          │
│              │   (Client ou Server)  │                          │
│              └───────────┬───────────┘                          │
└──────────────────────────┼──────────────────────────────────────┘
                           │ WebSocket (ws://localhost:9876)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 EXTENSION THUNDERBIRD                           │
│                    (MailExtension)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Background Script                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ Messages │ │ Folders  │ │ Contacts │ │ Calendar │   │   │
│  │  │   API    │ │   API    │ │   API    │ │   API*   │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  * API Expérimentale (webext-experiments)                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      THUNDERBIRD                                │
│           (Emails, Contacts, Calendriers, Tâches)               │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1.1 Architecture Docker (Multi-Client)

Pour le déploiement Docker, l'architecture supporte plusieurs clients MCP simultanés :

```
┌──────────────────────────────────────────────────────────────────┐
│                       Docker Container                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           bridge-standalone.ts (port 9876)                  │  │
│  │                WebSocket Bridge Server                      │  │
│  │                                                             │  │
│  │   /thunderbird (ou /)        │         /mcp                │  │
│  │   └─ 1 connexion max         │         └─ multi-clients    │  │
│  │   (Extension Thunderbird)    │         (Instances MCP)     │  │
│  └────────────────────────────────────────────────────────────┘  │
│              ▲                               ▲                    │
│              │                         ┌─────┴─────┐              │
│   Extension Thunderbird           docker exec   docker exec      │
│   (via host network)              (MCP #1)      (MCP #2)         │
└──────────────────────────────────────────────────────────────────┘

Endpoints:
  - ws://localhost:9876/          → Extension Thunderbird (ou /thunderbird)
  - ws://localhost:9876/mcp       → Clients MCP (multiples)
  - http://localhost:9876/health  → Status JSON
```

**Flux de communication Docker:**

1. Le conteneur lance `bridge-standalone.ts` (serveur WebSocket uniquement)
2. L'extension Thunderbird se connecte au chemin `/` ou `/thunderbird`
3. Les clients MCP (`docker exec`) se connectent au chemin `/mcp`
4. Le bridge relaie les requêtes MCP vers Thunderbird et retourne les réponses

### 2.2 Composants

#### 2.2.1 Extension Thunderbird (MailExtension)

- **Type**: WebExtension Manifest V3
- **Rôle**: Pont entre le serveur MCP et les APIs Thunderbird
- **Communication**: Native Messaging (`runtime.connectNative()`)
- **APIs utilisées**:
  - `messenger.messages.*` - Gestion des emails
  - `messenger.folders.*` - Gestion des dossiers
  - `messenger.accounts.*` - Gestion des comptes
  - `messenger.addressBooks.*` - Carnets d'adresses
  - `messenger.contacts.*` - Contacts (deprecated, utiliser addressBooks.contacts)
  - `messenger.tags.*` - Tags/étiquettes
  - Experiment API `calendarProvider` - Calendrier (expérimental)

#### 2.2.2 Serveur MCP

- **Runtime**: Node.js 20+
- **Langage**: TypeScript
- **Framework**: @modelcontextprotocol/sdk
- **Transport**: stdio (principal), HTTP+SSE (optionnel)
- **Rôle**: Exposition des outils et ressources via JSON-RPC 2.0

#### 2.2.3 Native Messaging Host

- **Manifest**: Configuration système pour la communication inter-processus
- **Emplacements**:
  - Linux: `~/.mozilla/native-messaging-hosts/`
  - macOS: `~/Library/Mozilla/NativeMessagingHosts/`
  - Windows: Registre + fichier manifest

---

## 3. Spécifications Fonctionnelles

### 3.1 Module Messages (Emails)

| Outil MCP                          | Description                             | Paramètres                                                                                     | Permission     |
| ---------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------- |
| `thunderbird_messages_search`      | Recherche avancée d'emails              | `subject`, `from`, `to`, `body`, `tags[]`, `unread`, `dateFrom`, `dateTo`, `folderId`, `limit` | messagesRead   |
| `thunderbird_messages_list`        | Liste paginée des messages d'un dossier | `folderId`, `limit`, `offset`                                                                  | messagesRead   |
| `thunderbird_messages_list_unread` | Liste des messages non lus              | `accountId?`, `limit`                                                                          | messagesRead   |
| `thunderbird_messages_get`         | Récupère un message complet             | `messageId`, `format` (headers\|full\|raw)                                                     | messagesRead   |
| `thunderbird_messages_move`        | Déplace des messages                    | `messageIds[]`, `destinationFolderId`                                                          | messagesMove   |
| `thunderbird_messages_copy`        | Copie des messages                      | `messageIds[]`, `destinationFolderId`                                                          | messagesMove   |
| `thunderbird_messages_delete`      | Supprime des messages                   | `messageIds[]`, `permanent?`                                                                   | messagesMove   |
| `thunderbird_messages_update`      | Met à jour les propriétés               | `messageId`, `read?`, `flagged?`, `tags[]`                                                     | messagesUpdate |
| `thunderbird_messages_archive`     | Archive des messages                    | `messageIds[]`                                                                                 | messagesMove   |

### 3.2 Module Dossiers

| Outil MCP                       | Description             | Paramètres                         | Permission      |
| ------------------------------- | ----------------------- | ---------------------------------- | --------------- |
| `thunderbird_folders_list`      | Liste tous les dossiers | `accountId?`, `includeSubFolders?` | accountsRead    |
| `thunderbird_folders_get`       | Détails d'un dossier    | `folderId`                         | accountsRead    |
| `thunderbird_folders_create`    | Crée un sous-dossier    | `parentFolderId`, `name`           | accountsFolders |
| `thunderbird_folders_rename`    | Renomme un dossier      | `folderId`, `newName`              | accountsFolders |
| `thunderbird_folders_delete`    | Supprime un dossier     | `folderId`                         | accountsFolders |
| `thunderbird_folders_move`      | Déplace un dossier      | `folderId`, `destinationFolderId`  | accountsFolders |
| `thunderbird_folders_mark_read` | Marque tout comme lu    | `folderId`                         | messagesUpdate  |

### 3.3 Module Tags/Étiquettes

| Outil MCP                 | Description         | Paramètres              | Permission   |
| ------------------------- | ------------------- | ----------------------- | ------------ |
| `thunderbird_tags_list`   | Liste tous les tags | -                       | messagesTags |
| `thunderbird_tags_create` | Crée un nouveau tag | `key`, `tag`, `color`   | messagesTags |
| `thunderbird_tags_update` | Modifie un tag      | `key`, `tag?`, `color?` | messagesTags |
| `thunderbird_tags_delete` | Supprime un tag     | `key`                   | messagesTags |

### 3.4 Module Contacts

| Outil MCP                         | Description           | Paramètres                               | Permission   |
| --------------------------------- | --------------------- | ---------------------------------------- | ------------ |
| `thunderbird_contacts_search`     | Recherche de contacts | `query`, `addressBookId?`, `limit?`      | addressBooks |
| `thunderbird_contacts_list`       | Liste des contacts    | `addressBookId`, `limit?`, `offset?`     | addressBooks |
| `thunderbird_contacts_get`        | Détails d'un contact  | `contactId`                              | addressBooks |
| `thunderbird_contacts_create`     | Crée un contact       | `addressBookId`, `properties` ou `vCard` | addressBooks |
| `thunderbird_contacts_update`     | Modifie un contact    | `contactId`, `properties` ou `vCard`     | addressBooks |
| `thunderbird_contacts_delete`     | Supprime un contact   | `contactId`                              | addressBooks |
| `thunderbird_addressbooks_list`   | Liste des carnets     | -                                        | addressBooks |
| `thunderbird_addressbooks_create` | Crée un carnet        | `name`                                   | addressBooks |
| `thunderbird_addressbooks_delete` | Supprime un carnet    | `addressBookId`                          | addressBooks |

### 3.5 Module Calendrier (API Expérimentale)

> ⚠️ **Note**: Ce module utilise l'API expérimentale `calendarProvider` de thunderbird/webext-experiments

| Outil MCP                    | Description             | Paramètres                                                                                        | Permission       |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------- | ---------------- |
| `thunderbird_calendars_list` | Liste des calendriers   | -                                                                                                 | calendarProvider |
| `thunderbird_calendars_get`  | Détails d'un calendrier | `calendarId`                                                                                      | calendarProvider |
| `thunderbird_events_search`  | Recherche d'événements  | `query?`, `calendarId?`, `dateFrom`, `dateTo`                                                     | calendarProvider |
| `thunderbird_events_list`    | Liste des événements    | `calendarId`, `dateFrom`, `dateTo`, `limit?`                                                      | calendarProvider |
| `thunderbird_events_get`     | Détails d'un événement  | `eventId`, `calendarId`                                                                           | calendarProvider |
| `thunderbird_events_create`  | Crée un événement       | `calendarId`, `title`, `start`, `end`, `location?`, `description?`, `attendees[]?`, `recurrence?` | calendarProvider |
| `thunderbird_events_update`  | Modifie un événement    | `eventId`, `calendarId`, `modifications`, `scope?` (this\|all\|future)                            | calendarProvider |
| `thunderbird_events_move`    | Déplace un événement    | `eventId`, `calendarId`, `newStart`, `newEnd`                                                     | calendarProvider |
| `thunderbird_events_delete`  | Supprime un événement   | `eventId`, `calendarId`, `scope?`                                                                 | calendarProvider |

### 3.6 Module Tâches (API Expérimentale)

| Outil MCP                    | Description           | Paramètres                                                     | Permission       |
| ---------------------------- | --------------------- | -------------------------------------------------------------- | ---------------- |
| `thunderbird_tasks_list`     | Liste des tâches      | `calendarId?`, `completed?`, `dueBefore?`, `dueAfter?`         | calendarProvider |
| `thunderbird_tasks_get`      | Détails d'une tâche   | `taskId`, `calendarId`                                         | calendarProvider |
| `thunderbird_tasks_create`   | Crée une tâche        | `calendarId`, `title`, `dueDate?`, `priority?`, `description?` | calendarProvider |
| `thunderbird_tasks_update`   | Modifie une tâche     | `taskId`, `calendarId`, `modifications`                        | calendarProvider |
| `thunderbird_tasks_delete`   | Supprime une tâche    | `taskId`, `calendarId`                                         | calendarProvider |
| `thunderbird_tasks_complete` | Marque comme terminée | `taskId`, `calendarId`                                         | calendarProvider |

### 3.7 Module Comptes

| Outil MCP                     | Description         | Paramètres  | Permission   |
| ----------------------------- | ------------------- | ----------- | ------------ |
| `thunderbird_accounts_list`   | Liste des comptes   | -           | accountsRead |
| `thunderbird_accounts_get`    | Détails d'un compte | `accountId` | accountsRead |
| `thunderbird_identities_list` | Liste des identités | `accountId` | accountsRead |

---

## 4. Ressources MCP

Les ressources MCP permettent aux LLMs d'accéder à des données contextuelles en lecture.

| URI Resource                             | Description                          | Format     |
| ---------------------------------------- | ------------------------------------ | ---------- |
| `thunderbird://accounts`                 | Liste des comptes configurés         | JSON       |
| `thunderbird://folders/{accountId}`      | Arborescence des dossiers            | JSON Tree  |
| `thunderbird://inbox/unread`             | Messages non lus (tous comptes)      | JSON Array |
| `thunderbird://inbox/unread/{accountId}` | Messages non lus (compte spécifique) | JSON Array |
| `thunderbird://contacts/recent`          | Contacts récemment utilisés          | JSON Array |
| `thunderbird://calendar/today`           | Événements du jour                   | JSON Array |
| `thunderbird://calendar/upcoming`        | Événements des 7 prochains jours     | JSON Array |
| `thunderbird://tasks/pending`            | Tâches non terminées                 | JSON Array |

---

## 5. Protocole JSON-RPC 2.0

### 5.1 Format des Messages

#### Request

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_messages_search",
    "arguments": {
      "subject": "facture",
      "unread": true,
      "limit": 10
    }
  }
}
```

#### Response Success

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"msg-123\",\"subject\":\"Facture Mars 2025\",...}]"
      }
    ]
  }
}
```

#### Response Error

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "field": "folderId",
      "reason": "Folder not found"
    }
  }
}
```

### 5.2 Lifecycle MCP

1. **Initialize** - Négociation des capabilities
2. **Initialized** (notification) - Confirmation du client
3. **tools/list** - Énumération des outils disponibles
4. **resources/list** - Énumération des ressources
5. **tools/call** - Appel d'outil avec arguments
6. **resources/read** - Lecture de ressource

### 5.3 Capabilities Serveur

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "subscribe": false,
      "listChanged": true
    },
    "prompts": {
      "listChanged": false
    }
  },
  "serverInfo": {
    "name": "thunderbird-mcp",
    "version": "1.3.1"
  }
}
```

---

## 6. Stack Technique

### 6.1 Extension Thunderbird

```
extension/
├── manifest.json           # Manifest V3
├── background.js           # Service Worker principal
├── api/
│   ├── messages.js         # Wrapper messenger.messages.*
│   ├── folders.js          # Wrapper messenger.folders.*
│   ├── contacts.js         # Wrapper messenger.addressBooks.*
│   ├── accounts.js         # Wrapper messenger.accounts.*
│   └── tags.js             # Wrapper messenger.messages.tags.*
├── experiments/
│   └── calendar/           # API expérimentale calendrier
│       ├── api.js
│       └── schema.json
├── native-messaging/
│   └── handler.js          # Gestionnaire Native Messaging
└── _locales/               # Internationalisation
```

**Permissions requises (manifest.json)**:

```json
{
  "permissions": [
    "messagesRead",
    "messagesMove",
    "messagesUpdate",
    "messagesTags",
    "accountsRead",
    "accountsFolders",
    "addressBooks",
    "nativeMessaging"
  ],
  "experiment_apis": {
    "calendar": {
      "schema": "experiments/calendar/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "paths": [["calendar"]],
        "script": "experiments/calendar/api.js"
      }
    }
  }
}
```

### 6.2 Serveur MCP

```
server/
├── src/
│   ├── index.ts            # Point d'entrée
│   ├── server.ts           # Configuration serveur MCP
│   ├── tools/
│   │   ├── index.ts        # Export centralisé
│   │   ├── messages.ts     # Outils messages
│   │   ├── folders.ts      # Outils dossiers
│   │   ├── contacts.ts     # Outils contacts
│   │   ├── calendar.ts     # Outils calendrier
│   │   └── tags.ts         # Outils tags
│   ├── resources/
│   │   ├── index.ts
│   │   └── handlers.ts     # Gestionnaires ressources
│   ├── native-messaging/
│   │   ├── client.ts       # Client Native Messaging
│   │   └── protocol.ts     # Sérialisation messages
│   ├── schemas/
│   │   └── *.ts            # Schémas Zod validation
│   └── utils/
│       ├── logger.ts
│       └── errors.ts
├── package.json
├── tsconfig.json
└── native-host.json        # Manifest Native Messaging
```

**Dépendances**:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0",
    "winston": "^3.14.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "vitest": "^2.0.0",
    "tsx": "^4.0.0"
  }
}
```

### 6.3 Configuration Native Messaging

**Linux/macOS** (`~/.mozilla/native-messaging-hosts/thunderbird_mcp.json`):

```json
{
  "name": "thunderbird_mcp",
  "description": "Thunderbird MCP Server Native Host",
  "path": "/usr/local/bin/thunderbird-mcp-host",
  "type": "stdio",
  "allowed_extensions": ["thunderbird-mcp@assistance-micro-design.com"]
}
```

---

## 7. Sécurité

### 7.1 Principes

1. **Consentement explicite**: Toute opération nécessite l'approbation de l'utilisateur
2. **Permissions granulaires**: Utilisation du système de permissions Thunderbird
3. **Pas de données sensibles par défaut**: Corps des emails sur demande uniquement
4. **Isolation**: Communication via Native Messaging (sandboxed)
5. **Validation stricte**: Tous les inputs validés avec Zod

### 7.2 Permissions Thunderbird

| Permission        | Accès                           |
| ----------------- | ------------------------------- |
| `messagesRead`    | Lecture headers et corps        |
| `messagesMove`    | Déplacement, copie, suppression |
| `messagesUpdate`  | Modification flags, tags        |
| `messagesTags`    | CRUD sur les tags               |
| `accountsRead`    | Lecture comptes et identités    |
| `accountsFolders` | CRUD sur les dossiers           |
| `addressBooks`    | CRUD contacts et carnets        |
| `nativeMessaging` | Communication avec app externe  |

### 7.3 Données Sensibles

- **Exclues par défaut**: Mots de passe, tokens OAuth
- **Opt-in**: Corps complet des emails (paramètre `format: full`)
- **Jamais exposées**: Clés de chiffrement, certificats S/MIME

---

## 8. Gestion des Erreurs

### 8.1 Codes d'Erreur JSON-RPC

| Code   | Signification           |
| ------ | ----------------------- |
| -32700 | Parse error             |
| -32600 | Invalid Request         |
| -32601 | Method not found        |
| -32602 | Invalid params          |
| -32603 | Internal error          |
| -32000 | Thunderbird not running |
| -32001 | Extension not installed |
| -32002 | Permission denied       |
| -32003 | Resource not found      |
| -32004 | Operation timeout       |

### 8.2 Timeouts

- **Recherche messages**: 30s (configurable)
- **Opérations CRUD**: 10s
- **Lecture ressources**: 15s
- **Native Messaging**: 5s par message

---

## 9. Tests

### 9.1 Tests Unitaires

- Validation des schémas Zod
- Sérialisation/désérialisation JSON-RPC
- Logique métier des handlers

### 9.2 Tests d'Intégration

- Communication Native Messaging
- Cycle complet tools/call
- Gestion des erreurs

### 9.3 Tests E2E

- Scénarios utilisateur complets
- Performance avec grandes boîtes mail
- Compatibilité multi-plateformes

---

## 10. Phases de Développement

### Phase 1 - MVP ✅

- [x] Architecture WebSocket (remplace Native Messaging)
- [x] Module Messages (search, list, list_unread, get, update, move, copy, delete, archive)
- [x] Module Dossiers (list, get, create, rename, delete, move, mark_read)
- [x] Module Tags (list, create, update, delete)
- [x] Serveur MCP avec SDK @modelcontextprotocol

### Phase 2 - Contacts ✅

- [x] Module Contacts CRUD complet (search, list, get, create, update, delete)
- [x] Module Carnets d'adresses (list, create, delete)
- [x] Ressources MCP (contacts/recent)
- [x] Support vCard 4.0

### Phase 3 - Calendrier ✅ (Expérimental)

- [x] Intégration API expérimentale (webext-experiments)
- [x] Module Calendriers (list, get)
- [x] Module Événements CRUD (search, list, get, create, update, move, delete)
- [x] Module Tâches CRUD (list, get, create, update, delete, complete)
- [x] Ressources calendrier (today, upcoming, tasks/pending)

### Phase 4 - Production ✅

- [x] Documentation utilisateur complète
- [x] Scripts d'installation
- [x] Extension XPI packagée
- [ ] Tests E2E complets (framework configuré)
- [ ] Publication AMO (addons.thunderbird.net)

### Phase 5 - Docker Multi-Client ✅

- [x] Architecture multi-client WebSocket
- [x] Routage par chemin (`/thunderbird`, `/mcp`)
- [x] Bridge standalone pour Docker (`bridge-standalone.ts`)
- [x] Client bridge pour mode connecté (`bridge-client.ts`)
- [x] Health endpoint HTTP (`/health`)
- [x] Support de multiples instances MCP simultanées

---

## 11. Références

### Projet

- [Thunderbird MCP - Assistance Micro Design](https://github.com/assistance-micro-design/thunderbird-mcp)

### Documentation Officielle

- [Thunderbird WebExtension API](https://webextension-api.thunderbird.net/en/mv3/)
- [Thunderbird Developer Docs](https://developer.thunderbird.net/add-ons/mailextensions)
- [MCP Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

### APIs Thunderbird

- [Messages API](https://webextension-api.thunderbird.net/en/latest/messages.html)
- [Folders API](https://webextension-api.thunderbird.net/en/mv3/folders.html)
- [AddressBooks API](https://webextension-api.thunderbird.net/en/mv3/addressBooks.html)
- [Calendar Experiments](https://github.com/thunderbird/webext-experiments)

### MCP Resources

- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Examples](https://modelcontextprotocol.io/examples)
- [FastMCP (TypeScript)](https://github.com/punkpeye/fastmcp)
- [MCP for Beginners](https://github.com/microsoft/mcp-for-beginners)

---

## 12. Annexes

### A. Schéma Contact (vCard 4.0)

```
BEGIN:VCARD
VERSION:4.0
FN:Jean Dupont
N:Dupont;Jean;;;
EMAIL;TYPE=work:jean.dupont@example.com
TEL;TYPE=cell:+33612345678
ORG:ACME Corp
END:VCARD
```

### B. Schéma Événement (iCalendar)

```
BEGIN:VEVENT
UID:event-123@thunderbird
DTSTART:20250315T100000Z
DTEND:20250315T110000Z
SUMMARY:Réunion projet
LOCATION:Salle A
DESCRIPTION:Discussion technique
END:VEVENT
```

### C. Exemple Complet tools/call

**Request**:

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_events_create",
    "arguments": {
      "calendarId": "cal-1",
      "title": "Réunion hebdo",
      "start": "2025-03-20T14:00:00Z",
      "end": "2025-03-20T15:00:00Z",
      "location": "Visio Teams",
      "description": "Point hebdomadaire équipe",
      "recurrence": {
        "frequency": "weekly",
        "until": "2025-06-20"
      }
    }
  }
}
```

**Response**:

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"evt-456\",\"calendarId\":\"cal-1\",\"title\":\"Réunion hebdo\",\"status\":\"confirmed\"}"
      }
    ]
  }
}
```
