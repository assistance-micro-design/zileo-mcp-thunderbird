# Changelog

All notable changes to the Thunderbird MCP Server project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-05

### Added

#### MCP Server
- Initial release of the MCP server component
- 47 MCP tools across 7 domains:
  - **Messages** (9 tools): search, list, list_unread, get, move, copy, delete, update, archive
  - **Folders** (7 tools): list, get, create, rename, delete, move, mark_read
  - **Contacts** (9 tools): search, list, get, create, update, delete, addressbooks_list, addressbooks_create, addressbooks_delete
  - **Tags** (4 tools): list, create, update, delete
  - **Accounts** (3 tools): accounts_list, accounts_get, identities_list
  - **Calendar** (9 tools): calendars_list, calendars_get, events_search, events_list, events_get, events_create, events_update, events_move, events_delete
  - **Tasks** (6 tools): tasks_list, tasks_get, tasks_create, tasks_update, tasks_delete, tasks_complete
- 8 MCP resources for contextual data access
- Full JSON-RPC 2.0 compliance
- Native Messaging bridge to Thunderbird extension
- Comprehensive TypeScript type definitions
- Zod schema validation for all tool inputs

#### Thunderbird Extension
- Manifest V3 MailExtension
- Native Messaging handler for MCP server communication
- API wrappers for all Thunderbird WebExtension APIs:
  - messenger.messages.*
  - messenger.folders.*
  - messenger.accounts.*
  - messenger.addressBooks.*
  - messenger.tags.*
- Support for experimental Calendar API via webext-experiments

#### Documentation
- Complete API documentation for all 47 tools
- Architecture documentation with Mermaid diagrams
- Installation guides for Linux, macOS, and Windows
- Quick start guide for developers
- Cahier des charges (technical specification)

#### Infrastructure
- Monorepo structure with npm workspaces
- TypeScript 5.5+ configuration
- Vitest test framework setup
- Winston logging
- Installation and packaging scripts

### Notes

- Calendar and Tasks tools are marked as EXPERIMENTAL and require the calendar experiment API
- The extension requires Thunderbird 128.0 or later
- Native Messaging must be configured for the server to communicate with Thunderbird

## [Unreleased]

### Planned
- HTTP+SSE transport option for remote connections
- Resource subscription support
- Additional prompts for common email workflows
- Automated test suite expansion
- Performance optimizations for large mailboxes
