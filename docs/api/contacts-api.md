# Contacts API Documentation

This document describes all MCP tools for contact and address book operations in the Thunderbird MCP Server.

## Overview

The Contacts API provides comprehensive contact management capabilities including search, CRUD operations on contacts, and address book management. Contacts can be managed using either structured properties or vCard format.

**Permission Required**: `addressBooks`

---

## Contacts Operations

### thunderbird_contacts_search

Search for contacts across all address books or within a specific address book.

#### Description

Performs a search for contacts matching the query string against name, email, and other contact fields.

#### Parameters

| Name            | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `query`         | string | Yes      | Search term to match against contact fields           |
| `addressBookId` | string | No       | Specific address book to search within (omit for all) |
| `limit`         | number | No       | Maximum number of results to return (default: 50)     |

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"contact-123\",
    \"addressBookId\": \"addressbook-1\",
    \"type\": \"contact\",
    \"properties\": {
      \"DisplayName\": \"Jean Dupont\",
      \"FirstName\": \"Jean\",
      \"LastName\": \"Dupont\",
      \"PrimaryEmail\": \"jean.dupont@example.com\",
      \"SecondEmail\": \"j.dupont@work.com\",
      \"CellularNumber\": \"+33612345678\",
      \"WorkPhone\": \"+33144556677\",
      \"Company\": \"ACME Corp\",
      \"JobTitle\": \"Senior Developer\",
      \"Notes\": \"Contacted via email\"
    }
  }]"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-020",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_search",
    "arguments": {
      "query": "dupont",
      "limit": 10
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-020",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"contact-456\",\"addressBookId\":\"addressbook-1\",\"type\":\"contact\",\"properties\":{\"DisplayName\":\"Jean Dupont\",\"PrimaryEmail\":\"jean.dupont@example.com\",\"Company\":\"ACME Corp\"}}]"
      }
    ]
  }
}
```

---

### thunderbird_contacts_list

List all contacts in a specific address book with pagination.

#### Description

Retrieves a paginated list of contacts from an address book.

#### Parameters

| Name            | Type   | Required | Description                                                    |
| --------------- | ------ | -------- | -------------------------------------------------------------- |
| `addressBookId` | string | Yes      | ID of the address book to list contacts from                   |
| `limit`         | number | No       | Maximum number of contacts to return (default: 100, max: 1000) |
| `offset`        | number | No       | Number of contacts to skip for pagination (default: 0)         |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"contacts\": [...],
    \"total\": 450,
    \"offset\": 0,
    \"limit\": 100,
    \"hasMore\": true
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-021",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_list",
    "arguments": {
      "addressBookId": "addressbook-1",
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

### thunderbird_contacts_get

Get detailed information about a specific contact.

#### Description

Retrieves complete contact information including all properties.

#### Parameters

| Name        | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| `contactId` | string | Yes      | Unique identifier of the contact |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"id\": \"contact-123\",
    \"addressBookId\": \"addressbook-1\",
    \"type\": \"contact\",
    \"properties\": {
      \"DisplayName\": \"Jean Dupont\",
      \"FirstName\": \"Jean\",
      \"LastName\": \"Dupont\",
      \"PrimaryEmail\": \"jean.dupont@example.com\",
      \"SecondEmail\": \"j.dupont@work.com\",
      \"CellularNumber\": \"+33612345678\",
      \"WorkPhone\": \"+33144556677\",
      \"HomePhone\": \"+33199887766\",
      \"Company\": \"ACME Corp\",
      \"JobTitle\": \"Senior Developer\",
      \"Department\": \"Engineering\",
      \"WebPage1\": \"https://example.com\",
      \"WebPage2\": \"https://linkedin.com/in/jeandupont\",
      \"WorkAddress\": \"123 Business St\",
      \"WorkCity\": \"Paris\",
      \"WorkState\": \"IDF\",
      \"WorkZipCode\": \"75001\",
      \"WorkCountry\": \"France\",
      \"HomeAddress\": \"456 Home Ave\",
      \"HomeCity\": \"Paris\",
      \"HomeZipCode\": \"75015\",
      \"HomeCountry\": \"France\",
      \"Notes\": \"Important client contact\"
    }
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-022",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_get",
    "arguments": {
      "contactId": "contact-123"
    }
  }
}
```

---

### thunderbird_contacts_create

Create a new contact in an address book.

#### Description

Creates a new contact using either structured properties or vCard format.

#### Parameters

| Name            | Type   | Required    | Description                                                      |
| --------------- | ------ | ----------- | ---------------------------------------------------------------- |
| `addressBookId` | string | Yes         | ID of the address book to create contact in                      |
| `properties`    | object | Conditional | Contact properties (required if vCard not provided)              |
| `vCard`         | string | Conditional | vCard 4.0 formatted string (required if properties not provided) |

#### Standard Properties

