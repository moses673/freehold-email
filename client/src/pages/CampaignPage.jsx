import { useState, useEffect } from 'react';
import { useCampaigns, useTemplates, useLists } from '../hooks/useApi';

export default function CampaignPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [step, setStep] = useState('template'); // template, customize, select_list, preview, done

  const [formData, setFormData] = useState({
    name: '',
    template_id: null,
    list_id: null,
    subject: '',
    html_content: '',
  });

  const campaignsApi = useCampaigns();
  const templatesApi = useTemplates();
  const listsApi = useLists();

  const loadCampaigns = async () => {
    try {
      const data = await campaignsApi.fetchCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.fetchTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
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
    loadCampaigns();
    loadTemplates();
    loadLists();
  }, []);

  const handleSelectTemplate = async (templateId) => {
    try {
      const template = await templatesApi.getTemplate(templateId);
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject,
        html_content: template.html_content,
      });
      setStep('customize');
    } catch (error) {
      alert('Failed to load template: ' + error.message);
    }
  };

  const handleNext = () => {
    if (step === 'customize') {
      if (!formData.subject.trim()) {
        alert('Please enter a subject line');
        return;
      }
      setStep('select_list');
    } else if (step === 'select_list') {
      if (!formData.list_id) {
        alert('Please select a list');
        return;
      }
      setStep('preview');
    }
  };

  const handleSendCampaign = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    try {
      await campaignsApi.createCampaign(formData);
      // Get the campaign we just created and send it
      const campaigns = await campaignsApi.fetchCampaigns();
      const newCampaign = campaigns[0];

      await campaignsApi.sendCampaign(newCampaign.id);
      alert('Campaign sent successfully!');
      setStep('done');
      setShowNewCampaignModal(false);
      setFormData({
        name: '',
        template_id: null,
        list_id: null,
        subject: '',
        html_content: '',
      });
      setStep('template');
      await loadCampaigns();
    } catch (error) {
      alert('Failed to send campaign: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Campaigns</h2>
          <button
            onClick={() => {
              setShowNewCampaignModal(true);
              setStep('template');
            }}
            className="btn-primary"
          >
            New Campaign
          </button>
        </div>

        {/* Campaigns List */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Template</th>
                <th>List</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <td className="font-medium">{campaign.name}</td>
                  <td>{campaign.template_name || '-'}</td>
                  <td>{campaign.list_name}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        campaign.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td>{campaign.recipients_count}</td>
                  <td>{campaign.sent_count || '-'}</td>
                  <td className="text-sm text-gray-500">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {campaigns.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No campaigns yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Campaign Details Sidebar */}
      {selectedCampaign && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">{selectedCampaign.name}</h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Template:</strong> {selectedCampaign.template_name}
            </p>
            <p>
              <strong>List:</strong> {selectedCampaign.list_name}
            </p>
            <p>
              <strong>Status:</strong> {selectedCampaign.status}
            </p>
            <p>
              <strong>Recipients:</strong> {selectedCampaign.recipients_count}
            </p>
            <p>
              <strong>Sent:</strong> {selectedCampaign.sent_count || 0}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {new Date(selectedCampaign.created_at).toLocaleString()}
            </p>
            {selectedCampaign.sent_at && (
              <p>
                <strong>Sent At:</strong>{' '}
                {new Date(selectedCampaign.sent_at).toLocaleString()}
              </p>
            )}
          </div>

          {selectedCampaign.status === 'draft' && (
            <div className="mt-4">
              <button className="btn-primary">Send Now</button>
            </div>
          )}
        </div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaignModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowNewCampaignModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'template' && (
              <div>
                <h3 className="text-lg font-bold mb-4">Select Template</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className="w-full text-left p-3 border rounded hover:bg-gray-50"
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500">
                        {template.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 'customize' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Customize Template</h3>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input-field"
                    placeholder="e.g., Summer Sale 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('template')}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="btn-primary flex-1"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 'select_list' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Select Recipient List</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">List</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() =>
                          setFormData({ ...formData, list_id: list.id })
                        }
                        className={`w-full text-left p-3 border rounded ${
                          formData.list_id === list.id
                            ? 'bg-primary text-white border-primary'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{list.name}</div>
                        <div
                          className={`text-xs ${
                            formData.list_id === list.id
                              ? 'text-blue-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {list.contact_count} contacts
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('customize')}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="btn-primary flex-1"
                  >
                    Preview
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Preview Campaign</h3>

                <div className="bg-gray-50 p-4 rounded text-sm space-y-2">
                  <p>
                    <strong>Campaign:</strong> {formData.name}
                  </p>
                  <p>
                    <strong>Subject:</strong> {formData.subject}
                  </p>
                  <p>
                    <strong>To:</strong>{' '}
                    {lists.find((l) => l.id === formData.list_id)?.name} (
                    {
                      lists.find((l) => l.id === formData.list_id)
                        ?.contact_count
                    }{' '}
                    contacts)
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('select_list')}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSendCampaign}
                    className="btn-primary flex-1"
                  >
                    Send Campaign
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center space-y-4">
                <div className="text-4xl">✓</div>
                <h3 className="text-lg font-bold">Campaign Sent!</h3>
                <p className="text-gray-600">
                  Your campaign has been sent to the selected list.
                </p>
                <button
                  onClick={() => setShowNewCampaignModal(false)}
                  className="btn-primary w-full"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
