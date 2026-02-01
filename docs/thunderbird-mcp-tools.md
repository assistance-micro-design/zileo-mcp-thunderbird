# Thunderbird MCP Tools

Liste des outils disponibles dans le serveur MCP Thunderbird pour integration LLM.

## Messages (10 outils)

| Nom de l'outil                     | Description                                  |
| ---------------------------------- | -------------------------------------------- |
| `thunderbird_messages_search`      | Rechercher des messages avec filtres avances |
| `thunderbird_messages_list`        | Lister les messages d'un dossier             |
| `thunderbird_messages_list_unread` | Lister les messages non lus                  |
| `thunderbird_messages_list_recent` | Lister les messages recents (global)         |
| `thunderbird_messages_get`         | Obtenir un message specifique                |
| `thunderbird_messages_move`        | Deplacer des messages                        |
| `thunderbird_messages_copy`        | Copier des messages                          |
| `thunderbird_messages_delete`      | Supprimer des messages                       |
| `thunderbird_messages_update`      | Mettre a jour des messages (lu, tags, etc.)  |
| `thunderbird_messages_archive`     | Archiver des messages                        |

## Composition (8 outils)

| Nom de l'outil                      | Description                                      |
| ----------------------------------- | ------------------------------------------------ |
| `thunderbird_compose_begin_new`     | Ouvrir une fenetre de composition vide           |
| `thunderbird_compose_begin_reply`   | Ouvrir une fenetre de reponse a un message       |
| `thunderbird_compose_begin_forward` | Ouvrir une fenetre de transfert d'un message     |
| `thunderbird_compose_get_details`   | Obtenir les details d'une fenetre de composition |
| `thunderbird_compose_set_details`   | Modifier le contenu d'une composition            |
| `thunderbird_compose_save_draft`    | Sauvegarder en brouillon                         |
| `thunderbird_compose_save_template` | Sauvegarder en template reutilisable             |
| `thunderbird_compose_send`          | Envoyer l'email en cours de composition          |

## Dossiers (7 outils)

| Nom de l'outil                  | Description                   |
| ------------------------------- | ----------------------------- |
| `thunderbird_folders_list`      | Lister les dossiers           |
| `thunderbird_folders_get`       | Obtenir un dossier specifique |
| `thunderbird_folders_create`    | Creer un dossier              |
| `thunderbird_folders_rename`    | Renommer un dossier           |
| `thunderbird_folders_delete`    | Supprimer un dossier          |
| `thunderbird_folders_move`      | Deplacer un dossier           |
| `thunderbird_folders_mark_read` | Marquer un dossier comme lu   |

## Contacts (9 outils)

| Nom de l'outil                    | Description                    |
| --------------------------------- | ------------------------------ |
| `thunderbird_contacts_search`     | Rechercher des contacts        |
| `thunderbird_contacts_list`       | Lister les contacts            |
| `thunderbird_contacts_get`        | Obtenir un contact specifique  |
| `thunderbird_contacts_create`     | Creer un contact               |
| `thunderbird_contacts_update`     | Mettre a jour un contact       |
| `thunderbird_contacts_delete`     | Supprimer un contact           |
| `thunderbird_addressbooks_list`   | Lister les carnets d'adresses  |
| `thunderbird_addressbooks_create` | Creer un carnet d'adresses     |
| `thunderbird_addressbooks_delete` | Supprimer un carnet d'adresses |

## Tags (4 outils)

| Nom de l'outil            | Description          |
| ------------------------- | -------------------- |
| `thunderbird_tags_list`   | Lister les tags      |
| `thunderbird_tags_create` | Creer un tag         |
| `thunderbird_tags_update` | Mettre a jour un tag |
| `thunderbird_tags_delete` | Supprimer un tag     |

## Comptes (3 outils)

| Nom de l'outil                | Description                  |
| ----------------------------- | ---------------------------- |
| `thunderbird_accounts_list`   | Lister les comptes           |
| `thunderbird_accounts_get`    | Obtenir un compte specifique |
| `thunderbird_identities_list` | Lister les identites         |

## Calendriers (9 outils) \*

| Nom de l'outil               | Description                      |
| ---------------------------- | -------------------------------- |
| `thunderbird_calendars_list` | Lister les calendriers           |
| `thunderbird_calendars_get`  | Obtenir un calendrier specifique |
| `thunderbird_events_search`  | Rechercher des evenements        |
| `thunderbird_events_list`    | Lister les evenements            |
| `thunderbird_events_get`     | Obtenir un evenement specifique  |
| `thunderbird_events_create`  | Creer un evenement               |
| `thunderbird_events_update`  | Mettre a jour un evenement       |
| `thunderbird_events_move`    | Deplacer un evenement            |
| `thunderbird_events_delete`  | Supprimer un evenement           |

## Taches (6 outils) \*

| Nom de l'outil               | Description                      |
| ---------------------------- | -------------------------------- |
| `thunderbird_tasks_list`     | Lister les taches                |
| `thunderbird_tasks_get`      | Obtenir une tache specifique     |
| `thunderbird_tasks_create`   | Creer une tache                  |
| `thunderbird_tasks_update`   | Mettre a jour une tache          |
| `thunderbird_tasks_delete`   | Supprimer une tache              |
| `thunderbird_tasks_complete` | Marquer une tache comme terminee |

---

\* _API experimentale utilisant webext-experiments calendar_

**Total: 56 outils MCP**

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

| Param     | Type   | Requis | Description                         |
| --------- | ------ | ------ | ----------------------------------- |
| hoursAgo  | number | Non    | Nombre d'heures (defaut: 24)        |
| limit     | number | Non    | Nombre max de messages (defaut: 50) |
| accountId | string | Non    | Filtrer par compte specifique       |

**Retour:** Liste des messages recents avec metadata
