import { supabase } from './supabaseAdmin';

const logger = {
  // Added 'log' method to fix "logger.log is not a function"
  log: async (message, severity = 'info', details = null) => {
    console.log(`${severity.toUpperCase()}:`, message);
    try {
      await supabase.from('system_logs').insert([
        {
          activity: message, // Corrected to use 'activity' column
          severity: severity,
          details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
          user_email: 'system'
        }
      ]);
    } catch (e) {
      console.error(`Failed to log ${severity}:`, e);
    }
  },

  // Helper methods now call the main log function
  info: async (message) => {
    await logger.log(message, 'info');
  },

  error: async (message, errorObj) => {
    await logger.log(message, 'error', errorObj?.message || errorObj);
  }
};

// Exporting both ensures compatibility with different import styles
export { logger }; 
export default logger;