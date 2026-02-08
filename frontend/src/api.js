// Use VITE_API_URL if set, otherwise fallback to the Render backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://personal-expense-tracker-3-hdz2.onrender.com/api';

export const USER_ID = "primary_user";
export default API_BASE_URL;
