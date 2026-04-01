import { useState, useCallback } from 'react';

// Empty string = relative URLs, so API calls go to the same origin.
// Set VITE_API_URL at build time only if API lives on a different host.
const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Hook for making API calls with loading/error states
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('freehold_token');
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error, setError };
}

/**
 * Fetch contacts
 */
export function useContacts() {
  const api = useApi();

  const fetchContacts = useCallback(async (page = 1, search = '', listId = null) => {
    const params = new URLSearchParams();
    params.append('page', page);
    if (search) params.append('search', search);
    if (listId) params.append('list_id', listId);
    return api.request(`/api/contacts?${params}`);
  }, [api]);

  const createContact = useCallback((contact) => {
    return api.request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }, [api]);

  const updateContact = useCallback((id, contact) => {
    return api.request(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  }, [api]);

  const deleteContact = useCallback((id) => {
    return api.request(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  }, [api]);

  const importContacts = useCallback((contacts, listId = null) => {
    return api.request('/api/contacts/import', {
      method: 'POST',
      body: JSON.stringify({ contacts, list_id: listId }),
    });
  }, [api]);

  return {
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    importContacts,
    loading: api.loading,
    error: api.error,
  };
}

/**
 * Fetch lists
 */
export function useLists() {
  const api = useApi();

  const fetchLists = useCallback(async () => {
    return api.request('/api/lists');
  }, [api]);

  const createList = useCallback((list) => {
    return api.request('/api/lists', {
      method: 'POST',
      body: JSON.stringify(list),
    });
  }, [api]);

  const updateList = useCallback((id, list) => {
    return api.request(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(list),
    });
  }, [api]);

  const deleteList = useCallback((id) => {
    return api.request(`/api/lists/${id}`, {
      method: 'DELETE',
    });
  }, [api]);

  return {
    fetchLists,
    createList,
    updateList,
    deleteList,
    loading: api.loading,
    error: api.error,
  };
}

/**
 * Fetch templates
 */
export function useTemplates() {
  const api = useApi();

  const fetchTemplates = useCallback(async (category = null) => {
    const params = category ? `?category=${category}` : '';
    return api.request(`/api/templates${params}`);
  }, [api]);

  const getTemplate = useCallback((id) => {
    return api.request(`/api/templates/${id}`);
  }, [api]);

  const previewTemplate = useCallback((templateId, variables) => {
    return api.request('/api/templates/preview', {
      method: 'POST',
      body: JSON.stringify({ template_id: templateId, variables }),
    });
  }, [api]);

  return {
    fetchTemplates,
    getTemplate,
    previewTemplate,
    loading: api.loading,
    error: api.error,
  };
}

/**
 * Fetch campaigns
 */
export function useCampaigns() {
  const api = useApi();

  const fetchCampaigns = useCallback(async (status = null) => {
    const params = status ? `?status=${status}` : '';
    return api.request(`/api/campaigns${params}`);
  }, [api]);

  const getCampaign = useCallback((id) => {
    return api.request(`/api/campaigns/${id}`);
  }, [api]);

  const createCampaign = useCallback((campaign) => {
    return api.request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign),
    });
  }, [api]);

  const updateCampaign = useCallback((id, campaign) => {
    return api.request(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(campaign),
    });
  }, [api]);

  const sendCampaign = useCallback((id) => {
    return api.request(`/api/campaigns/${id}/send`, {
      method: 'POST',
    });
  }, [api]);

  const getCampaignStatus = useCallback((id) => {
    return api.request(`/api/campaigns/${id}/status`);
  }, [api]);

  return {
    fetchCampaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    sendCampaign,
    getCampaignStatus,
    loading: api.loading,
    error: api.error,
  };
}

/**
 * Fetch analytics data
 */
export function useAnalytics() {
  const api = useApi();

  const fetchOverview = useCallback(async () => {
    return api.request('/api/analytics/overview');
  }, [api]);

  const fetchSummary = useCallback(async () => {
    return api.request('/api/analytics/summary');
  }, [api]);

  const fetchCampaignPerformance = useCallback(async (campaignId = null, days = 90) => {
    let url = `/api/analytics/campaign-performance?days=${days}`;
    if (campaignId) {
      url += `&campaign_id=${campaignId}`;
    }
    return api.request(url);
  }, [api]);

  const fetchEvents = useCallback(async (eventType = null, campaignId = null, limit = 100) => {
    let url = `/api/analytics/events?limit=${limit}`;
    if (eventType) {
      url += `&event_type=${eventType}`;
    }
    if (campaignId) {
      url += `&campaign_id=${campaignId}`;
    }
    return api.request(url);
  }, [api]);

  return {
    fetchOverview,
    fetchSummary,
    fetchCampaignPerformance,
    fetchEvents,
    loading: api.loading,
    error: api.error,
  };
}

/**
 * Manage welcome templates for lists
 */
export function useWelcomeTemplates() {
  const api = useApi();

  const getWelcomeTemplate = useCallback((listId) => {
    return api.request(`/api/lists/${listId}/welcome-template`);
  }, [api]);

  const setWelcomeTemplate = useCallback((listId, templateId) => {
    return api.request(`/api/lists/${listId}/welcome-template`, {
      method: 'PUT',
      body: JSON.stringify({ welcome_template_id: templateId }),
    });
  }, [api]);

  return {
    getWelcomeTemplate,
    setWelcomeTemplate,
    loading: api.loading,
    error: api.error,
  };
}

export default useApi;
