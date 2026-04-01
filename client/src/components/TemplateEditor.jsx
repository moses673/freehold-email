import { useState } from 'react';

export default function TemplateEditor({ template, onUpdate, onPreview }) {
  const [editedTemplate, setEditedTemplate] = useState(template || {});

  const handleChange = (field, value) => {
    setEditedTemplate({
      ...editedTemplate,
      [field]: value,
    });
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(editedTemplate);
    }
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedTemplate);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
        <input
          type="text"
          value={editedTemplate.subject || ''}
          onChange={(e) => handleChange('subject', e.target.value)}
          className="input-field"
          placeholder="Email subject (supports {{variables}})"
        />
        <p className="text-xs text-gray-500 mt-1">
          Use {{variableName}} to add dynamic content
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Content</label>
        <textarea
          value={editedTemplate.html_content || ''}
          onChange={(e) => handleChange('html_content', e.target.value)}
          className="input-field h-96 font-mono text-sm"
          placeholder="HTML content (supports {{variables}})"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={handlePreview} className="btn-secondary">
          Preview
        </button>
        <button onClick={handleSave} className="btn-primary">
          Save Changes
        </button>
      </div>
    </div>
  );
}
