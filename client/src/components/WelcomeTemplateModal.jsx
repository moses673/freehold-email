import { useState, useEffect } from 'react';
import { useTemplates, useWelcomeTemplates } from '../hooks/useApi';

export default function WelcomeTemplateModal({ listId, onClose, onUpdate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const templatesApi = useTemplates();
  const welcomeApi = useWelcomeTemplates();

  useEffect(() => {
    loadData();
  }, [listId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all templates
      const allTemplates = await templatesApi.fetchTemplates();
      setTemplates(allTemplates);

      // Load current welcome template
      const current = await welcomeApi.getWelcomeTemplate(listId);
      if (current.welcomeTemplate) {
        setSelectedTemplateId(current.welcomeTemplate.id);
      }
    } catch (err) {
      setError('Failed to load templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await welcomeApi.setWelcomeTemplate(listId, selectedTemplateId);
      onUpdate?.();
      onClose();
    } catch (err) {
      setError('Failed to update welcome template: ' + err.message);
    }
  };

  const handleRemove = async () => {
    try {
      await welcomeApi.setWelcomeTemplate(listId, null);
      setSelectedTemplateId(null);
      onUpdate?.();
      onClose();
    } catch (err) {
      setError('Failed to remove welcome template: ' + err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Configure Welcome Email</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Select a template to automatically send to new contacts when they're added to this list.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-gray-500">Loading templates...</div>
        ) : (
          <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">No templates available</p>
            ) : (
              templates.map((template) => (
                <label
                  key={template.id}
                  className="flex items-start gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50 transition"
                >
                  <input
                    type="radio"
                    name="welcome-template"
                    value={template.id}
                    checked={selectedTemplateId === template.id}
                    onChange={(e) => setSelectedTemplateId(parseInt(e.target.value))}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{template.category}</div>
                    <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {template.subject}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        )}

        <div className="border-t pt-4 flex gap-2 justify-end">
          {selectedTemplateId && (
            <button
              onClick={handleRemove}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded border border-red-200"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedTemplateId === null}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
          >
            Save Welcome Template
          </button>
        </div>
      </div>
    </div>
  );
}
