export default function ContactsTable({ contacts, onDelete, loading }) {
  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!contacts.length) {
    return <div className="text-center py-8 text-gray-500">No contacts found</div>;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Tags</th>
            <th>Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td className="font-mono text-sm">{contact.email}</td>
              <td>
                {contact.first_name || contact.last_name
                  ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                  : '-'}
              </td>
              <td>
                {contact.tags && contact.tags.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-xs text-gray-500">
                {new Date(contact.created_at).toLocaleDateString()}
              </td>
              <td>
                <button
                  onClick={() => onDelete(contact.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
