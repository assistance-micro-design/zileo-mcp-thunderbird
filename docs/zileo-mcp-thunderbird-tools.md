# Zileo MCP — Thunderbird Tools

Liste des outils disponibles dans le serveur MCP Thunderbird pour integration LLM.

## Tiers d'autorisation (v1.3.1+)

Chaque outil est classifie selon son niveau de risque. Les permissions sont configurables dans les options de l'extension Thunderbird (Add-ons Manager > Zileo MCP — Thunderbird > Options).

| Tier          | Couleur | Par defaut    | Description                                             |
| ------------- | ------- | ------------- | ------------------------------------------------------- |
| `read`        | Vert    | Active        | Lecture seule (list, get, search)                       |
| `modify`      | Orange  | Active        | Modifications recuperables (create, update, move, copy) |
| `destructive` | Rouge   | **Desactive** | Operations irreversibles (delete, send)                 |

---

## Messages (10 outils)

| Nom de l'outil                     | Tier        | Description                                  |
| ---------------------------------- | ----------- | -------------------------------------------- |
| `thunderbird_messages_search`      | read        | Rechercher des messages avec filtres avances |
| `thunderbird_messages_list`        | read        | Lister les messages d'un dossier             |
| `thunderbird_messages_list_unread` | read        | Lister les messages non lus                  |
| `thunderbird_messages_list_recent` | read        | Lister les messages recents (global)         |
| `thunderbird_messages_get`         | read        | Obtenir un message specifique                |
| `thunderbird_messages_move`        | modify      | Deplacer des messages                        |
| `thunderbird_messages_copy`        | modify      | Copier des messages                          |
| `thunderbird_messages_update`      | modify      | Mettre a jour des messages (lu, tags, etc.)  |
| `thunderbird_messages_archive`     | modify      | Archiver des messages                        |
| `thunderbird_messages_delete`      | destructive | Supprimer des messages                       |

## Composition (8 outils)

| Nom de l'outil                      | Tier        | Description                                      |
| ----------------------------------- | ----------- | ------------------------------------------------ |
| `thunderbird_compose_begin_new`     | modify      | Ouvrir une fenetre de composition vide           |
| `thunderbird_compose_begin_reply`   | modify      | Ouvrir une fenetre de reponse a un message       |
| `thunderbird_compose_begin_forward` | modify      | Ouvrir une fenetre de transfert d'un message     |
| `thunderbird_compose_get_details`   | read        | Obtenir les details d'une fenetre de composition |
| `thunderbird_compose_set_details`   | modify      | Modifier le contenu d'une composition            |
| `thunderbird_compose_save_draft`    | modify      | Sauvegarder en brouillon                         |
| `thunderbird_compose_save_template` | modify      | Sauvegarder en template reutilisable             |
| `thunderbird_compose_send`          | destructive | Envoyer l'email en cours de composition          |

## Dossiers (7 outils)

| Nom de l'outil                  | Tier        | Description                   |
| ------------------------------- | ----------- | ----------------------------- |
| `thunderbird_folders_list`      | read        | Lister les dossiers           |
| `thunderbird_folders_get`       | read        | Obtenir un dossier specifique |
| `thunderbird_folders_create`    | modify      | Creer un dossier              |
| `thunderbird_folders_rename`    | modify      | Renommer un dossier           |
| `thunderbird_folders_move`      | modify      | Deplacer un dossier           |
| `thunderbird_folders_mark_read` | modify      | Marquer un dossier comme lu   |
| `thunderbird_folders_delete`    | destructive | Supprimer un dossier          |

## Contacts (9 outils)

| Nom de l'outil                    | Tier        | Description                    |
| --------------------------------- | ----------- | ------------------------------ |
| `thunderbird_contacts_search`     | read        | Rechercher des contacts        |
| `thunderbird_contacts_list`       | read        | Lister les contacts            |
| `thunderbird_contacts_get`        | read        | Obtenir un contact specifique  |
| `thunderbird_contacts_create`     | modify      | Creer un contact               |
| `thunderbird_contacts_update`     | modify      | Mettre a jour un contact       |
| `thunderbird_contacts_delete`     | destructive | Supprimer un contact           |
| `thunderbird_addressbooks_list`   | read        | Lister les carnets d'adresses  |
| `thunderbird_addressbooks_create` | modify      | Creer un carnet d'adresses     |
| `thunderbird_addressbooks_delete` | destructive | Supprimer un carnet d'adresses |

