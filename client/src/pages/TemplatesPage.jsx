import { useState, useEffect } from 'react';
import { useTemplates } from '../hooks/useApi';
import TemplateEditor from '../components/TemplateEditor';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const templatesApi = useTemplates();

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.fetchTemplates(selectedCategory);
      setTemplates(data);
      if (data.length && !selectedTemplate) {
        setSelectedTemplate(data[0]);
      }
    } catch (error) {
      alert('Failed to load templates: ' + error.message);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const handleSelectTemplate = async (template) => {
    try {
      const fullTemplate = await templatesApi.getTemplate(template.id);
      setSelectedTemplate(fullTemplate);
      setShowPreview(false);
    } catch (error) {
      alert('Failed to load template: ' + error.message);
    }
  };

  const handlePreviewTemplate = async (template) => {
    // For demo, use placeholder variables
    const demoVars = {
      firstName: 'John',
      lastName: 'Doe',
      discount: '25',
      shopLink: '#',
      expiryDate: new Date().toLocaleDateString(),
      monthYear: new Date().toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      productName: 'Amazing Product',
      hours: '12',
      hoursRemaining: '6',
      eventName: 'Spring Conference 2024',
      eventDate: '2024-04-15',
      eventTime: '2:00 PM',
      eventLocation: 'San Francisco, CA',
      rsvpLink: '#',
      incentive: '20% off',
      articlePreview: 'Interesting article excerpt here...',
      articleLink: '#',
      highlight1: 'Feature 1',
      highlight2: 'Feature 2',
      highlight3: 'Feature 3',
      features: 'Feature list here',
      learnMoreLink: '#',
      orderNumber: '12345',
      total: '$99.99',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      trackingLink: '#',
      getStartedLink: '#',
      helpLink: '#',
      reactivationLink: '#',
    };

    try {
      const previewData = await templatesApi.previewTemplate(template.id, demoVars);
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      alert('Failed to preview: ' + error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Template List */}
      <div className="md:col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold text-gray-800 mb-4">Templates</h3>

          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-3 rounded cursor-pointer transition ${
                  selectedTemplate?.id === template.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                }`}
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className={`text-xs ${
                  selectedTemplate?.id === template.id
                    ? 'text-blue-100'
                    : 'text-gray-500'
                }`}>
                  {template.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Template Editor and Preview */}
      <div className="md:col-span-3">
        {selectedTemplate ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4">
                {selectedTemplate.name}
              </h3>
              <TemplateEditor
                template={selectedTemplate}
                onPreview={() => handlePreviewTemplate(selectedTemplate)}
                onUpdate={(template) => {
                  console.log('Template updated:', template);
                  // Save would go here
                }}
              />
            </div>

            {/* Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4">Preview</h3>
              {showPreview && preview ? (
                <div className="email-preview">
                  <div className="mb-4">
                    <p className="text-xs text-gray-600">Subject:</p>
                    <p className="font-mono text-sm text-gray-800">{preview.subject}</p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-600 mb-2">Email Content:</p>
                    <iframe
                      srcDoc={preview.html_content}
                      title="Preview"
                      className="w-full border-0 h-96 rounded bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  Click Preview to see email rendering
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Loading templates...
          </div>
        )}
      </div>
    </div>
  );
}
