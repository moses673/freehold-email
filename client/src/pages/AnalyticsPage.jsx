import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function AnalyticsPage() {
  const { request, loading, error } = useApi();
  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [eventFilter, setEventFilter] = useState('all');

  // Fetch all data on mount
  useEffect(() => {
    fetchAnalytics();
  }, [selectedCampaignId, eventFilter]);

  const fetchAnalytics = async () => {
    try {
      // Fetch overview stats
      const overviewData = await request('/api/analytics/overview');
      setOverview(overviewData);

      // Fetch summary (7-day window)
      const summaryData = await request('/api/analytics/summary');
      setSummary(summaryData);

      // Fetch campaign performance
      let campaignUrl = '/api/analytics/campaign-performance?days=90';
      if (selectedCampaignId) {
        campaignUrl += `&campaign_id=${selectedCampaignId}`;
      }
      const campaignData = await request(campaignUrl);
      setCampaigns(campaignData.data || []);

      // Fetch events
      let eventUrl = '/api/analytics/events?limit=100';
      if (eventFilter !== 'all') {
        eventUrl += `&event_type=${eventFilter}`;
      }
      if (selectedCampaignId) {
        eventUrl += `&campaign_id=${selectedCampaignId}`;
      }
      const eventData = await request(eventUrl);
      setEvents(eventData.data || []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatCard = ({ title, value, subtitle, color = 'blue' }) => {
    const colorClass = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200',
      orange: 'bg-orange-50 border-orange-200',
    }[color];

    const textColor = {
      blue: 'text-blue-700',
      green: 'text-green-700',
      purple: 'text-purple-700',
      orange: 'text-orange-700',
    }[color];

    return (
      <div className={`${colorClass} border rounded-lg p-4`}>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </div>
    );
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your email campaign performance and engagement metrics</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error loading analytics: {error}</p>
        </div>
      )}

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Contacts"
            value={overview.total_contacts}
            color="blue"
          />
          <StatCard
            title="Lists"
            value={overview.total_lists}
            color="green"
          />
          <StatCard
            title="Campaigns Sent"
            value={overview.campaigns_sent}
            color="purple"
          />
          <StatCard
            title="Emails Sent"
            value={overview.total_emails_sent}
            color="orange"
          />
        </div>
      )}

      {/* 7-Day Summary */}
      {summary && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">7-Day Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Emails Sent (7d)"
              value={summary.emails_sent_7d}
              color="blue"
            />
            <StatCard
              title="Opens (7d)"
              value={summary.opens_7d}
              subtitle={
                summary.emails_sent_7d > 0
                  ? `${((summary.opens_7d / summary.emails_sent_7d) * 100).toFixed(1)}% open rate`
                  : 'N/A'
              }
              color="green"
            />
            <StatCard
              title="Clicks (7d)"
              value={summary.clicks_7d}
              subtitle={
                summary.emails_sent_7d > 0
                  ? `${((summary.clicks_7d / summary.emails_sent_7d) * 100).toFixed(1)}% click rate`
                  : 'N/A'
              }
              color="purple"
            />
            <StatCard
              title="Bounces (7d)"
              value={summary.bounces_7d}
              color="orange"
            />
          </div>
        </div>
      )}

      {/* Campaign Performance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Campaign Performance</h2>
          <p className="text-sm text-gray-600 mt-1">Last 90 days</p>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No campaigns to display yet. Create and send your first campaign!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Campaign</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Sent</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Opens</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Clicks</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Bounces</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Open Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Click Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => setSelectedCampaignId(
                      selectedCampaignId === campaign.id ? null : campaign.id
                    )}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'sending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.sent_count}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.opens}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.clicks}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{campaign.bounces}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {campaign.open_rate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {campaign.click_rate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(campaign.sent_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent Events</h2>
              <p className="text-sm text-gray-600 mt-1">Email delivery, opens, clicks, and bounces</p>
            </div>
            <div className="flex gap-2">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Events</option>
                <option value="delivery">Delivery</option>
                <option value="open">Opens</option>
                <option value="click">Clicks</option>
                <option value="bounce">Bounces</option>
                <option value="spam">Spam Complaints</option>
                <option value="unsubscribe">Unsubscribes</option>
              </select>
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No events recorded yet. Webhook data will appear here once campaigns are sent and events are tracked.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Event Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Message ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {events.slice(0, 50).map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        event.event_type === 'open'
                          ? 'bg-blue-100 text-blue-800'
                          : event.event_type === 'click'
                          ? 'bg-green-100 text-green-800'
                          : event.event_type === 'bounce'
                          ? 'bg-red-100 text-red-800'
                          : event.event_type === 'delivery'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono text-xs">
                      {event.email || event.recipient}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                      {event.message_id ? event.message_id.substring(0, 16) + '...' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(event.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
