export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const validatePhone = (phone) => {
    const re = /^[0-9]{10,11}$/;
    return re.test(String(phone).replace(/\D/g, ''));
};

export const validatePassword = (password) => {
    return {
        isValid: password.length >= 8,
        message: 'Password must be at least 8 characters',
    };
};

export const validateRequired = (value, fieldName) => {
    return {
        isValid: !!value && String(value).trim() !== '',
        message: `${fieldName} is required`,
    };
};

export const validateNIN = (nin) => {
    const re = /^[0-9]{11}$/;
    return re.test(String(nin));
};

export const validateDate = (date) => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
};

export const validateFutureDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    return d > now;
};

export const validatePastDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    return d < now;
};

export const validateAmount = (amount) => {
    const num = Number(amount);
    return {
        isValid: !isNaN(num) && num >= 0,
        message: 'Please enter a valid amount',
    };
};

export const validatePositiveNumber = (num, fieldName) => {
    const n = Number(num);
    return {
        isValid: !isNaN(n) && n > 0,
        message: `${fieldName} must be greater than 0`,
    };
};
