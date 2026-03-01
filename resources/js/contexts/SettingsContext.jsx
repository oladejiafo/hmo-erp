/**
 * FILE LOCATION: resources/js/contexts/SettingsContext.jsx
 *
 * Fetches the public system settings (HMO name, currency, locale) on app boot
 * and exposes them to the whole React tree.
 *
 * Also writes to window.__HMO_SETTINGS__ so format.js can read currency
 * without being inside a React component.
 *
 * Usage:
 *   import { useSettings } from '../contexts/SettingsContext';
 *   const { currencySymbol, hmoName } = useSettings();
 */

import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const SettingsContext = createContext({
    hmoName:        'HMO System',
    hmoShortName:   'HMO',
    hmoCode:        '',
    currencyCode:   'NGN',
    currencySymbol: '₦',
    locale:         'en-NG',
    address:        '',
    phone:          '',
    email:          '',
    website:        '',
    loaded:         false,
});

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({
        hmoName:        'HMO System',
        hmoShortName:   'HMO',
        hmoCode:        '',
        currencyCode:   'NGN',
        currencySymbol: '₦',
        locale:         'en-NG',
        address:        '',
        phone:          '',
        email:          '',
        website:        '',
        loaded:         false,
    });

    useEffect(() => {
        axios.get('/api/settings/system/public')
            .then(({ data }) => {
                const s = {
                    hmoName:        data.hmo_name        || 'HMO System',
                    hmoShortName:   data.hmo_short_name  || 'HMO',
                    hmoCode:        data.hmo_code        || '',
                    currencyCode:   data.currency_code   || 'NGN',
                    currencySymbol: data.currency_symbol || '₦',
                    locale:         data.locale          || 'en-NG',
                    address:        data.address         || '',
                    phone:          data.phone           || '',
                    email:          data.email           || '',
                    website:        data.website         || '',
                    loaded:         true,
                };
                setSettings(s);
                // Expose to format.js (which can't use hooks)
                window.__HMO_SETTINGS__ = {
                    currency_code:   s.currencyCode,
                    currency_symbol: s.currencySymbol,
                    locale:          s.locale,
                };
                // Update document title
                if (s.hmoName) {
                    document.title = s.hmoName;
                }
            })
            .catch(() => {
                setSettings(prev => ({ ...prev, loaded: true }));
            });
    }, []);

    return (
        <SettingsContext.Provider value={settings}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

export default SettingsContext;