## Tags (4 outils)

| Nom de l'outil            | Tier        | Description          |
| ------------------------- | ----------- | -------------------- |
| `thunderbird_tags_list`   | read        | Lister les tags      |
| `thunderbird_tags_create` | modify      | Creer un tag         |
| `thunderbird_tags_update` | modify      | Mettre a jour un tag |
| `thunderbird_tags_delete` | destructive | Supprimer un tag     |

## Comptes (3 outils)

| Nom de l'outil                | Tier | Description                  |
| ----------------------------- | ---- | ---------------------------- |
| `thunderbird_accounts_list`   | read | Lister les comptes           |
| `thunderbird_accounts_get`    | read | Obtenir un compte specifique |
| `thunderbird_identities_list` | read | Lister les identites         |

## Calendriers (9 outils) \*

| Nom de l'outil               | Tier        | Description                      |
| ---------------------------- | ----------- | -------------------------------- |
| `thunderbird_calendars_list` | read        | Lister les calendriers           |
| `thunderbird_calendars_get`  | read        | Obtenir un calendrier specifique |
| `thunderbird_events_search`  | read        | Rechercher des evenements        |
| `thunderbird_events_list`    | read        | Lister les evenements            |
| `thunderbird_events_get`     | read        | Obtenir un evenement specifique  |
| `thunderbird_events_create`  | modify      | Creer un evenement               |
| `thunderbird_events_update`  | modify      | Mettre a jour un evenement       |
| `thunderbird_events_move`    | modify      | Deplacer un evenement            |
| `thunderbird_events_delete`  | destructive | Supprimer un evenement           |

## Taches (6 outils) \*

| Nom de l'outil               | Tier        | Description                      |
| ---------------------------- | ----------- | -------------------------------- |
| `thunderbird_tasks_list`     | read        | Lister les taches                |
| `thunderbird_tasks_get`      | read        | Obtenir une tache specifique     |
| `thunderbird_tasks_create`   | modify      | Creer une tache                  |
| `thunderbird_tasks_update`   | modify      | Mettre a jour une tache          |
| `thunderbird_tasks_complete` | modify      | Marquer une tache comme terminee |
| `thunderbird_tasks_delete`   | destructive | Supprimer une tache              |

---

\* _API experimentale utilisant webext-experiments calendar_

**Total: 56 outils MCP** (23 read, 25 modify, 8 destructive)

---

## Reference Detaillee

### thunderbird_compose_begin_new

Ouvre une nouvelle fenetre de composition avec contenu optionnel pre-rempli.

**Parametres:**

| Param       | Type     | Requis | Description                        |
| ----------- | -------- | ------ | ---------------------------------- |
| to          | string[] | Non    | Adresses email des destinataires   |
| cc          | string[] | Non    | Adresses en copie                  |
| bcc         | string[] | Non    | Adresses en copie cachee           |
| subject     | string   | Non    | Sujet de l'email                   |
| body        | string   | Non    | Corps de l'email (HTML par defaut) |
| isPlainText | boolean  | Non    | Si true, body est en texte brut    |
| identityId  | string   | Non    | ID de l'identite pour l'envoi      |

**Retour:** `{ tabId: number, windowId: number }`

### thunderbird_compose_begin_reply

Ouvre une fenetre de composition pour repondre a un message.

**Parametres:**

| Param     | Type   | Requis | Description                              |
| --------- | ------ | ------ | ---------------------------------------- |
| messageId | number | Oui    | ID du message auquel repondre            |
| replyType | string | Non    | "replyToSender" (defaut) ou "replyToAll" |

**Retour:** `{ tabId: number, windowId: number }`

### thunderbird_compose_begin_forward

