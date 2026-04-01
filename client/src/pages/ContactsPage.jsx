import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { useContacts, useLists } from '../hooks/useApi';
import ContactsTable from '../components/ContactsTable';
import WelcomeTemplateModal from '../components/WelcomeTemplateModal';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [lists, setLists] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedListId, setSelectedListId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const contactsApi = useContacts();
  const listsApi = useLists();

  const loadContacts = async () => {
    try {
      const data = await contactsApi.fetchContacts(page, search, selectedListId);
      setContacts(data.data);
      setPagination(data.pagination);
    } catch (error) {
      alert('Failed to load contacts: ' + error.message);
    }
  };

  const loadLists = async () => {
    try {
      const data = await listsApi.fetchLists();
      setLists(data);
    } catch (error) {
      console.error('Failed to load lists:', error);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [page, search, selectedListId]);

  useEffect(() => {
    loadLists();
  }, []);

  const handleDeleteContact = async (id) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await contactsApi.deleteContact(id);
      await loadContacts();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await listsApi.createList({ name: newListName });
      setNewListName('');
      await loadLists();
    } catch (error) {
      alert('Failed to create list: ' + error.message);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile) return;

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const result = await contactsApi.importContacts(
            results.data,
            selectedListId
          );
          alert(
            `Import successful!\nInserted: ${result.inserted}\nUpdated: ${result.updated}`
          );
          setCsvFile(null);
          setShowImportModal(false);
          await loadContacts();
        } catch (error) {
          alert('Import failed: ' + error.message);
        }
      },
      error: (error) => {
        alert('CSV parse error: ' + error.message);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Contacts</h2>

        {/* Search and filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by email, name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field"
          />

          <select
            value={selectedListId || ''}
            onChange={(e) => {
              setSelectedListId(e.target.value ? parseInt(e.target.value) : null);
              setPage(1);
            }}
            className="input-field"
          >
            <option value="">All Lists</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name} ({list.contact_count})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex-1"
            >
              Import CSV
            </button>
          </div>
        </div>

        {/* Contacts table */}
        <ContactsTable
          contacts={contacts}
          onDelete={handleDeleteContact}
          loading={contactsApi.loading}
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-3 py-1">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Lists sidebar */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Lists</h3>

        <div className="space-y-2 mb-4">
          {lists.map((list) => (
            <div
              key={list.id}
              className={`p-3 rounded border cursor-pointer transition ${
                selectedListId === list.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div
                onClick={() => {
                  setSelectedListId(list.id);
                  setPage(1);
                }}
              >
                <div className="font-medium text-gray-800">{list.name}</div>
                <div className="text-xs text-gray-500">{list.contact_count} contacts</div>
                {list.welcome_template_name && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Welcome email configured
                  </div>
                )}
              </div>
              {selectedListId === list.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWelcomeModal(true);
                  }}
                  className="mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 w-full"
                >
                  Configure Welcome Email
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t pt-4 space-y-2">
          <input
            type="text"
            placeholder="New list name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="input-field text-sm"
          />
          <button
            onClick={handleCreateList}
            className="w-full btn-primary text-sm"
          >
            Create List
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Import Contacts from CSV</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="w-full border rounded p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Columns: email, first_name, last_name, tags (semicolon-separated)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assign to List (optional)</label>
                <select
                  value={selectedListId || ''}
                  onChange={(e) => setSelectedListId(e.target.value ? parseInt(e.target.value) : null)}
                  className="input-field"
                >
                  <option value="">None</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleImportCsv}
                  disabled={!csvFile}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Template Modal */}
      {showWelcomeModal && (
        <WelcomeTemplateModal
          listId={selectedListId}
          onClose={() => setShowWelcomeModal(false)}
          onUpdate={loadLists}
        />
      )}
    </div>
  );
}
