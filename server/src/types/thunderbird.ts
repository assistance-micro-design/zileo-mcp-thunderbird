/**
 * Thunderbird Types
 * Types for Thunderbird WebExtension APIs
 * @module types/thunderbird
 */

// =============================================================================
// Account Types
// =============================================================================

/** Account types supported by Thunderbird */
export type AccountType = "imap" | "pop3" | "local" | "nntp" | "rss" | "ews";

/** Mail account representation */
export interface MailAccount {
  /** Unique account identifier */
  id: string;
  /** Display name for the account */
  name: string;
  /** Type of mail account */
  type: AccountType;
  /** Root folder of the account */
  rootFolder: MailFolder;
  /** Identities associated with this account */
  identities: MailIdentity[];
}

/** Email identity for sending */
export interface MailIdentity {
  /** Unique identity identifier */
  id: string;
  /** Account this identity belongs to */
  accountId: string;
  /** Email address */
  email: string;
  /** Display name */
  name: string;
  /** Reply-to address (optional) */
  replyTo?: string;
  /** Organization name (optional) */
  organization?: string;
  /** HTML signature */
  signature?: string;
  /** Whether signature is HTML */
  signatureIsPlainText?: boolean;
  /** BCC address for copies */
  bcc?: string;
}

// =============================================================================
// Folder Types
// =============================================================================

/** Special folder use types */
export type FolderSpecialUse =
  | "inbox"
  | "sent"
  | "drafts"
  | "trash"
  | "junk"
  | "templates"
  | "archives"
  | "outbox";

/** Mail folder representation */
export interface MailFolder {
  /** Unique folder identifier (session-based) */
  id: string;
  /** Account this folder belongs to */
  accountId: string;
  /** Display name */
  name: string;
  /** Full path from root */
  path: string;
  /** Special use type if applicable */
  specialUse?: FolderSpecialUse;
  /** Nested subfolders */
  subFolders?: MailFolder[];
  /** Whether folder is favorite */
  isFavorite?: boolean;
  /** Whether folder is virtual */
  isVirtual?: boolean;
  /** Parent folder ID */
  parentId?: string;
}

// =============================================================================
// Message Types
// =============================================================================

/** Message header information */
export interface MessageHeader {
  /** Internal message ID (not persistent) */
  id: number;
  /** Folder containing this message */
  folderId: string;
  /** Message date */
  date: string;
  /** Sender information */
  author: string;
  /** Recipients */
  recipients: string[];
  /** CC recipients */
  ccList: string[];
  /** BCC recipients */
  bccList: string[];
  /** Message subject */
  subject: string;
  /** Whether message has been read */
  read: boolean;
  /** Whether message is flagged/starred */
  flagged: boolean;
  /** Whether message is marked as junk */
  junk: boolean;
  /** Message size in bytes */
  size: number;
  /** Tags/labels applied to message */
  tags: string[];
  /** Whether message has attachments */
  hasAttachments?: boolean;
  /** Message-ID header value */
  headerMessageId?: string;
  /** External flag (stored externally) */
  external?: boolean;
}

/** Full message with MIME parts */
export interface MessagePart {
  /** Content type */
  contentType: string;
  /** Body content (for text parts) */
  body?: string;
  /** Nested parts */
  parts?: MessagePart[];
  /** Part name for attachments */
  partName?: string;
  /** Filename for attachments */
  name?: string;
  /** Headers */
  headers?: Record<string, string[]>;
}

// =============================================================================
// Tag Types
// =============================================================================

/** Message tag/label */
export interface MessageTag {
  /** Tag key (identifier) */
  key: string;
  /** Display name */
  tag: string;
  /** Color in hex format (#RRGGBB) */
  color: string;
  /** Sort order */
  ordinal?: string;
}

// =============================================================================
// Contact Types
// =============================================================================

