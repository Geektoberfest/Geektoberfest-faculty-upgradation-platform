import axiosInstance from './axiosInstance';

export const getProfile           = ()           => axiosInstance.get('/faculty/profile');
export const updateProfile        = (data)       => axiosInstance.put('/faculty/profile', data);
export const getAdminFacultyList  = ()           => axiosInstance.get('/faculty/admin/list');
export const updateFacultyStatus  = (id, isActive) => axiosInstance.put(`/faculty/admin/${id}/status`, { isActive });