| Property         | Type   | Description               |
| ---------------- | ------ | ------------------------- |
| `DisplayName`    | string | Full display name         |
| `FirstName`      | string | First name                |
| `LastName`       | string | Last name                 |
| `PrimaryEmail`   | string | Primary email address     |
| `SecondEmail`    | string | Secondary email address   |
| `CellularNumber` | string | Mobile phone number       |
| `WorkPhone`      | string | Work phone number         |
| `HomePhone`      | string | Home phone number         |
| `Company`        | string | Company/organization name |
| `JobTitle`       | string | Job title/position        |
| `Department`     | string | Department                |
| `WebPage1`       | string | Primary website URL       |
| `WebPage2`       | string | Secondary website URL     |
| `WorkAddress`    | string | Work street address       |
| `WorkCity`       | string | Work city                 |
| `WorkState`      | string | Work state/province       |
| `WorkZipCode`    | string | Work postal code          |
| `WorkCountry`    | string | Work country              |
| `HomeAddress`    | string | Home street address       |
| `HomeCity`       | string | Home city                 |
| `HomeState`      | string | Home state/province       |
| `HomeZipCode`    | string | Home postal code          |
| `HomeCountry`    | string | Home country              |
| `Notes`          | string | Additional notes          |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"contactId\": \"contact-789\",
    \"addressBookId\": \"addressbook-1\"
  }"
}
```

#### Example Request (Properties)

```json
{
  "jsonrpc": "2.0",
  "id": "req-023",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_create",
    "arguments": {
      "addressBookId": "addressbook-1",
      "properties": {
        "DisplayName": "Marie Martin",
        "FirstName": "Marie",
        "LastName": "Martin",
        "PrimaryEmail": "marie.martin@example.com",
        "CellularNumber": "+33698765432",
        "Company": "TechStart Inc",
        "JobTitle": "Product Manager"
      }
    }
  }
}
```

#### Example Request (vCard)

```json
{
  "jsonrpc": "2.0",
  "id": "req-024",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_create",
    "arguments": {
      "addressBookId": "addressbook-1",
      "vCard": "BEGIN:VCARD\nVERSION:4.0\nFN:Marie Martin\nN:Martin;Marie;;;\nEMAIL;TYPE=work:marie.martin@example.com\nTEL;TYPE=cell:+33698765432\nORG:TechStart Inc\nTITLE:Product Manager\nEND:VCARD"
    }
  }
}
```

---

### thunderbird_contacts_update

Update an existing contact.

#### Description

Modifies contact information using either partial properties update or complete vCard replacement.

#### Parameters

| Name         | Type   | Required    | Description                                                      |
| ------------ | ------ | ----------- | ---------------------------------------------------------------- |
| `contactId`  | string | Yes         | ID of the contact to update                                      |
| `properties` | object | Conditional | Properties to update (required if vCard not provided)            |
| `vCard`      | string | Conditional | Complete vCard replacement (required if properties not provided) |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"contactId\": \"contact-123\",
    \"updated\": [\"PrimaryEmail\", \"JobTitle\", \"Company\"]
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-025",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_update",
    "arguments": {
      "contactId": "contact-123",
      "properties": {
        "JobTitle": "Senior Product Manager",
        "Company": "Global Solutions Ltd",
        "WorkPhone": "+33144998877"
      }
    }
  }
}
```

---

### thunderbird_contacts_delete

Delete a contact from an address book.

#### Description

Permanently removes a contact from Thunderbird.

#### Parameters

| Name        | Type   | Required | Description                 |
| ----------- | ------ | -------- | --------------------------- |
| `contactId` | string | Yes      | ID of the contact to delete |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"contactId\": \"contact-123\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-026",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_contacts_delete",
    "arguments": {
      "contactId": "contact-old-456"
    }
  }
}
```

#### Warning

Contact deletion is permanent and cannot be undone.

---

## Address Book Operations

### thunderbird_addressbooks_list

List all address books in Thunderbird.

#### Description

Retrieves all address books including system and user-created address books.

#### Parameters

None

#### Response Format

```json
{
  "type": "text",
  "text": "[{
    \"id\": \"addressbook-1\",
    \"name\": \"Personal Address Book\",
    \"type\": \"jsaddrbook\",
    \"readOnly\": false,
    \"contactCount\": 245
  }, {
    \"id\": \"addressbook-2\",
    \"name\": \"Collected Addresses\",
    \"type\": \"mork\",
    \"readOnly\": false,
    \"contactCount\": 89
  }]"
}
```

#### Address Book Types

- `jsaddrbook` - Modern JavaScript-based address book (default)
- `mork` - Legacy Mork database format
- `ldap` - Remote LDAP directory (read-only)
- `carddav` - CardDAV synchronized address book

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-027",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_addressbooks_list",
    "arguments": {}
  }
}
```

---

### thunderbird_addressbooks_create

Create a new address book.

#### Description

Creates a new local address book in Thunderbird.

#### Parameters

