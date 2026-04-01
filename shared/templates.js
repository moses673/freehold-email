/**
 * Email template utilities and constants
 */

export const TEMPLATE_CATEGORIES = [
  'promotional',
  'newsletter',
  'announcement',
  'thank you',
  'welcome',
];

export const TEMPLATE_VARIABLES = {
  promotional: [
    'firstName', 'lastName', 'discount', 'shopLink', 'expiryDate'
  ],
  newsletter: [
    'monthYear', 'articlePreview', 'articleLink', 'highlight1', 'highlight2', 'highlight3'
  ],
  announcement: [
    'productName', 'announcementDetails', 'features', 'learnMoreLink'
  ],
  'thank you': [
    'orderNumber', 'total', 'estimatedDelivery', 'trackingLink'
  ],
  welcome: [
    'firstName', 'getStartedLink', 'helpLink'
  ],
};

/**
 * Get variable names for a category
 */
export function getVariablesForCategory(category) {
  return TEMPLATE_VARIABLES[category] || [];
}

/**
 * Replace variables in template
 */
export function replaceVariables(template, variables = {}) {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });

  return result;
}

export default {
  TEMPLATE_CATEGORIES,
  TEMPLATE_VARIABLES,
  getVariablesForCategory,
  replaceVariables,
};
