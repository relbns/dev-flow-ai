/**
 * Utility functions for managing project ID formats
 * 
 * Since the MongoDB backend uses _id whereas some frontend code expects id,
 * these functions help normalize the differences.
 */

/**
 * Normalizes MongoDB document IDs by adding 'id' field if only '_id' exists
 * Works recursively on nested objects and arrays
 * 
 * @param {object|array} data - The data to normalize
 * @returns {object|array} - The normalized data
 */
export const normalizeIdFields = (data) => {
  if (!data) return data;
  
  // If it's an array, map through each item
  if (Array.isArray(data)) {
    return data.map(item => normalizeIdFields(item));
  }
  
  // If it's an object, process it
  if (typeof data === 'object' && data !== null) {
    const result = { ...data };
    
    // If the object has _id but no id, add id
    if (result._id && !result.id) {
      result.id = result._id;
    }
    
    // Process nested objects
    Object.keys(result).forEach(key => {
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = normalizeIdFields(result[key]);
      }
    });
    
    return result;
  }
  
  return data;
};

/**
 * Gets the ID from an object, supporting both MongoDB _id and regular id formats
 * 
 * @param {object} obj - Object containing either _id or id
 * @returns {string|null} - ID value or null if not found
 */
export const getObjectId = (obj) => {
  if (!obj) return null;
  return obj._id || obj.id || null;
};

/**
 * Checks if an object has a valid ID (either _id or id)
 * 
 * @param {object} obj - Object to check
 * @returns {boolean} - True if the object has a valid ID
 */
export const hasValidId = (obj) => {
  return Boolean(obj && (obj._id || obj.id));
};

/**
 * Validates MongoDB ObjectId format (24 hex characters)
 * 
 * @param {string} id - ID string to validate
 * @returns {boolean} - True if ID matches MongoDB ObjectId format
 */
export const isValidObjectId = (id) => {
  if (!id) return false;
  return /^[0-9a-fA-F]{24}$/.test(id);
};
