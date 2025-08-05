// Shared feature mapping - UI information separated from storage data
export const FEATURE_MAPPING = {
  'urls-formatter': {
    name: 'URLs Formatter Mode',
    description: 'Pretty Prints Requests URLs',
    apiCommand: 'urlBlocksParser'
  },
  'tags-status-coloring': {
    name: 'Tags Status Coloring',
    description: 'Highlight Tags By The Firing State',
    apiCommand: 'tagStatusColoring'
  },
  'tags-type-coloring': {
    name: 'Tags Type Coloring',
    description: 'Highlight Tags By Their Type',
    apiCommand: 'tagTypeColoring'
  },
  'consent-status-monitor': {
    name: 'Consent Mode Server Side',
    description: 'Show current consent mode on Server Side Requests',
    apiCommand: 'consentStatusMonitor'
  },
  'preview-ui-filtering': {
    name: 'Tags/Vars Filters',
    description: 'Find and filter tags and variables',
    apiCommand: 'previewUIFilters'
  },
  'inline-json-formatting': {
    name: 'JSON Formatting',
    description: 'Automatically format JSON in debug table cells with syntax highlighting',
    apiCommand: 'jsonFormatterInline'
  }
};