| Name   | Type   | Required | Description                  |
| ------ | ------ | -------- | ---------------------------- |
| `name` | string | Yes      | Name of the new address book |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"addressBookId\": \"addressbook-5\",
    \"name\": \"Work Contacts\"
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-028",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_addressbooks_create",
    "arguments": {
      "name": "Client Contacts 2025"
    }
  }
}
```

---

### thunderbird_addressbooks_delete

Delete an address book and all its contacts.

#### Description

Permanently removes an address book and all contacts within it.

#### Parameters

| Name            | Type   | Required | Description                      |
| --------------- | ------ | -------- | -------------------------------- |
| `addressBookId` | string | Yes      | ID of the address book to delete |

#### Response Format

```json
{
  "type": "text",
  "text": "{
    \"success\": true,
    \"addressBookId\": \"addressbook-5\",
    \"deletedContactCount\": 78
  }"
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "req-029",
  "method": "tools/call",
  "params": {
    "name": "thunderbird_addressbooks_delete",
    "arguments": {
      "addressBookId": "addressbook-old-1"
    }
  }
}
```

#### Restrictions

- Cannot delete system address books ("Personal Address Book", "Collected Addresses")
- Cannot delete remote address books (LDAP, CardDAV)
- Deletion is permanent and cannot be undone

#### Warning

All contacts in the address book will be permanently deleted.

---

## Common Error Codes

All contact operations may return these error codes:

| Code   | Message                 | Description                                                  |
| ------ | ----------------------- | ------------------------------------------------------------ |
| -32000 | Thunderbird not running | Thunderbird application is not active                        |
| -32001 | Extension not installed | Thunderbird MCP extension not found                          |
| -32002 | Permission denied       | addressBooks permission not granted                          |
| -32003 | Resource not found      | Contact or address book not found                            |
| -32004 | Operation timeout       | Operation exceeded timeout limit (10s)                       |
| -32602 | Invalid params          | Invalid properties, vCard format, or missing required fields |
| -32603 | Internal error          | Duplicate contact, read-only address book, etc.              |

---

## vCard Format

### vCard 4.0 Structure

The Contacts API supports vCard 4.0 format (RFC 6350):

```
BEGIN:VCARD
VERSION:4.0
FN:Jean Dupont
N:Dupont;Jean;;;
EMAIL;TYPE=work:jean.dupont@example.com
EMAIL;TYPE=home:j.dupont@personal.com
TEL;TYPE=cell:+33612345678
TEL;TYPE=work:+33144556677
ORG:ACME Corp
TITLE:Senior Developer
ADR;TYPE=work:;;123 Business St;Paris;IDF;75001;France
URL:https://example.com
NOTE:Important client contact
END:VCARD
```

### vCard Property Mapping

| vCard Property    | Thunderbird Property |
| ----------------- | -------------------- |
| `FN`              | `DisplayName`        |
| `N` (surname)     | `LastName`           |
| `N` (given)       | `FirstName`          |
| `EMAIL;TYPE=work` | `PrimaryEmail`       |
| `EMAIL;TYPE=home` | `SecondEmail`        |
| `TEL;TYPE=cell`   | `CellularNumber`     |
| `TEL;TYPE=work`   | `WorkPhone`          |
| `TEL;TYPE=home`   | `HomePhone`          |
| `ORG`             | `Company`            |
| `TITLE`           | `JobTitle`           |
| `URL`             | `WebPage1`           |
| `NOTE`            | `Notes`              |
| `ADR;TYPE=work`   | Work address fields  |
| `ADR;TYPE=home`   | Home address fields  |

---

## Best Practices

### Contact Data Quality

- Always provide `DisplayName` for better contact recognition
- Include both name components (`FirstName`, `LastName`) when possible
- Use standard phone number formats (E.164 recommended: +33612345678)
- Validate email addresses before creating contacts

### Search Optimization

- Use specific search terms for better performance
- Limit search scope to specific address book when possible
- Implement pagination for large result sets

### Batch Operations

- Create contacts in batches during imports
- Use address book organization to group related contacts
- Consider using vCard format for importing from external systems

### Organization Strategies

**By Purpose**:

- Personal Address Book: Family and friends
- Work Contacts: Professional contacts
- Client Contacts: Business clients
- Vendors: Service providers

**By Project**:

- Project A Team
- Project B Stakeholders
- Freelancers Pool

### vCard vs Properties

**Use Properties When**:

- Creating/updating contacts programmatically
- Partial updates needed
- Working with simple contact data

**Use vCard When**:

- Importing contacts from external systems
- Exporting contacts for backup
- Maintaining compatibility with other applications
- Handling complex contact data

---

## Performance Considerations

### Operation Speeds

- Contact search: Fast (< 1 second for typical address books)
- Contact CRUD: Fast (< 1 second)
- Address book listing: Very fast (< 500ms)
- Large imports: Use batching for >100 contacts

### Limitations

- Maximum contacts per address book: ~10,000 (performance degrades beyond)
- Search query length: 255 characters maximum
- vCard size: 10KB recommended maximum
- Concurrent operations: Limit to 5 simultaneous contact operations

---

## Security Considerations

- Contact data is stored locally in Thunderbird profile
- All operations require `addressBooks` permission
- Remote address books (LDAP, CardDAV) may be read-only
- Sensitive contact information should be handled with care
- No contact data is transmitted outside Thunderbird except through MCP protocol
- vCard parsing is validated to prevent injection attacks