/** Address book node */
export interface AddressBookNode {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Node type */
  type: "addressBook" | "contact" | "mailingList";
  /** Parent ID for nesting */
  parentId?: string;
  /** Whether book is read-only */
  readOnly?: boolean;
  /** Whether book is remote (CardDAV) */
  remote?: boolean;
  /** Contacts in this book (if complete=true) */
  contacts?: ContactNode[];
  /** Mailing lists in this book */
  mailingLists?: MailingListNode[];
}

/** Contact node */
export interface ContactNode {
  /** Unique identifier */
  id: string;
  /** Node type */
  type: "contact";
  /** Parent address book ID */
  parentId: string;
  /** Whether contact is read-only */
  readOnly?: boolean;
  /** Whether contact is remote */
  remote?: boolean;
  /** Contact properties */
  properties: ContactProperties;
  /** vCard representation */
  vCard?: string;
}

/** Contact properties */
export interface ContactProperties {
  /** Primary email */
  PrimaryEmail?: string;
  /** Alias for PrimaryEmail */
  email?: string;
  /** Secondary email */
  SecondEmail?: string;
  /** Display name */
  DisplayName?: string;
  /** First name */
  FirstName?: string;
  /** Last name */
  LastName?: string;
  /** Nickname */
  NickName?: string;
  /** Work phone */
  WorkPhone?: string;
  /** Home phone */
  HomePhone?: string;
  /** Cellular/mobile phone */
  CellularNumber?: string;
  /** Alias for CellularNumber */
  phone?: string;
  /** Fax number */
  FaxNumber?: string;
  /** Pager number */
  PagerNumber?: string;
  /** Home address */
  HomeAddress?: string;
  /** Home address line 2 */
  HomeAddress2?: string;
  /** Home city */
  HomeCity?: string;
  /** Home state/province */
  HomeState?: string;
  /** Home postal code */
  HomeZipCode?: string;
  /** Home country */
  HomeCountry?: string;
  /** Work address */
  WorkAddress?: string;
  /** Work address line 2 */
  WorkAddress2?: string;
  /** Work city */
  WorkCity?: string;
  /** Work state/province */
  WorkState?: string;
  /** Work postal code */
  WorkZipCode?: string;
  /** Work country */
  WorkCountry?: string;
  /** Job title */
  JobTitle?: string;
  /** Department */
  Department?: string;
  /** Company/Organization */
  Company?: string;
  /** Alias for Company */
  organization?: string;
  /** Website URL */
  WebPage1?: string;
  /** Website URL 2 */
  WebPage2?: string;
  /** Birth year */
  BirthYear?: string;
  /** Birth month */
  BirthMonth?: string;
  /** Birth day */
  BirthDay?: string;
  /** Notes */
  Notes?: string;
  /** Photo URL */
  PhotoURI?: string;
  /** Custom fields */
  [key: string]: string | undefined;
}

/** Mailing list node */
export interface MailingListNode {
  /** Unique identifier */
  id: string;
  /** Node type */
  type: "mailingList";
  /** Parent address book ID */
  parentId: string;
  /** Display name */
  name: string;
  /** Nickname */
  nickName?: string;
  /** Description */
  description?: string;
  /** Members (contact IDs) */
  contacts?: ContactNode[];
}

// =============================================================================
// Compose Types
// =============================================================================

/** Compose window details */
export interface ComposeDetails {
  /** Compose identity ID */
  identityId?: string;
  /** To recipients */
  to?: string[];
  /** CC recipients */
  cc?: string[];
  /** BCC recipients */
  bcc?: string[];
  /** Reply-To address */
  replyTo?: string[];
  /** Subject line */
  subject?: string;
  /** Body content */
  body?: string;
  /** Plain text body */
  plainTextBody?: string;
  /** Whether body is plain text */
  isPlainText?: boolean;
  /** Attachments */
  attachments?: ComposeAttachment[];
  /** Related message (for reply/forward) */
  relatedMessageId?: number;
  /** Compose type */
  type?: "new" | "reply" | "forward" | "draft";
}

/** Compose attachment */
export interface ComposeAttachment {
  /** Attachment ID */
  id?: string;
  /** Filename */
  name?: string;
  /** Size in bytes */
  size?: number;
}
