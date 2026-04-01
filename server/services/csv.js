/**
 * CSV parsing and export utilities
 * Frontend uses Papaparse for parsing, backend uses this for export
 */

/**
 * Convert contacts array to CSV string
 */
export function contactsToCsv(contacts) {
  const headers = ['email', 'first_name', 'last_name', 'tags'];
  const rows = contacts.map(contact => [
    escape(contact.email),
    escape(contact.first_name || ''),
    escape(contact.last_name || ''),
    contact.tags ? contact.tags.join(';') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Validate contact data from CSV
 * Returns { valid: boolean, errors: string[], contacts: object[] }
 */
export function validateContactsFromCsv(contacts) {
  const errors = [];
  const validatedContacts = [];

  contacts.forEach((contact, index) => {
    const row = index + 2; // +2 for header and 1-based indexing

    // Email is required
    if (!contact.email || !contact.email.trim()) {
      errors.push(`Row ${row}: Missing email`);
      return;
    }

    // Basic email validation
    if (!isValidEmail(contact.email)) {
      errors.push(`Row ${row}: Invalid email format: ${contact.email}`);
      return;
    }

    validatedContacts.push({
      email: contact.email.trim().toLowerCase(),
      first_name: (contact.first_name || '').trim() || null,
      last_name: (contact.last_name || '').trim() || null,
      tags: (contact.tags || '')
        .split(';')
        .map(tag => tag.trim())
        .filter(tag => tag)
        .slice(0, 10), // Max 10 tags per contact
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    contacts: validatedContacts,
  };
}

/**
 * Basic email validation
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Escape CSV special characters
 */
function escape(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).replace(/"/g, '""');
}

export default {
  contactsToCsv,
  validateContactsFromCsv,
};