Ouvre une fenetre de composition pour transferer un message.

**Parametres:**

| Param       | Type   | Requis | Description                                       |
| ----------- | ------ | ------ | ------------------------------------------------- |
| messageId   | number | Oui    | ID du message a transferer                        |
| forwardType | string | Non    | "forwardInline" (defaut) ou "forwardAsAttachment" |

**Retour:** `{ tabId: number, windowId: number }`

### thunderbird_compose_get_details

Obtient les details actuels d'une fenetre de composition.

**Parametres:**

| Param | Type   | Requis | Description            |
| ----- | ------ | ------ | ---------------------- |
| tabId | number | Oui    | ID de l'onglet compose |

**Retour:** `{ to, cc, bcc, subject, body, isPlainText, attachments, ... }`

### thunderbird_compose_set_details

Met a jour le contenu d'une fenetre de composition existante.

**Parametres:**

| Param   | Type     | Requis | Description                      |
| ------- | -------- | ------ | -------------------------------- |
| tabId   | number   | Oui    | ID de l'onglet compose           |
| to      | string[] | Non    | Nouvelles adresses destinataires |
| cc      | string[] | Non    | Nouvelles adresses CC            |
| bcc     | string[] | Non    | Nouvelles adresses BCC           |
| subject | string   | Non    | Nouveau sujet                    |
| body    | string   | Non    | Nouveau corps                    |

**Retour:** `{ success: true }`

### thunderbird_compose_save_draft

Sauvegarde la composition en cours comme brouillon.

**Parametres:**

| Param | Type   | Requis | Description            |
| ----- | ------ | ------ | ---------------------- |
| tabId | number | Oui    | ID de l'onglet compose |

**Retour:** `{ success: true, messageId: number, mode: "draft" }`

### thunderbird_compose_save_template

Sauvegarde la composition comme template reutilisable.

**Parametres:**

| Param | Type   | Requis | Description            |
| ----- | ------ | ------ | ---------------------- |
| tabId | number | Oui    | ID de l'onglet compose |

**Retour:** `{ success: true, messageId: number, mode: "template" }`

### thunderbird_compose_send

Envoie l'email en cours de composition.

**Parametres:**

| Param | Type   | Requis | Description                          |
| ----- | ------ | ------ | ------------------------------------ |
| tabId | number | Oui    | ID de l'onglet compose               |
| mode  | string | Non    | "default", "sendNow", ou "sendLater" |

**Retour:** `{ success: true, mode: "sendNow" | "sendLater", messageId?: number }`

### thunderbird_messages_list_recent

Liste les messages recents sur tous les comptes.

**Parametres:**

| Param     | Type   | Requis | Description                                        |
| --------- | ------ | ------ | -------------------------------------------------- |
| hoursAgo  | number | Non    | Nombre d'heures (defaut: 24)                       |
| limit     | number | Non    | Nombre max de messages (defaut: 50)                |
| accountId | string | Non    | Filtrer par compte specifique                      |
| sortBy    | enum   | Non    | Champ de tri: `date` (defaut), `subject`, `author` |
| sortOrder | enum   | Non    | Direction: `asc`, `desc` (defaut)                  |

**Retour:** `{ messages, total, hasMore, scanComplete }`

**Note tri:** Tous les tools `messages_search`, `messages_list`, `messages_list_unread` et `messages_list_recent` acceptent egalement `sortBy` et `sortOrder` avec les memes valeurs et les memes defauts (`date` / `desc`). Le tri est applique APRES filtrage et AVANT troncature a `limit`.

**Note pagination (v1.4.0):** ces 4 tools retournent une enveloppe
`{ messages, total, hasMore, scanComplete }` (`messages_list` echoie en plus
`limit`/`offset`). L'extension enumere toutes les pages natives via
`continueList()` jusqu'a `MAX_SCAN = 5000` messages ; `scanComplete: false`
signifie que la borne a ete atteinte et que `total` est un minorant — jamais
de troncature silencieuse. Voir `docs/api/messages-api.md` (« Pagination
semantics »).
